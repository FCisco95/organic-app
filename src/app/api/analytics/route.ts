import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TOKEN_CONFIG, calculateMarketCap } from '@/config/token';

let cached: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

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
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
      });
    }

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

    const data = {
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
    };

    const response = { data };
    cached = { data: response, timestamp: now };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
