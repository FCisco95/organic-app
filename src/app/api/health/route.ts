import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: {
            supabase: 'missing_env',
          },
        },
        { status: 503 }
      );
    }

    const supabase = createServiceClient();
    const [{ error: nonceError }, { error: snapshotError }] = await Promise.all([
      supabase.from('wallet_nonces').select('id', { head: true }).limit(1),
      supabase.from('market_snapshots').select('key', { head: true }).limit(1),
    ]);

    if (nonceError || snapshotError) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: {
            supabase: nonceError ? 'error' : 'ok',
            market_cache: snapshotError ? 'error' : 'ok',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp,
      checks: {
        supabase: 'ok',
        market_cache: 'ok',
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp,
        checks: {
          supabase: 'exception',
        },
      },
      { status: 503 }
    );
  }
}
