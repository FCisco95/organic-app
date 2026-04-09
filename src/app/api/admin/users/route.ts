import { NextRequest, NextResponse } from 'next/server';
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

/**
 * GET /api/admin/users
 * Search and list users with activity stats for moderation.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error: authErr, user: _u } = await requireAdminOrCouncil(supabase);
    if (authErr) return authErr;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status') ?? '';
    const flaggedOnly = searchParams.get('flagged') === 'true';
    const sortBy = searchParams.get('sort') ?? 'created_at';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    let query = supabase
      .from('user_profiles')
      .select(
        'id, name, email, organic_id, avatar_url, role, xp_total, level, total_points, restriction_status, restriction_reason, restricted_at, flagged, created_at, last_active_date',
        { count: 'exact' }
      )
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,organic_id.eq.${Number(search) || 0}`
      );
    }

    if (status && ['active', 'warned', 'restricted', 'banned'].includes(status)) {
      query = query.eq('restriction_status', status);
    }

    if (flaggedOnly) {
      query = query.eq('flagged', true);
    }

    const validSorts = ['created_at', 'xp_total', 'total_points', 'last_active_date', 'name'];
    const sortCol = validSorts.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortCol, { ascending: order });

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Admin users list error', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch comment counts for returned users
    const userIds = (users ?? []).map((u) => u.id);
    let commentCounts: Record<string, number> = {};

    if (userIds.length > 0) {
      // Count from comments table (polymorphic)
      const { data: counts } = await supabase
        .from('comments')
        .select('user_id')
        .in('user_id', userIds);

      if (counts) {
        for (const c of counts) {
          commentCounts[c.user_id] = (commentCounts[c.user_id] ?? 0) + 1;
        }
      }
    }

    const enrichedUsers = (users ?? []).map((u) => ({
      ...u,
      comment_count: commentCounts[u.id] ?? 0,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Admin users route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
