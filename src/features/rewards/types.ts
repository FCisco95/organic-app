// ─── Reward Claim Status ────────────────────────────────────────────

export type RewardClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export const CLAIM_STATUS_COLORS: Record<RewardClaimStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
};

export const CLAIM_STATUS_LABELS: Record<RewardClaimStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

// ─── Distribution Types ─────────────────────────────────────────────

export type DistributionType = 'epoch' | 'manual' | 'claim';

export const DISTRIBUTION_TYPE_LABELS: Record<DistributionType, string> = {
  epoch: 'Epoch Reward',
  manual: 'Manual',
  claim: 'Claim Payout',
};

export type DistributionCategory =
  | 'epoch_reward'
  | 'bonus'
  | 'bounty'
  | 'correction'
  | 'claim_payout';

export const DISTRIBUTION_CATEGORY_LABELS: Record<DistributionCategory, string> = {
  epoch_reward: 'Epoch Reward',
  bonus: 'Bonus',
  bounty: 'Bounty',
  correction: 'Correction',
  claim_payout: 'Claim Payout',
};

// ─── Config ─────────────────────────────────────────────────────────

export interface RewardsConfig {
  enabled: boolean;
  points_to_token_rate: number;
  min_claim_threshold: number;
  default_epoch_pool: number;
  claim_requires_wallet: boolean;
}

export const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  enabled: false,
  points_to_token_rate: 100,
  min_claim_threshold: 500,
  default_epoch_pool: 0,
  claim_requires_wallet: true,
};

// ─── Records ────────────────────────────────────────────────────────

export interface RewardClaim {
  id: string;
  user_id: string;
  points_amount: number;
  token_amount: number;
  conversion_rate: number;
  status: RewardClaimStatus;
  wallet_address: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  paid_tx_signature: string | null;
  created_at: string;
  // Joined fields (optional)
  user_name?: string | null;
  user_email?: string | null;
}

export interface RewardDistribution {
  id: string;
  user_id: string;
  type: DistributionType;
  sprint_id: string | null;
  claim_id: string | null;
  points_earned: number | null;
  token_amount: number;
  category: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields (optional)
  user_name?: string | null;
  sprint_name?: string | null;
}

// ─── Composite Types ────────────────────────────────────────────────

export interface UserRewardsInfo {
  claimable_points: number;
  total_points: number;
  pending_claims: number;
  total_claimed: number;
  total_distributed: number;
  conversion_rate: number;
  min_threshold: number;
  wallet_address: string | null;
  rewards_enabled: boolean;
  claim_requires_wallet: boolean;
}

export interface RewardsSummary {
  total_distributed: number;
  pending_claims_count: number;
  pending_claims_tokens: number;
  approved_claims_count: number;
  approved_claims_tokens: number;
  distributions_by_type: Record<string, number>;
  distributions_by_month: { month: string; total: number }[];
}
