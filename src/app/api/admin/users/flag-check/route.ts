import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/users/flag-check
 * Scan for suspicious users and set flagged=true. Admin only.
 *
 * Thresholds:
 * - >50 comments in the last 24h
 * - Average comment body length <10 chars over last 7 days (min 10 comments)
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const service = createServiceClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find users with >50 comments in last 24h
    const { data: recentComments } = await service
      .from('comments')
      .select('user_id')
      .gte('created_at', oneDayAgo);

    const dailyCounts: Record<string, number> = {};
    for (const c of recentComments ?? []) {
      dailyCounts[c.user_id] = (dailyCounts[c.user_id] ?? 0) + 1;
    }

    const highVolumeUsers = Object.entries(dailyCounts)
      .filter(([, count]) => count > 50)
      .map(([userId]) => userId);

    // Find users with avg comment length <10 chars over last 7 days (min 10 comments)
    const { data: weeklyComments } = await service
      .from('comments')
      .select('user_id, body')
      .gte('created_at', sevenDaysAgo);

    const userCommentLengths: Record<string, number[]> = {};
    for (const c of weeklyComments ?? []) {
      if (!userCommentLengths[c.user_id]) {
        userCommentLengths[c.user_id] = [];
      }
      userCommentLengths[c.user_id].push((c.body ?? '').length);
    }

    const shortCommentUsers = Object.entries(userCommentLengths)
      .filter(([, lengths]) => {
        if (lengths.length < 10) return false;
        const avg = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
        return avg < 10;
      })
      .map(([userId]) => userId);

    // Combine unique user IDs to flag
    const toFlag = [...new Set([...highVolumeUsers, ...shortCommentUsers])];

    if (toFlag.length === 0) {
      return NextResponse.json({ flagged: 0, message: 'No suspicious users found' });
    }

    // Set flagged=true for these users (don't unflag others — admin can manually clear)
    const { error: updateError } = await service
      .from('user_profiles')
      .update({ flagged: true })
      .in('id', toFlag);

    if (updateError) {
      logger.error('Flag check update error', updateError);
      return NextResponse.json({ error: 'Failed to update flags' }, { status: 500 });
    }

    // Log to audit trail
    const { data: org } = await supabase.from('orgs').select('id').limit(1).maybeSingle();
    if (org) {
      await service.from('admin_config_audit_events').insert({
        org_id: org.id,
        actor_id: user.id,
        actor_role: 'admin',
        reason: 'Automated flag check',
        change_scope: 'user_flag',
        previous_payload: {},
        new_payload: { flagged_users: toFlag, high_volume: highVolumeUsers, short_comments: shortCommentUsers },
        metadata: { thresholds: { daily_comments: 50, avg_length: 10, min_comments: 10 } },
      });
    }

    return NextResponse.json({
      flagged: toFlag.length,
      high_volume: highVolumeUsers.length,
      short_comments: shortCommentUsers.length,
    });
  } catch (error) {
    logger.error('Flag check route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
