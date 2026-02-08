import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3';

type ReminderWindow = {
  hours: number;
  toleranceMinutes: number;
  eventType: 'voting_reminder_24h' | 'voting_reminder_1h';
};

const WINDOWS: ReminderWindow[] = [
  { hours: 24, toleranceMinutes: 30, eventType: 'voting_reminder_24h' },
  { hours: 1, toleranceMinutes: 10, eventType: 'voting_reminder_1h' },
];

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  const results = [] as Array<{ window: number; proposals: number; notifications: number }>;

  for (const window of WINDOWS) {
    const windowStart = new Date(
      now.getTime() + window.hours * 60 * 60 * 1000 - window.toleranceMinutes * 60 * 1000
    );
    const windowEnd = new Date(
      now.getTime() + window.hours * 60 * 60 * 1000 + window.toleranceMinutes * 60 * 1000
    );

    const { data: proposals, error: proposalError } = await supabase
      .from('proposals')
      .select('id, title, voting_ends_at')
      .eq('status', 'voting')
      .gte('voting_ends_at', windowStart.toISOString())
      .lte('voting_ends_at', windowEnd.toISOString());

    if (proposalError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch proposals', details: proposalError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let notificationsInserted = 0;

    for (const proposal of proposals ?? []) {
      const { data: followers, error: followError } = await supabase
        .from('user_follows')
        .select('user_id')
        .eq('subject_type', 'proposal')
        .eq('subject_id', proposal.id);

      if (followError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch followers', details: followError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const followerIds = (followers ?? []).map((f) => f.user_id);
      if (followerIds.length === 0) continue;

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, in_app')
        .eq('category', 'voting')
        .in('user_id', followerIds);

      const prefMap = new Map((prefs ?? []).map((p) => [p.user_id, p.in_app]));

      const rows = followerIds
        .filter((userId) => prefMap.get(userId) !== false)
        .map((userId) => ({
          user_id: userId,
          event_type: window.eventType,
          category: 'voting',
          actor_id: null,
          subject_type: 'proposal',
          subject_id: proposal.id,
          metadata: {
            title: proposal.title,
            ends_at: proposal.voting_ends_at,
            hours_left: window.hours,
          },
          dedupe_key: `vote_reminder:${proposal.id}:${window.hours}`,
        }));

      if (rows.length === 0) continue;

      const { error: insertError } = await supabase
        .from('notifications')
        .upsert(rows, { onConflict: 'user_id,dedupe_key' });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to insert reminders', details: insertError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      notificationsInserted += rows.length;
    }

    results.push({
      window: window.hours,
      proposals: proposals?.length ?? 0,
      notifications: notificationsInserted,
    });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
