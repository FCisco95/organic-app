import { z } from 'zod';

// Enum schemas
export const proposalCategorySchema = z.enum([
  'feature',
  'governance',
  'treasury',
  'community',
  'development',
]);

export const proposalStatusSchema = z.enum([
  'draft',
  'public',
  'qualified',
  'discussion',
  'voting',
  'finalized',
  'canceled',
  // Legacy statuses kept for backwards compatibility.
  'submitted',
  'approved',
  'rejected',
]);

export const proposalLifecycleStatusSchema = z.enum([
  'draft',
  'public',
  'qualified',
  'discussion',
  'voting',
  'finalized',
  'canceled',
]);

export const proposalResultSchema = z.enum(['passed', 'failed', 'quorum_not_met']);

export const proposalStatusChangeSchema = z.object({
  status: proposalStatusSchema,
  result: proposalResultSchema.optional(),
  reason: z.string().trim().min(3).max(500).optional(),
  override: z.boolean().optional(),
});

export type ProposalStatusChangeInput = z.infer<typeof proposalStatusChangeSchema>;

// Step 1: Category + Title + Summary
export const proposalStep1Schema = z.object({
  category: proposalCategorySchema,
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be under 200 characters'),
  summary: z
    .string()
    .min(50, 'Summary must be at least 50 characters')
    .max(300, 'Summary must be under 300 characters'),
});

// Step 2: Motivation + Solution
export const proposalStep2Schema = z.object({
  motivation: z.string().min(100, 'Problem statement must be at least 100 characters'),
  solution: z.string().min(100, 'Proposed solution must be at least 100 characters'),
});

// Step 3: Budget + Timeline (both optional)
export const proposalStep3Schema = z.object({
  budget: z.string().max(5000).optional().or(z.literal('')),
  timeline: z.string().max(5000).optional().or(z.literal('')),
});

// Full create proposal schema (all steps merged)
export const createProposalSchema = proposalStep1Schema
  .merge(proposalStep2Schema)
  .merge(proposalStep3Schema);

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

// Update proposal schema (all fields optional)
export const updateProposalSchema = createProposalSchema.partial();
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

// Proposal filters
export const proposalFiltersSchema = z.object({
  status: proposalStatusSchema.optional(),
  category: proposalCategorySchema.optional(),
  search: z.string().max(100).optional(),
  created_by: z.string().uuid().optional(),
});
export type ProposalFilters = z.infer<typeof proposalFiltersSchema>;

// Comment schema
export const addCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(5000),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;

// Per-step validation map (for wizard "Next" button)
export const wizardStepSchemas = {
  1: proposalStep1Schema,
  2: proposalStep2Schema,
  3: proposalStep3Schema,
} as const;
