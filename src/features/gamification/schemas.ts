import { z } from 'zod';
import { achievementCategorySchema } from '@/features/reputation/schemas';

export const questCadenceSchema = z.enum(['daily', 'weekly', 'long_term']);

export const gamificationXpEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_type: z.string(),
  source_type: z.string().nullable(),
  source_id: z.string().uuid().nullable(),
  xp_amount: z.number().int(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
});

export const gamificationAchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: achievementCategorySchema,
  condition_type: z.string(),
  condition_field: z.string(),
  condition_threshold: z.number().int().nonnegative(),
  xp_reward: z.number().int().nonnegative(),
  created_at: z.string(),
  unlocked: z.boolean(),
  unlocked_at: z.string().nullable(),
});

export const gamificationLevelProgressSchema = z.object({
  level: z.number().int().min(1),
  level_name: z.string(),
  xp_total: z.number().int().nonnegative(),
  progress_percent: z.number().min(0).max(100),
  xp_to_next_level: z.number().int().nonnegative(),
  xp_in_level: z.number().int().nonnegative(),
  xp_for_next_level: z.number().int().nonnegative(),
  is_max_level: z.boolean(),
});

export const rewardsReadinessSchema = z.object({
  claimable_points: z.number().int().nonnegative(),
  pending_claims: z.number().int().nonnegative(),
  conversion_rate: z.number().positive(),
  min_threshold: z.number().int().nonnegative(),
  rewards_enabled: z.boolean(),
  claim_requires_wallet: z.boolean(),
  wallet_address: z.string().nullable(),
});

export const questSummaryItemSchema = z.object({
  id: z.string(),
  cadence: questCadenceSchema,
  title: z.string(),
  progress: z.number().int().nonnegative(),
  target: z.number().int().nonnegative(),
  unit: z.string(),
  completed: z.boolean(),
});

export const questSummarySchema = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  items: z.array(questSummaryItemSchema),
  note: z.string().nullable(),
});

export const gamificationOverviewSchema = z.object({
  xp_total: z.number().int().nonnegative(),
  level: z.number().int().min(1),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  total_points: z.number().int().nonnegative(),
  tasks_completed: z.number().int().nonnegative(),
  achievement_count: z.number().int().nonnegative(),
  level_progress: gamificationLevelProgressSchema,
  rewards: rewardsReadinessSchema,
  recent_xp_events: z.array(gamificationXpEventSchema),
  achievements: z.array(gamificationAchievementSchema),
  quest_summary: questSummarySchema,
});

export const questProgressItemSchema = questSummaryItemSchema.extend({
  description: z.string(),
  progress_percent: z.number().min(0).max(100),
  remaining: z.number().int().nonnegative(),
  reset_at: z.string().nullable(),
});

export const questProgressResponseSchema = z.object({
  generated_at: z.string(),
  objectives: z.object({
    daily: z.array(questProgressItemSchema),
    weekly: z.array(questProgressItemSchema),
    long_term: z.array(questProgressItemSchema),
  }),
  summary: questSummarySchema,
});
