import { NextResponse } from 'next/server';
import {
  MARKET_PRICE_KEYS,
  refreshMarketPriceSnapshots,
} from '@/features/market-data/server/service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, reason: 'missing_secret' };
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return { ok: false, reason: 'invalid_token' };
  }

  return { ok: true };
}

async function handleRefresh(request: Request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    const status = auth.reason === 'missing_secret' ? 503 : 401;
    return NextResponse.json(
      {
        error: auth.reason === 'missing_secret' ? 'CRON_SECRET is not configured' : 'Unauthorized',
      },
      { status }
    );
  }

  try {
    const snapshots = await refreshMarketPriceSnapshots(MARKET_PRICE_KEYS);

    return NextResponse.json({
      ok: true,
      refreshed_at: new Date().toISOString(),
      snapshots: snapshots.map((snapshot) => ({
        key: snapshot.key,
        value: snapshot.value,
        source: snapshot.source,
        provider: snapshot.provider,
        age_seconds: snapshot.ageSeconds,
      })),
    });
  } catch (error) {
    logger.error('Market cache refresh failed', error);
    return NextResponse.json({ error: 'Failed to refresh market snapshots' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleRefresh(request);
}

export async function GET(request: Request) {
  return handleRefresh(request);
}
