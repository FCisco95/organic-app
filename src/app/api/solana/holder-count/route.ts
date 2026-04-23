import { NextRequest, NextResponse } from 'next/server';
import { getAllTokenHolders } from '@/lib/solana';
import { MAX_TOP_N, topNSchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';
import {
  getHolderCountCache,
  setHolderCountCache,
  STALE_CAP_MS,
} from './holder-cache';

// ddos-exempt: public user-facing proxy. Safe because the route is
// rate-limited via the `solana-proxy` middleware bucket (100 req/min
// per IP), CDN-cached (s-maxage=300, SWR=900), and falls back to a
// module-scoped stale cache on pool exhaustion. The paid RPC is never
// reached directly from the browser.
export const dynamic = 'force-dynamic';

// Cache holds exactly the schema's max so every valid ?top=N can be
// served from the warm slice without re-running getAllTokenHolders.
const CACHE_TOP_SIZE = MAX_TOP_N;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawTop = request.nextUrl.searchParams.get('top');
  let topN: number | undefined;
  if (rawTop !== null) {
    const parsed = topNSchema.safeParse(rawTop);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid top parameter' },
        { status: 400 }
      );
    }
    topN = parsed.data;
  }

  try {
    const holders = await getAllTokenHolders();
    const sorted = [...holders].sort((a, b) => b.balance - a.balance);
    const count = holders.length;
    setHolderCountCache({
      count,
      top: sorted.slice(0, CACHE_TOP_SIZE),
      ts: Date.now(),
    });
    const top = topN !== undefined ? sorted.slice(0, topN) : undefined;
    return NextResponse.json(
      { data: { count, top, stale: false }, error: null },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (error) {
    const cached = getHolderCountCache();
    if (cached && Date.now() - cached.ts < STALE_CAP_MS) {
      const top =
        topN !== undefined ? cached.top.slice(0, topN) : undefined;
      logger.warn(
        'holder-count proxy: pool exhausted, serving stale',
        { ageMs: Date.now() - cached.ts }
      );
      return NextResponse.json(
        {
          data: { count: cached.count, top, stale: true },
          error: null,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    logger.error(
      'holder-count proxy: exhausted + cold cache',
      {},
      error
    );
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
