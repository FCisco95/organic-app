import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { memberFiltersSchema } from '@/features/members/schemas';
import { logger } from '@/lib/logger';

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
        'id, name, email, avatar_url, organic_id, role, total_points, tasks_completed, profile_visible, created_at, level',
        { count: 'exact' }
      )
      .order('total_points', { ascending: false });

    if (role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
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

    return NextResponse.json({
      data: {
        members,
        total: count ?? 0,
        page,
        limit,
      },
    });
  } catch (err) {
    logger.error('Members API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
