import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { TOKEN_CONFIG, calculateMarketCap } from '@/config/token';

const RESPONSE_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=300';

async function fetchOrgPrice(): Promise<number | null> {
  if (!TOKEN_CONFIG.mint) return null;
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${TOKEN_CONFIG.mint}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.data?.[TOKEN_CONFIG.mint]?.price;
    return typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
  } catch (error) {
    console.error('Analytics helper error:', error);
    return null;
  }
}

// Cache analytics data for 120s — survives cold starts unlike in-memory cache
const getCachedAnalytics = unstable_cache(
  async () => {
    const supabase = await createClient();

    const [
      usersResult,
      holdersResult,
      tasksResult,
      proposalsResult,
      orgPrice,
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
      fetchOrgPrice(),
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
          org_price: orgPrice,
          market_cap: calculateMarketCap(orgPrice),
        },
        activity_trends: activityTrends.data ?? [],
        member_growth: memberGrowth.data ?? [],
        task_completions: taskCompletions.data ?? [],
        proposals_by_category: proposalsByCategory.data ?? [],
        voting_participation: votingParticipation.data ?? [],
      },
    };
  },
  ['analytics-data'],
  { revalidate: 120 }
);

export async function GET() {
  try {
    const response = await getCachedAnalytics();

    return NextResponse.json(response, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
