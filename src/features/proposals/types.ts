import { Database, ProposalStatus, ProposalCategory } from '@/types/database';

// Base database types
export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];

// Re-export for convenience
export type { ProposalStatus, ProposalCategory };

// Proposal with author profile (for list view)
export interface ProposalListItem extends Proposal {
  user_profiles: {
    organic_id: number | null;
    email: string;
  };
  comments_count: number;
}

// Proposal with full relations (for detail view)
export interface ProposalWithRelations extends Proposal {
  user_profiles: {
    organic_id: number | null;
    email: string;
    wallet_pubkey: string | null;
  };
  proposal_versions?: {
    id: string;
    version_number: number;
    created_at: string;
  } | null;
}

// Proposal comment
export interface ProposalComment {
  id: string;
  body: string;
  proposal_version_id: string | null;
  proposal_versions?: {
    version_number: number;
  } | null;
  user_id: string;
  created_at: string;
  user_profiles: {
    organic_id: number | null;
    email: string;
  };
}

// Category metadata
export const PROPOSAL_CATEGORIES: ProposalCategory[] = [
  'feature',
  'governance',
  'treasury',
  'community',
  'development',
];

export const PROPOSAL_CATEGORY_LABELS: Record<ProposalCategory, string> = {
  feature: 'Feature / Product',
  governance: 'Governance / Policy',
  treasury: 'Treasury / Budget',
  community: 'Community / Partnership',
  development: 'Development Ideas',
};

export const PROPOSAL_CATEGORY_COLORS: Record<ProposalCategory, string> = {
  feature: 'bg-blue-100 text-blue-700',
  governance: 'bg-purple-100 text-purple-700',
  treasury: 'bg-green-100 text-green-700',
  community: 'bg-orange-100 text-orange-700',
  development: 'bg-cyan-100 text-cyan-700',
};

// Lucide icon names per category
export const PROPOSAL_CATEGORY_ICONS: Record<ProposalCategory, string> = {
  feature: 'Lightbulb',
  governance: 'Scale',
  treasury: 'Wallet',
  community: 'Users',
  development: 'Code',
};

export type LifecycleProposalStatus =
  | 'draft'
  | 'public'
  | 'qualified'
  | 'discussion'
  | 'voting'
  | 'finalized'
  | 'canceled';

export const LEGACY_TO_LIFECYCLE_STATUS: Record<ProposalStatus, LifecycleProposalStatus> = {
  draft: 'draft',
  public: 'public',
  qualified: 'qualified',
  discussion: 'discussion',
  voting: 'voting',
  finalized: 'finalized',
  canceled: 'canceled',
  submitted: 'public',
  approved: 'finalized',
  rejected: 'finalized',
};

export function normalizeProposalStatus(
  status: ProposalStatus | null | undefined
): LifecycleProposalStatus {
  if (!status) return 'draft';
  return LEGACY_TO_LIFECYCLE_STATUS[status];
}

export const FORWARD_LIFECYCLE_TRANSITIONS: Record<
  LifecycleProposalStatus,
  readonly LifecycleProposalStatus[]
> = {
  draft: ['public', 'canceled'],
  public: ['qualified', 'discussion', 'voting', 'canceled'],
  qualified: ['discussion', 'voting', 'canceled'],
  discussion: ['voting', 'canceled'],
  voting: ['finalized'],
  finalized: [],
  canceled: [],
};

export function canTransitionLifecycleStatus(
  from: LifecycleProposalStatus,
  to: LifecycleProposalStatus
): boolean {
  return FORWARD_LIFECYCLE_TRANSITIONS[from].includes(to);
}

// Status metadata
export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  public: 'bg-sky-100 text-sky-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  discussion: 'bg-amber-100 text-amber-700',
  voting: 'bg-purple-100 text-purple-700',
  finalized: 'bg-emerald-100 text-emerald-700',
  canceled: 'bg-zinc-200 text-zinc-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  public: 'Public',
  qualified: 'Qualified',
  discussion: 'Discussion',
  voting: 'Voting',
  finalized: 'Finalized',
  canceled: 'Canceled',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Category border colors (left accent bar on section cards)
export const PROPOSAL_CATEGORY_BORDER_COLORS: Record<ProposalCategory, string> = {
  feature: 'border-l-blue-500',
  governance: 'border-l-purple-500',
  treasury: 'border-l-green-500',
  community: 'border-l-orange-500',
  development: 'border-l-cyan-500',
};

// Category gradient backgrounds (header hero area)
export const PROPOSAL_CATEGORY_GRADIENTS: Record<ProposalCategory, string> = {
  feature: 'from-blue-50 to-white',
  governance: 'from-purple-50 to-white',
  treasury: 'from-green-50 to-white',
  community: 'from-orange-50 to-white',
  development: 'from-cyan-50 to-white',
};

// Wizard step type
export type WizardStep = 1 | 2 | 3 | 4;
export const WIZARD_STEPS: readonly WizardStep[] = [1, 2, 3, 4];
