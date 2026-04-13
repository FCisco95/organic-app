import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { memberFiltersSchema } from '@/features/members/schemas';
import { logger } from '@/lib/logger';
import { escapePostgrestValue } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = memberFiltersSchema.safeParse({
      search: searchParams.get('search') ?? '',
      role: searchParams.get('role') ?? 'all',
      page: searchParams.get('page') ?? '1',
      limit: searchParams.get('limit') ?? '20',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { search, role, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from('user_profiles')
      .select(
        'id, name, avatar_url, organic_id, role, total_points, tasks_completed, profile_visible, created_at, level',
        { count: 'exact' }
      )
      .eq('profile_visible', true)
      .order('total_points', { ascending: false });

    if (role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      const safeSearch = escapePostgrestValue(search);
      query = query.or(`name.ilike.%${safeSearch}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      logger.error('Members query error:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    const members = (data ?? []).map((m) => ({
      ...m,
      level: m.level ?? 1,
    }));

    // Fetch global role counts (independent of current page/filters)
    const roleCountQuery = await supabase
      .from('user_profiles')
      .select('role')
      .eq('profile_visible', true)
      .not('role', 'is', null);

    const allProfiles = roleCountQuery.data ?? [];
    const role_counts: Record<string, number> = {
      all: allProfiles.length,
      admin: 0,
      council: 0,
      member: 0,
      guest: 0,
    };
    for (const p of allProfiles) {
      if (p.role && p.role in role_counts) {
        role_counts[p.role]++;
      }
    }

    return NextResponse.json({
      data: {
        members,
        total: count ?? 0,
        page,
        limit,
        role_counts,
      },
    });
  } catch (err) {
    logger.error('Members API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
