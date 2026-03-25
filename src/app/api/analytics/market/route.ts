import { NextResponse } from 'next/server';
import { fetchDexScreenerData } from '@/features/market-data/server/dexscreener';
import { getHolderDistribution } from '@/features/market-data/server/holder-analysis';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [market, holders] = await Promise.all([
      fetchDexScreenerData(),
      getHolderDistribution(),
    ]);

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
