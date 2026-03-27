// ─── Marketplace Types ───────────────────────────────────────────────────────

export type BoostRequestStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
export type EngagementProofType = 'like' | 'retweet' | 'comment';
export type EngagementProofStatus = 'pending' | 'verified' | 'rejected';
export type EscrowStatus = 'held' | 'released' | 'refunded';

export interface BoostRequest {
  id: string;
  user_id: string;
  tweet_url: string;
  points_offered: number;
  max_engagements: number;
  current_engagements: number;
  status: BoostRequestStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_name?: string;
  author_avatar?: string;
}

export interface EngagementProof {
  id: string;
  boost_id: string;
  engager_id: string;
  proof_type: EngagementProofType;
  proof_url: string | null;
  status: EngagementProofStatus;
  verified_at: string | null;
  created_at: string;
}

export interface EscrowEntry {
  id: string;
  boost_id: string;
  user_id: string;
  amount: number;
  status: EscrowStatus;
  created_at: string;
  released_at: string | null;
}

export interface CreateBoostInput {
  tweet_url: string;
  points_offered: number;
  max_engagements: number;
}

export interface SubmitProofInput {
  proof_type: EngagementProofType;
  proof_url?: string;
}
