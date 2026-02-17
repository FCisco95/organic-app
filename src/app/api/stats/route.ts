import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  buildMarketDataHeaders,
  getMarketPriceSnapshot,
} from '@/features/market-data/server/service';

export const dynamic = 'force-dynamic';

const RESPONSE_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=300';

// Cache stats for 120s — survives cold starts unlike in-memory cache
const getCachedStats = unstable_cache(
  async () => {
    const supabase = createAnonClient();

    const [usersResult, holdersResult, tasksResult, proposalsResult, orgPriceSnapshot] = await Promise.all([
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
    ]);

    return {
      stats: {
        total_users: usersResult.count ?? 0,
        org_holders: holdersResult.count ?? 0,
        tasks_completed: tasksResult.count ?? 0,
        active_proposals: proposalsResult.count ?? 0,
        org_price: orgPriceSnapshot.value,
      },
      marketSnapshot: orgPriceSnapshot,
    };
  },
  ['stats-data'],
  { revalidate: 120 }
);

export async function GET() {
  try {
    const response = await getCachedStats();

    return NextResponse.json(
      { stats: response.stats },
      {
        headers: {
          'Cache-Control': RESPONSE_CACHE_CONTROL,
          ...buildMarketDataHeaders([response.marketSnapshot]),
        },
      }
    );
  } catch (error) {
    logger.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
