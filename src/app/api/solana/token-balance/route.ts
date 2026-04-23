import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance } from '@/lib/solana';
import { walletQuerySchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';
import { staleCache, STALE_CAP_MS } from './stale-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = walletQuerySchema.safeParse({
    wallet: request.nextUrl.searchParams.get('wallet') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid wallet parameter' },
      { status: 400 }
    );
  }

  const { wallet } = parsed.data;

  try {
    const balance = await getTokenBalance(wallet);
    staleCache.set(wallet, { balance, ts: Date.now() });
    return NextResponse.json(
      { data: { balance, stale: false }, error: null },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    const cached = staleCache.get(wallet);
    if (cached && Date.now() - cached.ts < STALE_CAP_MS) {
      logger.warn('token-balance proxy: pool exhausted, serving stale', {
        wallet,
      });
      return NextResponse.json(
        { data: { balance: cached.balance, stale: true }, error: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    logger.error(
      'token-balance proxy: pool exhausted with no cache',
      { wallet },
      error
    );
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
