import { z } from 'zod';

export const engagementTypeSchema = z.enum(['like', 'retweet', 'comment']);
export type EngagementType = z.infer<typeof engagementTypeSchema>;

export const engagementAppealStatusSchema = z.enum([
  'open',
  'resolved_uphold',
  'resolved_overturn',
  'escalated_to_arbitrator',
  'expired_no_quorum',
]);
export type EngagementAppealStatus = z.infer<typeof engagementAppealStatusSchema>;

// ─── Request/response schemas for API routes ───────────────────────────

export const createHandleSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(32)
    .regex(/^@?[A-Za-z0-9_]{1,32}$/, 'handle must be alphanumeric (underscores allowed)'),
  display_name: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export const updateHandleSchema = z.object({
  display_name: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export const fileAppealSchema = z.object({
  reason: z.string().min(10).max(1000),
  proposed_score: z.number().int().min(1).max(5).optional(),
});

export const castAppealVoteSchema = z.object({
  vote: z.enum(['uphold', 'overturn']),
});

export const adminUpdatePostSchema = z.object({
  is_excluded: z.boolean().optional(),
  pool_size: z.number().int().min(0).max(10000).optional(),
  engagement_window_ends_at: z.string().datetime().optional(),
});

export const adminReviewCalibrationSchema = z.object({
  human_score: z.number().int().min(1).max(5),
  notes: z.string().max(1000).optional(),
});

// ─── Engagement config (reads from orgs.gamification_config.engagement) ─

export interface EngagementGamificationConfig {
  post_pool_default?: number;
  comment_max_xp?: number;
  like_base_xp?: number;
  retweet_base_xp?: number;
  comment_score_to_xp?: Record<string, number>;
  wave_multipliers?: Array<{ max_age_minutes: number; multiplier: number }>;
  rank_decay?: number[];
  default_multiplier_beyond_rank?: number;
  sprint_bonus_top_n?: number;
  calibration_sample_rate?: number; // 0.0 – 1.0
  appeal_quorum?: number;
  appeal_window_hours?: number;
  engagement_window_days?: number;
}

export const ENGAGEMENT_DEFAULTS: Required<
  Pick<
    EngagementGamificationConfig,
    | 'post_pool_default'
    | 'sprint_bonus_top_n'
    | 'calibration_sample_rate'
    | 'appeal_quorum'
    | 'appeal_window_hours'
    | 'engagement_window_days'
  >
> = {
  post_pool_default: 100,
  sprint_bonus_top_n: 10,
  calibration_sample_rate: 0.05,
  appeal_quorum: 5,
  appeal_window_hours: 48,
  engagement_window_days: 7,
};

export function readEngagementConfig(raw: unknown): EngagementGamificationConfig {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw as Record<string, unknown>;
  const eng = src.engagement;
  if (!eng || typeof eng !== 'object') return {};
  return eng as EngagementGamificationConfig;
}
