import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { distributionFilterSchema } from '@/features/rewards/schemas';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse filters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = distributionFilterSchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
    }

    const { type, sprint_id, user_id, page, limit } = parsed.data;

    // Check if admin/council
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

    let query = supabase
      .from('reward_distributions')
      .select('*', { count: 'exact' });

    // Users see only own, admin sees all (or filtered by user_id)
    if (!isAdminOrCouncil) {
      query = query.eq('user_id', user.id);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (type) {
      query = query.eq('type', type);
    }
    if (sprint_id) {
      query = query.eq('sprint_id', sprint_id);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: distributions, count, error } = await query;

    if (error) {
      logger.error('Distributions query error:', error);
      return NextResponse.json({ error: 'Failed to fetch distributions' }, { status: 500 });
    }

    const userIds = Array.from(new Set((distributions ?? []).map((d) => d.user_id)));
    const sprintIds = Array.from(
      new Set(
        (distributions ?? [])
          .map((d) => d.sprint_id)
          .filter((sprintId): sprintId is string => Boolean(sprintId))
      )
    );

    let userMap = new Map<string, { name: string | null }>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', userIds);

      userMap = new Map((users ?? []).map((userProfile) => [userProfile.id, { name: userProfile.name }]));
    }

    let sprintMap = new Map<string, { name: string | null }>();
    if (sprintIds.length > 0) {
      const { data: sprints } = await supabase
        .from('sprints')
        .select('id, name')
        .in('id', sprintIds);

      sprintMap = new Map((sprints ?? []).map((sprint) => [sprint.id, { name: sprint.name }]));
    }

    const mapped = (distributions ?? []).map((d) => {
      const userInfo = userMap.get(d.user_id);
      const sprintInfo = d.sprint_id ? sprintMap.get(d.sprint_id) : undefined;
      return {
        ...d,
        user_name: userInfo?.name ?? null,
        sprint_name: sprintInfo?.name ?? null,
      };
    });

    return NextResponse.json({ distributions: mapped, total: count ?? 0 });
  } catch (err) {
    logger.error('Distributions GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
