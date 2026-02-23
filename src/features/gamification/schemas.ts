import { z } from 'zod';
import { achievementCategorySchema } from '@/features/reputation/schemas';

export const questCadenceSchema = z.enum(['daily', 'weekly', 'long_term', 'event']);

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
  xp_reward: z.number().int().nonnegative(),
  points_reward: z.number().int().nonnegative(),
  icon: z.string(),
});

export const questProgressResponseSchema = z.object({
  generated_at: z.string(),
  objectives: z.object({
    daily: z.array(questProgressItemSchema),
    weekly: z.array(questProgressItemSchema),
    long_term: z.array(questProgressItemSchema),
    event: z.array(questProgressItemSchema),
  }),
  summary: questSummarySchema,
});

// ─── Referral Schemas ───────────────────────────────────────────────────

export const referralTierSchema = z.object({
  name: z.string(),
  min: z.number().int().min(0),
  max: z.number().int().min(1).nullable(),
  multiplier: z.number().positive(),
});

export const referralStatsSchema = z.object({
  code: z.string(),
  referral_link: z.string(),
  total_referrals: z.number().int().nonnegative(),
  completed_referrals: z.number().int().nonnegative(),
  pending_referrals: z.number().int().nonnegative(),
  total_xp_earned: z.number().int().nonnegative(),
  total_points_earned: z.number().int().nonnegative(),
  current_tier: referralTierSchema,
});

// ─── Burn Schemas ───────────────────────────────────────────────────────

export const burnCostSchema = z.object({
  current_level: z.number().int().min(1),
  next_level: z.number().int().min(1),
  current_xp: z.number().int().nonnegative(),
  xp_for_next_level: z.number().int().nonnegative(),
  points_cost: z.number().int().nonnegative(),
  available_points: z.number().int().nonnegative(),
  can_burn: z.boolean(),
  leveling_mode: z.enum(['auto', 'manual_burn']),
});

// ─── Quest Definition Row Schema ────────────────────────────────────────

export const questDefinitionRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  cadence: questCadenceSchema,
  metric_type: z.string().min(1),
  target_value: z.number().int().positive(),
  unit: z.string(),
  xp_reward: z.number().int().nonnegative(),
  points_reward: z.number().int().nonnegative(),
  is_active: z.boolean(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  icon: z.string(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ─── Admin Request Schemas ──────────────────────────────────────────────

export const createQuestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  cadence: questCadenceSchema,
  metric_type: z.string().min(1),
  target_value: z.number().int().positive(),
  unit: z.string().default(''),
  xp_reward: z.number().int().nonnegative().default(0),
  points_reward: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  icon: z.string().default('🎯'),
  sort_order: z.number().int().default(100),
});

export const updateQuestSchema = createQuestSchema.partial();

export const gamificationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  xp_per_task_point: z.number().int().positive().optional(),
  xp_vote_cast: z.number().int().nonnegative().optional(),
  xp_proposal_created: z.number().int().nonnegative().optional(),
  xp_comment_created: z.number().int().nonnegative().optional(),
  leveling_mode: z.enum(['auto', 'manual_burn']).optional(),
  burn_cost_multiplier: z.number().positive().optional(),
  referral_enabled: z.boolean().optional(),
  referral_xp_per_signup: z.number().int().nonnegative().optional(),
  referral_point_share_percent: z.number().min(0).max(100).optional(),
  referral_share_duration_days: z.number().int().positive().optional(),
  referral_tiers: z.array(referralTierSchema).optional(),
});

export type CreateQuestInput = z.infer<typeof createQuestSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestSchema>;
export type GamificationConfigInput = z.infer<typeof gamificationConfigSchema>;
