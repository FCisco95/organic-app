import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DAILY_EGG_LIMIT } from '@/features/egg-opening/config';

function getUtcDayStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch last 20 egg opens
    const { data, error } = await supabase
      .from('egg_opens' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Egg open history error:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Count today's opens for the stats
    const dayStart = getUtcDayStart();
    const { count: todayCount } = await supabase
      .from('egg_opens' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('opened_at', dayStart);

    return NextResponse.json({
      data: data ?? [],
      today_count: todayCount ?? 0,
      daily_limit: DAILY_EGG_LIMIT,
    });
  } catch (error) {
    logger.error('Egg open history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
