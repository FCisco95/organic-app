import { z } from 'zod';
import { commentBodySchema } from '@/lib/schemas/common';
import { proposalCategorySchema } from '@/features/proposals/schemas';

export const ideaSortSchema = z.enum(['hot', 'new', 'top_week', 'top_all']);

export const listIdeasQuerySchema = z.object({
  sort: ideaSortSchema.optional().default('hot'),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const createIdeaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be under 200 characters'),
  body: z
    .string()
    .trim()
    .min(20, 'Idea body must be at least 20 characters')
    .max(10000, 'Idea body must be under 10000 characters'),
  tags: z.array(z.string().trim().min(1).max(24)).max(5).optional(),
});

export const updateIdeaSchema = createIdeaSchema.partial();

/** Admin-only moderation fields — merged with updateIdeaSchema on the route */
export const moderateIdeaSchema = z.object({
  is_pinned: z.boolean().optional(),
  status: z.enum(['open', 'locked', 'removed']).optional(),
  removed_reason: z.string().trim().max(500).optional(),
});

export type ModerateIdeaInput = z.infer<typeof moderateIdeaSchema>;

export const voteIdeaSchema = z.object({
  value: z.enum(['up', 'down', 'none']),
});

export const addIdeaCommentSchema = z.object({
  body: commentBodySchema(),
});

export const selectIdeaWinnerSchema = z.object({
  idea_id: z.string().uuid().optional(),
});

export const promoteIdeaSchema = z.object({
  category: proposalCategorySchema.optional(),
});

export type IdeaSortInput = z.infer<typeof ideaSortSchema>;
export type ListIdeasQueryInput = z.infer<typeof listIdeasQuerySchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
export type VoteIdeaInput = z.infer<typeof voteIdeaSchema>;
export type AddIdeaCommentInput = z.infer<typeof addIdeaCommentSchema>;
export type SelectIdeaWinnerInput = z.infer<typeof selectIdeaWinnerSchema>;
export type PromoteIdeaInput = z.infer<typeof promoteIdeaSchema>;
