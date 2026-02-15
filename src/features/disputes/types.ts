// ─── Dispute Status Lifecycle ─────────────────────────────────────────────

export type DisputeStatus =
  | 'open'
  | 'mediation'
  | 'awaiting_response'
  | 'under_review'
  | 'resolved'
  | 'appealed'
  | 'appeal_review'
  | 'dismissed'
  | 'withdrawn'
  | 'mediated';

export type DisputeTier = 'mediation' | 'council' | 'admin';

export type DisputeResolution = 'overturned' | 'upheld' | 'compromise' | 'dismissed';

export type DisputeReason =
  | 'rejected_unfairly'
  | 'low_quality_score'
  | 'plagiarism_claim'
  | 'reviewer_bias'
  | 'other';

// ─── Labels & Display ─────────────────────────────────────────────────────

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  mediation: 'Mediation',
  awaiting_response: 'Awaiting Response',
  under_review: 'Under Review',
  resolved: 'Resolved',
  appealed: 'Appealed',
  appeal_review: 'Appeal Review',
  dismissed: 'Dismissed',
  withdrawn: 'Withdrawn',
  mediated: 'Mediated',
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  mediation: 'bg-blue-100 text-blue-700',
  awaiting_response: 'bg-orange-100 text-orange-700',
  under_review: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  appealed: 'bg-red-100 text-red-700',
  appeal_review: 'bg-red-100 text-red-700',
  dismissed: 'bg-gray-100 text-gray-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  mediated: 'bg-emerald-100 text-emerald-700',
};

export const DISPUTE_TIER_LABELS: Record<DisputeTier, string> = {
  mediation: 'Mediation',
  council: 'Council',
  admin: 'Admin',
};

export const DISPUTE_TIER_COLORS: Record<DisputeTier, string> = {
  mediation: 'bg-blue-100 text-blue-700',
  council: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  overturned: 'Overturned',
  upheld: 'Upheld',
  compromise: 'Compromise',
  dismissed: 'Dismissed',
};

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  rejected_unfairly: 'Rejected Unfairly',
  low_quality_score: 'Low Quality Score',
  plagiarism_claim: 'Plagiarism Claim',
  reviewer_bias: 'Reviewer Bias',
  other: 'Other',
};

// Terminal statuses — dispute cannot transition further
export const TERMINAL_STATUSES: DisputeStatus[] = [
  'resolved',
  'dismissed',
  'withdrawn',
  'mediated',
];

// ─── Core Types ───────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  submission_id: string;
  task_id: string;
  sprint_id: string | null;
  disputant_id: string;
  reviewer_id: string;
  arbitrator_id: string | null;
  status: DisputeStatus;
  tier: DisputeTier;
  reason: DisputeReason;
  evidence_text: string;
  evidence_links: string[];
  response_text: string | null;
  response_links: string[];
  response_deadline: string | null;
  response_submitted_at: string | null;
  resolution: DisputeResolution | null;
  resolution_notes: string | null;
  new_quality_score: number | null;
  resolved_at: string | null;
  xp_stake: number;
  xp_refunded: boolean;
  mediation_deadline: string | null;
  appeal_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeComment {
  id: string;
  dispute_id: string;
  user_id: string;
  content: string;
  visibility: 'parties_only' | 'arbitrator' | 'public';
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

// ─── Relational Types ─────────────────────────────────────────────────────

export interface DisputeWithRelations extends Dispute {
  disputant?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  arbitrator?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  } | null;
  task?: {
    id: string;
    title: string;
    status: string;
    base_points: number;
  };
  submission?: {
    id: string;
    review_status: string;
    quality_score: number | null;
    earned_points: number | null;
    reviewer_notes: string | null;
    rejection_reason: string | null;
  };
}

export interface DisputeListItem extends Dispute {
  disputant?: {
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  task?: {
    title: string;
  };
}

// ─── Config ───────────────────────────────────────────────────────────────

export interface DisputeConfig {
  xp_dispute_stake: number;
  xp_dispute_arbitrator_reward: number;
  xp_dispute_reviewer_penalty: number;
  xp_dispute_withdrawal_fee: number;
  dispute_mediation_hours: number;
  dispute_response_hours: number;
  dispute_appeal_hours: number;
  dispute_cooldown_days: number;
  dispute_min_xp_to_file: number;
}

export interface ArbitratorStats {
  resolved_count: number;
  overturn_rate: number;
  avg_resolution_hours: number;
}

export const DEFAULT_DISPUTE_CONFIG: DisputeConfig = {
  xp_dispute_stake: 50,
  xp_dispute_arbitrator_reward: 25,
  xp_dispute_reviewer_penalty: 30,
  xp_dispute_withdrawal_fee: 10,
  dispute_mediation_hours: 24,
  dispute_response_hours: 48,
  dispute_appeal_hours: 48,
  dispute_cooldown_days: 7,
  dispute_min_xp_to_file: 100,
};
