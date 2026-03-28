import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  getWeeklyOrganicPostCount,
  getWeeklyEngagementPoints,
  ECONOMY_CONSTANTS,
} from '@/features/gamification/points-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('claimable_points, total_points')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const service = createServiceClient();

    const [weeklyOrganicCount, weeklyEngagementPts] = await Promise.all([
      getWeeklyOrganicPostCount(service, user.id),
      getWeeklyEngagementPoints(service, user.id),
    ]);

    const freeOrganicRemaining = Math.max(
      0,
      ECONOMY_CONSTANTS.FREE_ORGANIC_POSTS_PER_WEEK - weeklyOrganicCount
    );

    return NextResponse.json({
      claimable_points: profile.claimable_points ?? 0,
      total_points: profile.total_points ?? 0,
      weekly_organic_posts: weeklyOrganicCount,
      free_organic_remaining: freeOrganicRemaining,
      weekly_engagement_points: weeklyEngagementPts,
      weekly_engagement_cap: ECONOMY_CONSTANTS.WEEKLY_ENGAGEMENT_POINTS_CAP,
      costs: {
        non_organic: ECONOMY_CONSTANTS.NON_ORGANIC_COSTS,
        organic_paid: ECONOMY_CONSTANTS.ORGANIC_COSTS,
      },
    });
  } catch (error) {
    logger.error('User points GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
