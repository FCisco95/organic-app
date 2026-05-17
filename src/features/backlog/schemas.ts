import { z } from 'zod';

export const voteBacklogSchema = z.object({
  value: z.enum(['up', 'down', 'none']),
});
export type VoteBacklogInput = z.infer<typeof voteBacklogSchema>;

export const promoteBacklogSchema = z.object({
  n: z.number().int().min(1).max(50),
});
export type PromoteBacklogInput = z.infer<typeof promoteBacklogSchema>;

export const reviewBacklogSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1).max(50),
  force: z.boolean().optional().default(false),
});
export type ReviewBacklogInput = z.infer<typeof reviewBacklogSchema>;
