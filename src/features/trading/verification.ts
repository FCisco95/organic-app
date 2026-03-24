import type { SupabaseClient } from '@supabase/supabase-js';
import { getTokenBalance } from '@/lib/solana';
import {
  getHoldingTier,
  MIN_HOLDING_BALANCE,
} from './types';

/**
 * Sync a user's wallet balance snapshot and update holding status.
 *
 * Flow:
 * 1. Fetch current on-chain balance via Solana RPC
 * 2. Insert daily snapshot (upsert on user_id + snapshot_date)
 * 3. Calculate consecutive holding days from snapshots
 * 4. Update user_profiles holding fields
 * 5. Return current status
 */
export async function syncWalletBalance(
  supabase: SupabaseClient,
  userId: string,
  walletAddress: string
): Promise<{
  balance: number;
  holdingDays: number;
  multiplier: number;
  reset: boolean;
}> {
  // 1. Fetch on-chain balance
  const balance = await getTokenBalance(walletAddress);
  const today = new Date().toISOString().split('T')[0];

  // 2. Upsert daily snapshot
  await (supabase as any)
    .from('wallet_balance_snapshots')
    .upsert(
      {
        user_id: userId,
        wallet_address: walletAddress,
        token_balance: balance,
        snapshot_date: today,
      },
      { onConflict: 'user_id,snapshot_date' }
    );

  // 3. Check if balance dropped below minimum (selling resets timer)
  if (balance < MIN_HOLDING_BALANCE) {
    await supabase
      .from('user_profiles')
      .update({
        holding_start_date: null,
        holding_days: 0,
        holding_multiplier: 1.0,
        min_balance_held: 0,
      } as never)
      .eq('id', userId);

    return { balance, holdingDays: 0, multiplier: 1.0, reset: true };
  }

  // 4. Calculate consecutive holding days
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('holding_start_date, min_balance_held')
    .eq('id', userId)
    .single();

  let holdingStartDate = (profile as Record<string, unknown> | null)?.holding_start_date as string | null;
  let minBalanceHeld = Number((profile as Record<string, unknown> | null)?.min_balance_held ?? 0);

  if (!holdingStartDate) {
    // First time holding above minimum
    holdingStartDate = today;
    minBalanceHeld = balance;
  } else {
    // Track minimum balance during holding period
    if (balance < minBalanceHeld) {
      minBalanceHeld = balance;
    }
  }

  // Calculate days from start
  const startMs = new Date(holdingStartDate).getTime();
  const todayMs = new Date(today).getTime();
  const holdingDays = Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24));

  // 5. Determine multiplier from tier
  const tier = getHoldingTier(holdingDays);
  const multiplier = tier?.multiplier ?? 1.0;

  // 6. Update profile
  await supabase
    .from('user_profiles')
    .update({
      holding_start_date: holdingStartDate,
      holding_days: holdingDays,
      holding_multiplier: multiplier,
      min_balance_held: minBalanceHeld,
    } as never)
    .eq('id', userId);

  return { balance, holdingDays, multiplier, reset: false };
}
