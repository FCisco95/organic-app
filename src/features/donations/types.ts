// ─── Donation Types ─────────────────────────────────────────────────────

export type DonationToken = 'SOL' | 'ORG';
export type DonationStatus = 'pending' | 'verified' | 'failed';

export interface Donation {
  id: string;
  tx_signature: string;
  donor_id: string;
  token: DonationToken;
  amount: number;
  amount_usd: number | null;
  from_wallet: string;
  to_wallet: string;
  status: DonationStatus;
  verified_at: string | null;
  failed_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DonationWithDonor extends Donation {
  donor: DonorProfile;
}

export interface DonorProfile {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
}

// ─── Badge Tiers ────────────────────────────────────────────────────────

export interface DonorBadgeTier {
  name: string;
  label: string;
  min_usd: number;
  max_usd: number | null;
  color: string;
  icon: string;
}

export const DONOR_BADGE_TIERS: DonorBadgeTier[] = [
  { name: 'seed_planter', label: 'Seed Planter', min_usd: 1, max_usd: 49, color: '#8B7355', icon: '🌱' },
  { name: 'grove_grower', label: 'Grove Grower', min_usd: 50, max_usd: 249, color: '#4CAF50', icon: '🌿' },
  { name: 'forest_guardian', label: 'Forest Guardian', min_usd: 250, max_usd: 999, color: '#2E7D32', icon: '🌲' },
  { name: 'canopy_keeper', label: 'Canopy Keeper', min_usd: 1000, max_usd: null, color: '#FFD700', icon: '🏛️' },
];

export function getDonorBadgeTier(cumulativeUsd: number): DonorBadgeTier | null {
  for (let i = DONOR_BADGE_TIERS.length - 1; i >= 0; i--) {
    if (cumulativeUsd >= DONOR_BADGE_TIERS[i].min_usd) {
      return DONOR_BADGE_TIERS[i];
    }
  }
  return null;
}

// ─── API Responses ──────────────────────────────────────────────────────

export interface DonationHistoryResponse {
  donations: Donation[];
  total_donated_usd: number;
  badge_tier: DonorBadgeTier | null;
}

export interface DonationLeaderboardEntry {
  donor_id: string;
  donor: DonorProfile;
  total_donated_usd: number;
  donation_count: number;
  badge_tier: DonorBadgeTier | null;
}

export interface DonationLeaderboardResponse {
  entries: DonationLeaderboardEntry[];
}

export interface DonationStatsResponse {
  total_donations: number;
  total_donors: number;
  total_usd: number;
  total_sol: number;
  total_org: number;
  recent_donations: DonationWithDonor[];
}

export interface DonationReceiptResponse {
  donation: DonationWithDonor;
  explorer_url: string;
}
