import { z } from 'zod';

// ─── Enum schemas ─────────────────────────────────────────────────────────

export const disputeStatusSchema = z.enum([
  'open',
  'mediation',
  'awaiting_response',
  'under_review',
  'resolved',
  'appealed',
  'appeal_review',
  'dismissed',
  'withdrawn',
  'mediated',
]);

export const disputeTierSchema = z.enum(['mediation', 'council', 'admin']);

export const disputeResolutionSchema = z.enum([
  'overturned',
  'upheld',
  'compromise',
  'dismissed',
]);

export const disputeReasonSchema = z.enum([
  'rejected_unfairly',
  'low_quality_score',
  'plagiarism_claim',
  'reviewer_bias',
  'other',
]);

// ─── Create dispute ───────────────────────────────────────────────────────

export const createDisputeSchema = z.object({
  submission_id: z.string().uuid('Invalid submission ID'),
  reason: disputeReasonSchema,
  evidence_text: z
    .string()
    .min(20, 'Evidence must be at least 20 characters')
    .max(5000, 'Evidence must be at most 5000 characters'),
  evidence_links: z
    .array(z.string().url('Invalid URL'))
    .max(10, 'Maximum 10 evidence links')
    .default([]),
  request_mediation: z.boolean().default(false),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

// ─── Respond to dispute (reviewer counter-argument) ───────────────────────

export const respondToDisputeSchema = z.object({
  response_text: z
    .string()
    .min(20, 'Response must be at least 20 characters')
    .max(5000, 'Response must be at most 5000 characters'),
  response_links: z
    .array(z.string().url('Invalid URL'))
    .max(10, 'Maximum 10 response links')
    .default([]),
});
export type RespondToDisputeInput = z.infer<typeof respondToDisputeSchema>;

// ─── Resolve dispute (arbitrator decision) ────────────────────────────────

export const resolveDisputeSchema = z
  .object({
    resolution: disputeResolutionSchema,
    resolution_notes: z
      .string()
      .min(10, 'Resolution notes must be at least 10 characters')
      .max(3000, 'Resolution notes must be at most 3000 characters'),
    new_quality_score: z
      .number()
      .int()
      .min(1)
      .max(5)
      .nullable()
      .default(null),
  })
  .refine(
    (data) => {
      // Compromise requires a new quality score
      if (data.resolution === 'compromise' && data.new_quality_score === null) {
        return false;
      }
      return true;
    },
    {
      message: 'Compromise resolution requires a new quality score',
      path: ['new_quality_score'],
    }
  );
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

// ─── Appeal dispute ───────────────────────────────────────────────────────

export const appealDisputeSchema = z.object({
  appeal_reason: z
    .string()
    .min(20, 'Appeal reason must be at least 20 characters')
    .max(3000, 'Appeal reason must be at most 3000 characters'),
});
export type AppealDisputeInput = z.infer<typeof appealDisputeSchema>;

// ─── Mediate dispute ──────────────────────────────────────────────────────

export const mediateDisputeSchema = z.object({
  agreed_outcome: z.string().min(10, 'Agreement must be at least 10 characters').max(2000),
});
export type MediateDisputeInput = z.infer<typeof mediateDisputeSchema>;

// ─── Dispute comment ──────────────────────────────────────────────────────

export const disputeCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
  visibility: z.enum(['parties_only', 'arbitrator', 'public']).default('parties_only'),
});
export type DisputeCommentInput = z.infer<typeof disputeCommentSchema>;

// ─── Filter / query params ────────────────────────────────────────────────

export const disputeFilterSchema = z.object({
  status: disputeStatusSchema.optional(),
  tier: disputeTierSchema.optional(),
  sprint_id: z.string().uuid().optional(),
  my_disputes: z.boolean().optional(),
});
export type DisputeFilters = z.infer<typeof disputeFilterSchema>;
