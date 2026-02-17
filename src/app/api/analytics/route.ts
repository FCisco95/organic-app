import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import { calculateMarketCap } from '@/config/token';
import { logger } from '@/lib/logger';
import {
  buildMarketDataHeaders,
  getMarketPriceSnapshot,
} from '@/features/market-data/server/service';

export const dynamic = 'force-dynamic';

const RESPONSE_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=300';

// Cache analytics data for 120s — survives cold starts unlike in-memory cache
const getCachedAnalytics = unstable_cache(
  async () => {
    const supabase = createAnonClient();

    const [
      usersResult,
      holdersResult,
      tasksResult,
      proposalsResult,
      orgPriceSnapshot,
      activityTrends,
      memberGrowth,
      taskCompletions,
      proposalsByCategory,
      votingParticipation,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .not('wallet_pubkey', 'is', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['voting', 'submitted', 'approved']),
      getMarketPriceSnapshot('org_price'),
      supabase.rpc('get_activity_trends', { days: 30 }),
      supabase.rpc('get_member_growth', { months: 12 }),
      supabase.rpc('get_task_completions', { weeks: 12 }),
      supabase.rpc('get_proposals_by_category'),
      supabase.rpc('get_voting_participation', { result_limit: 10 }),
    ]);

    return {
      data: {
        kpis: {
          total_users: usersResult.count ?? 0,
          org_holders: holdersResult.count ?? 0,
          tasks_completed: tasksResult.count ?? 0,
          active_proposals: proposalsResult.count ?? 0,
          org_price: orgPriceSnapshot.value,
          market_cap: calculateMarketCap(orgPriceSnapshot.value),
        },
        activity_trends: activityTrends.data ?? [],
        member_growth: memberGrowth.data ?? [],
        task_completions: taskCompletions.data ?? [],
        proposals_by_category: proposalsByCategory.data ?? [],
        voting_participation: votingParticipation.data ?? [],
      },
      marketSnapshot: orgPriceSnapshot,
    };
  },
  ['analytics-data'],
  { revalidate: 120 }
);

export async function GET() {
  try {
    const response = await getCachedAnalytics();

    return NextResponse.json(
      { data: response.data },
      {
        headers: {
          'Cache-Control': RESPONSE_CACHE_CONTROL,
          ...buildMarketDataHeaders([response.marketSnapshot]),
        },
      }
    );
  } catch (error) {
    logger.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
