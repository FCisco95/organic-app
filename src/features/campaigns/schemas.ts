import { z } from 'zod';

export const campaignTargetAudience = z.enum(['all', 'members', 'new_users', 'admins']);
export const campaignVisibilityCondition = z.enum(['always', 'egg_hunt_revealed']);

export const campaignSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  banner_url: z.string().nullable(),
  icon: z.string().nullable(),
  cta_text: z.string().nullable(),
  cta_link: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  priority: z.number().int(),
  is_active: z.boolean(),
  target_audience: campaignTargetAudience,
  visibility_condition: campaignVisibilityCondition,
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Campaign = z.infer<typeof campaignSchema>;

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  banner_url: z.string().url().nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  cta_text: z.string().max(40).nullable().optional(),
  cta_link: z.string().max(500).nullable().optional(),
  starts_at: z.string(),
  ends_at: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional().default(0),
  is_active: z.boolean().optional().default(true),
  target_audience: campaignTargetAudience.optional().default('all'),
  visibility_condition: campaignVisibilityCondition.optional().default('always'),
});

export const updateCampaignSchema = createCampaignSchema.partial();
