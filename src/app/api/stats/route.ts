import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ORG_TOKEN_MINT = process.env.NEXT_PUBLIC_ORG_TOKEN_MINT;

let cachedStats: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

async function fetchOrgPrice(): Promise<number | null> {
  if (!ORG_TOKEN_MINT) return null;
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ORG_TOKEN_MINT}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.data?.[ORG_TOKEN_MINT]?.price;
    return typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedStats && now - cachedStats.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedStats.data);
    }

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

    const stats = {
      total_users: usersResult.count ?? 0,
      org_holders: holdersResult.count ?? 0,
      tasks_completed: tasksResult.count ?? 0,
      active_proposals: proposalsResult.count ?? 0,
      org_price: orgPrice,
    };

    const response = { stats };
    cachedStats = { data: response, timestamp: now };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
