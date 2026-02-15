import { z } from 'zod';

export const submitClaimSchema = z.object({
  points_amount: z.number().int().positive('Points must be a positive integer'),
});

export const reviewClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  admin_note: z.string().optional(),
});

export const payClaimSchema = z.object({
  tx_signature: z.string().min(1, 'Transaction signature is required'),
});

export const manualDistributionSchema = z.object({
  distributions: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        token_amount: z.number().positive('Token amount must be positive'),
        category: z.enum(['bonus', 'bounty', 'correction']),
        reason: z.string().min(1, 'Reason is required'),
      })
    )
    .min(1, 'At least one distribution is required'),
});

export const distributionFilterSchema = z.object({
  type: z.enum(['epoch', 'manual', 'claim']).optional(),
  sprint_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const claimFilterSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'paid']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
