import { z } from 'zod';

export const createBoostSchema = z.object({
  tweet_url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) => /^https:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url),
      'Must be a valid Twitter/X post URL'
    ),
  points_offered: z
    .number()
    .int()
    .min(5, 'Minimum 5 points')
    .max(1000, 'Maximum 1000 points'),
  max_engagements: z
    .number()
    .int()
    .min(1, 'At least 1 engagement')
    .max(100, 'Maximum 100 engagements'),
});

export const submitProofSchema = z.object({
  proof_type: z.enum(['like', 'retweet', 'comment']),
  proof_url: z.string().url().optional(),
});

export type CreateBoostInput = z.infer<typeof createBoostSchema>;
export type SubmitProofInput = z.infer<typeof submitProofSchema>;
