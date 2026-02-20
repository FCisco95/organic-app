import { Database, VoteValue, ProposalResult } from '@/types/database';

// Base database types
export type Vote = Database['public']['Tables']['votes']['Row'];
export type VoteInsert = Database['public']['Tables']['votes']['Insert'];
export type VoteUpdate = Database['public']['Tables']['votes']['Update'];
export type VotingConfig = Database['public']['Tables']['voting_config']['Row'];
export type HolderSnapshot = Database['public']['Tables']['holder_snapshots']['Row'];

// Re-export enums for convenience
export type { VoteValue, ProposalResult };

// Vote tally result
export interface VoteTally {
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  total_votes: number;
  yes_count: number;
  no_count: number;
  abstain_count: number;
  total_count: number;
}

// Voting info for a proposal
export interface ProposalVotingInfo {
  server_voting_started_at: string | null;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  snapshot_taken_at: string | null;
  total_circulating_supply: number | null;
  quorum_required: number | null;
  approval_threshold: number | null;
  result: ProposalResult | null;
  finalization_dedupe_key: string | null;
  finalization_attempts: number;
  finalization_last_attempt_at: string | null;
  finalization_failure_reason: string | null;
  finalization_frozen_at: string | null;
}

// User's vote with weight
export interface UserVote {
  id: string;
  value: VoteValue;
  weight: number;
  created_at: string;
}

// Vote result with full details
export interface VoteResults {
  tally: VoteTally;
  quorum_met: boolean;
  quorum_percentage: number;
  yes_percentage: number;
  no_percentage: number;
  abstain_percentage: number;
  participation_percentage: number;
  result: ProposalResult | null;
  is_voting_open: boolean;
  time_remaining_ms: number | null;
}

// Proposal with voting info
export interface ProposalWithVoting {
  id: string;
  title: string;
  body: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  server_voting_started_at: string | null;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  snapshot_taken_at: string | null;
  total_circulating_supply: number | null;
  quorum_required: number | null;
  approval_threshold: number | null;
  result: ProposalResult | null;
  finalization_dedupe_key: string | null;
  finalization_attempts: number;
  finalization_last_attempt_at: string | null;
  finalization_failure_reason: string | null;
  finalization_frozen_at: string | null;
  user_profiles: {
    organic_id: number | null;
    email: string;
    wallet_pubkey: string | null;
  };
}

// Start voting request
export interface StartVotingRequest {
  voting_duration_days?: number;
  snapshot_holders?: Array<{
    address?: string;
    wallet_pubkey?: string;
    balance?: number;
    balance_ui?: number;
  }>;
}

// Cast vote request
export interface CastVoteRequest {
  value: VoteValue;
}

// Finalize voting request
export interface FinalizeVotingRequest {
  force?: boolean; // Force finalize even if voting period not ended (admin only)
  dedupe_key?: string;
  test_fail_mode?: 'none' | 'once' | 'always';
}

// Snapshot holder for display
export interface SnapshotHolder {
  wallet_pubkey: string;
  balance_ui: number;
  taken_at: string;
}

// Voting status for UI
export type VotingStatus =
  | 'not_started'
  | 'voting_open'
  | 'voting_closed'
  | 'finalized_passed'
  | 'finalized_failed'
  | 'finalized_quorum_not_met';

// Helper to determine voting status
export function getVotingStatus(proposal: ProposalWithVoting): VotingStatus {
  if (proposal.result === 'passed') return 'finalized_passed';
  if (proposal.result === 'failed') return 'finalized_failed';
  if (proposal.result === 'quorum_not_met') return 'finalized_quorum_not_met';

  if (!proposal.voting_starts_at || !proposal.voting_ends_at) {
    return 'not_started';
  }

  const now = new Date();
  const votingEnds = new Date(proposal.voting_ends_at);

  if (now < votingEnds) {
    return 'voting_open';
  }

  return 'voting_closed';
}

// Helper to format voting weight
export function formatVotingWeight(weight: number): string {
  if (weight >= 1000000) {
    return `${(weight / 1000000).toFixed(2)}M`;
  }
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(2)}K`;
  }
  return weight.toFixed(2);
}

// Vote value labels
export const VOTE_VALUE_LABELS: Record<VoteValue, string> = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
};

// Vote value colors
export const VOTE_VALUE_COLORS: Record<VoteValue, string> = {
  yes: 'bg-green-500',
  no: 'bg-red-500',
  abstain: 'bg-gray-400',
};

// Result labels
export const RESULT_LABELS: Record<ProposalResult, string> = {
  passed: 'Passed',
  failed: 'Failed',
  quorum_not_met: 'Quorum Not Met',
};

// Result colors
export const RESULT_COLORS: Record<ProposalResult, string> = {
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  quorum_not_met: 'bg-yellow-100 text-yellow-700',
};

// ============================================
// Phase 12: Vote Delegation
// ============================================

export type DelegationCategory =
  | 'feature'
  | 'governance'
  | 'treasury'
  | 'community'
  | 'development';

export const DELEGATION_CATEGORY_LABELS: Record<DelegationCategory, string> = {
  feature: 'Feature',
  governance: 'Governance',
  treasury: 'Treasury',
  community: 'Community',
  development: 'Development',
};

// Vote delegation record
export interface VoteDelegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  category: DelegationCategory | null;
  created_at: string;
  updated_at: string;
}

// Delegation with profile info (for display)
export interface OutgoingDelegation extends VoteDelegation {
  delegate?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

export interface IncomingDelegation extends VoteDelegation {
  delegator?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

// Effective voting power (own + delegated)
export interface EffectiveVotingPower {
  own_weight: number;
  delegated_weight: number;
  total_weight: number;
  delegator_count: number;
  source?: 'snapshot' | 'live_estimate';
}
