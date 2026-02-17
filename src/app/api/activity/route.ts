import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const before = searchParams.get('before');

    const supabase = await createClient();

    let query = supabase
      .from('activity_log')
      .select(
        `
        id, event_type, actor_id, subject_type, subject_id, metadata, created_at,
        actor:user_profiles!activity_log_actor_id_fkey(id, name, organic_id, avatar_url)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    const has_more = (data?.length ?? 0) > limit;
    const events = (data ?? []).slice(0, limit);

    return NextResponse.json({ events, has_more });
  } catch (error) {
    logger.error('Activity GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
