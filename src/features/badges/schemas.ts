import { z } from 'zod';
import { BADGE_KEYS } from './config';

export const badgeTypeSchema = z.enum(['permanent', 'sprint']);

export const userBadgeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  badge_key: z.string(),
  badge_type: badgeTypeSchema,
  sprint_id: z.string().uuid().nullable(),
  earned_at: z.string(),
  xp_awarded: z.number().int(),
  metadata: z.record(z.unknown()).nullable(),
});

export type UserBadge = z.infer<typeof userBadgeSchema>;

export const awardBadgeRequestSchema = z.object({
  user_id: z.string().uuid(),
  badge_key: z.enum(BADGE_KEYS as unknown as [string, ...string[]]),
  sprint_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AwardBadgeRequest = z.infer<typeof awardBadgeRequestSchema>;
