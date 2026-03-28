import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

async function requireAdminOrCouncil(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['admin', 'council'].includes(profile.role ?? '')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user, profile: null };
  }

  return { error: null, user, profile };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authErr } = await requireAdminOrCouncil(supabase);
    if (authErr) return authErr;

    // Fetch latest 10 audit events with actor names
    const { data: events, error } = await supabase
      .from('admin_config_audit_events')
      .select(`
        id,
        change_scope,
        reason,
        created_at,
        actor_id,
        actor_role,
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Audit log fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
    }

    // Fetch actor names
    const actorIds = [...new Set((events ?? []).map((e) => e.actor_id))];
    let actorMap: Record<string, string> = {};

    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', actorIds);

      if (profiles) {
        actorMap = Object.fromEntries(profiles.map((p) => [p.id, p.name ?? 'Unknown']));
      }
    }

    const enrichedEvents = (events ?? []).map((e) => ({
      id: e.id,
      change_scope: e.change_scope,
      reason: e.reason,
      created_at: e.created_at,
      actor_name: actorMap[e.actor_id] ?? 'Unknown',
      actor_role: e.actor_role,
    }));

    return NextResponse.json({ events: enrichedEvents });
  } catch (err) {
    logger.error('Audit log route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
