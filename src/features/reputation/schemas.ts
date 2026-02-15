import { z } from 'zod';

// Achievement category enum
export const achievementCategorySchema = z.enum([
  'contribution',
  'governance',
  'community',
  'milestone',
]);

// Reputation query params
export const reputationParamsSchema = z.object({
  userId: z.string().uuid().optional(),
});
export type ReputationParams = z.infer<typeof reputationParamsSchema>;

// XP history query params
export const xpHistoryParamsSchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().datetime().optional(),
});
export type XpHistoryParams = z.infer<typeof xpHistoryParamsSchema>;

// Achievement filter params
export const achievementFilterSchema = z.object({
  category: achievementCategorySchema.optional(),
});
export type AchievementFilter = z.infer<typeof achievementFilterSchema>;
