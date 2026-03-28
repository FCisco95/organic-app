import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { holdingStatsQuerySchema } from '@/features/trading/schemas';
import { getHoldingTier, getNextHoldingTier, MIN_HOLDING_BALANCE } from '@/features/trading/types';
import { getTokenBalance } from '@/lib/solana';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = holdingStatsQuerySchema.safeParse({
      days: searchParams.get('days') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { days } = queryResult.data;

    const { data: profile } = await (supabase as any)
      .from('user_profiles')
      .select('wallet_pubkey, holding_start_date, holding_days, holding_multiplier, min_balance_held')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const p = profile as Record<string, unknown>;
    const walletPubkey = p.wallet_pubkey as string | null;
    const holdingDays = Number(p.holding_days ?? 0);
    const holdingMultiplier = Number(p.holding_multiplier ?? 1.0);
    const minBalanceHeld = Number(p.min_balance_held ?? 0);

    // Get current on-chain balance if wallet is linked
    let currentBalance = 0;
    if (walletPubkey) {
      currentBalance = await getTokenBalance(walletPubkey);
    }

    const currentTier = getHoldingTier(holdingDays);
    const nextTierInfo = getNextHoldingTier(holdingDays);

    // Get recent snapshots
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data: snapshots } = await (supabase as any)
      .from('wallet_balance_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .gte('snapshot_date', sinceDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false });

    return NextResponse.json({
      status: {
        holding_start_date: p.holding_start_date as string | null,
        holding_days: holdingDays,
        holding_multiplier: holdingMultiplier,
        min_balance_held: minBalanceHeld,
        current_balance: currentBalance,
        current_tier: currentTier,
        next_tier: nextTierInfo?.tier ?? null,
        days_to_next_tier: nextTierInfo?.daysRemaining ?? null,
        min_balance_required: MIN_HOLDING_BALANCE,
      },
      snapshots: snapshots ?? [],
    });
  } catch (error) {
    logger.error('Trading stats route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
