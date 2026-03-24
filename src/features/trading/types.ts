// ─── Holding Rewards Types ──────────────────────────────────────────────

export interface WalletBalanceSnapshot {
  id: string;
  user_id: string;
  wallet_address: string;
  token_balance: number;
  snapshot_date: string;
  created_at: string;
}

export interface HoldingStatus {
  holding_start_date: string | null;
  holding_days: number;
  holding_multiplier: number;
  min_balance_held: number;
  current_balance: number;
  current_tier: HoldingTier | null;
  next_tier: HoldingTier | null;
  days_to_next_tier: number | null;
}

export interface HoldingTier {
  name: string;
  label: string;
  min_days: number;
  multiplier: number;
  achievement: string;
}

export const HOLDING_TIERS: HoldingTier[] = [
  { name: 'diamond_hands_bronze', label: 'Diamond Hands (Bronze)', min_days: 30, multiplier: 1.1, achievement: 'Diamond Hands I' },
  { name: 'diamond_hands_silver', label: 'Diamond Hands (Silver)', min_days: 60, multiplier: 1.15, achievement: 'Diamond Hands II' },
  { name: 'diamond_hands_gold', label: 'Diamond Hands (Gold)', min_days: 90, multiplier: 1.2, achievement: 'Diamond Hands III' },
];

/** Minimum token balance to qualify for holding rewards. Prevents dust-holding. */
export const MIN_HOLDING_BALANCE = 100;

export function getHoldingTier(days: number): HoldingTier | null {
  for (let i = HOLDING_TIERS.length - 1; i >= 0; i--) {
    if (days >= HOLDING_TIERS[i].min_days) {
      return HOLDING_TIERS[i];
    }
  }
  return null;
}

export function getNextHoldingTier(days: number): { tier: HoldingTier; daysRemaining: number } | null {
  for (const tier of HOLDING_TIERS) {
    if (days < tier.min_days) {
      return { tier, daysRemaining: tier.min_days - days };
    }
  }
  return null;
}

// ─── API Responses ──────────────────────────────────────────────────────

export interface HoldingSyncResponse {
  synced: boolean;
  balance: number;
  holding_days: number;
  multiplier: number;
  tier: HoldingTier | null;
}

export interface HoldingStatsResponse {
  status: HoldingStatus;
  snapshots: WalletBalanceSnapshot[];
}
