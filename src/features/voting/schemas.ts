import { z } from 'zod';

// Vote value enum
export const voteValueSchema = z.enum(['yes', 'no', 'abstain']);
export type VoteValueSchema = z.infer<typeof voteValueSchema>;

// Proposal result enum
export const proposalResultSchema = z.enum(['passed', 'failed', 'quorum_not_met']);
export type ProposalResultSchema = z.infer<typeof proposalResultSchema>;

// Cast vote schema
export const castVoteSchema = z.object({
  value: voteValueSchema,
});
export type CastVoteInput = z.infer<typeof castVoteSchema>;

export const snapshotHolderInputSchema = z.object({
  address: z.string().min(1).optional(),
  wallet_pubkey: z.string().min(1).optional(),
  balance: z.number().nonnegative().optional(),
  balance_ui: z.number().nonnegative().optional(),
});
export type SnapshotHolderInput = z.infer<typeof snapshotHolderInputSchema>;

// Start voting schema
export const startVotingSchema = z.object({
  voting_duration_days: z.number().int().min(1).max(30).optional(),
  snapshot_holders: z.array(snapshotHolderInputSchema).optional(),
});
export type StartVotingInput = z.infer<typeof startVotingSchema>;

// Finalize voting schema
export const finalizeVotingSchema = z.object({
  force: z.boolean().optional().default(false),
  dedupe_key: z.string().trim().min(3).max(200).optional(),
  // Debug-only knob used by integrity tests; ignored in production.
  test_fail_mode: z.enum(['none', 'once', 'always']).optional(),
});
export type FinalizeVotingInput = z.infer<typeof finalizeVotingSchema>;

// Voting config schema
export const votingConfigSchema = z.object({
  quorum_percentage: z.number().min(0).max(100).default(5),
  approval_threshold: z.number().min(0).max(100).default(50),
  voting_duration_days: z.number().int().min(1).max(30).default(5),
  proposal_threshold_org: z.number().min(0).default(0),
  proposer_cooldown_days: z.number().int().min(0).max(365).default(7),
  max_live_proposals: z.number().int().min(1).max(10).default(1),
  abstain_counts_toward_quorum: z.boolean().default(true),
});
export type VotingConfigInput = z.infer<typeof votingConfigSchema>;

// Vote tally schema (for API responses)
export const voteTallySchema = z.object({
  yes_votes: z.number(),
  no_votes: z.number(),
  abstain_votes: z.number(),
  total_votes: z.number(),
  yes_count: z.number().int(),
  no_count: z.number().int(),
  abstain_count: z.number().int(),
  total_count: z.number().int(),
});
export type VoteTallySchema = z.infer<typeof voteTallySchema>;

// Vote results schema (for API responses)
export const voteResultsSchema = z.object({
  tally: voteTallySchema,
  quorum_met: z.boolean(),
  quorum_percentage: z.number(),
  yes_percentage: z.number(),
  no_percentage: z.number(),
  abstain_percentage: z.number(),
  participation_percentage: z.number(),
  result: proposalResultSchema.nullable(),
  is_voting_open: z.boolean(),
  time_remaining_ms: z.number().nullable(),
});
export type VoteResultsSchema = z.infer<typeof voteResultsSchema>;

// User vote schema (for API responses)
export const userVoteSchema = z.object({
  id: z.string().uuid(),
  value: voteValueSchema,
  weight: z.number(),
  created_at: z.string(),
});
export type UserVoteSchema = z.infer<typeof userVoteSchema>;

// Holder snapshot schema
export const holderSnapshotSchema = z.object({
  wallet_pubkey: z.string(),
  balance_ui: z.number(),
  taken_at: z.string(),
});
export type HolderSnapshotSchema = z.infer<typeof holderSnapshotSchema>;

// ============================================
// Phase 12: Vote Delegation
// ============================================

export const delegationCategorySchema = z.enum([
  'feature',
  'governance',
  'treasury',
  'community',
  'development',
]);

export const delegateVoteSchema = z.object({
  delegate_id: z.string().uuid('Invalid delegate ID'),
  category: delegationCategorySchema.optional().nullable(),
});
export type DelegateVoteInput = z.infer<typeof delegateVoteSchema>;

export const revokeDelegationSchema = z.object({
  delegation_id: z.string().uuid('Invalid delegation ID'),
});
export type RevokeDelegationInput = z.infer<typeof revokeDelegationSchema>;
