import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ORG_TOKEN_MINT = process.env.NEXT_PUBLIC_ORG_TOKEN_MINT;
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=300';

async function fetchOrgPrice(): Promise<number | null> {
  if (!ORG_TOKEN_MINT) return null;
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ORG_TOKEN_MINT}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.data?.[ORG_TOKEN_MINT]?.price;
    return typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
  } catch (error) {
    console.error('Stats helper error:', error);
    return null;
  }
}

// Cache stats for 120s — survives cold starts unlike in-memory cache
const getCachedStats = unstable_cache(
  async () => {
    const supabase = await createClient();

    const [usersResult, holdersResult, tasksResult, proposalsResult, orgPrice] = await Promise.all([
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
    ]);

    return {
      stats: {
        total_users: usersResult.count ?? 0,
        org_holders: holdersResult.count ?? 0,
        tasks_completed: tasksResult.count ?? 0,
        active_proposals: proposalsResult.count ?? 0,
        org_price: orgPrice,
      },
    };
  },
  ['stats-data'],
  { revalidate: 120 }
);

export async function GET() {
  try {
    const response = await getCachedStats();

    return NextResponse.json(response, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
