import { NextResponse } from 'next/server';
import { fetchDexScreenerData } from '@/features/market-data/server/dexscreener';
import { getHolderDistribution } from '@/features/market-data/server/holder-analysis';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  try {
    const [market, holders] = await Promise.all([
      fetchDexScreenerData(),
      getHolderDistribution(),
    ]);

    logger.info('Market analytics GET', {
      durationMs: Date.now() - startedAt,
      pairAddress: market?.pairAddress ?? null,
      dex: market?.dex ?? null,
      marketCap: market?.marketCap ?? null,
      fdv: market?.fdv ?? null,
      liquidity: market?.liquidity ?? null,
      totalHolders: holders?.totalHolders ?? null,
      holdersFetchedAt: holders?.fetchedAt ?? null,
    });

    return NextResponse.json(
      { data: { market, holders } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    logger.error('Market analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
