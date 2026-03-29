import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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

    // Use anon client — market_snapshots has RLS disabled so anon can read it.
    // wallet_nonces requires service_role (RLS blocks anon), so we only ping
    // market_snapshots for a lightweight DB connectivity check.
    const supabase = createAnonClient();
    const { error: snapshotError } = await supabase
      .from('market_snapshots')
      .select('key', { head: true })
      .limit(1);

    if (snapshotError) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: {
            supabase: 'error',
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
