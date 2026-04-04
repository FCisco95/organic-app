import { z } from 'zod';

export const eggHuntConfigSchema = z.object({
  id: z.string().uuid(),
  shimmer_enabled: z.boolean(),
  shimmer_rate: z.number(),
  hunt_enabled: z.boolean(),
  base_spawn_rate: z.number(),
  probability_override: z.boolean(),
  override_rate: z.number(),
  override_expires_at: z.string().nullable(),
  campaign_revealed: z.boolean(),
  hunt_ends_at: z.string().nullable(),
  updated_at: z.string(),
  updated_by: z.string().uuid().nullable(),
});

export type EggHuntConfig = z.infer<typeof eggHuntConfigSchema>;

export const updateEggHuntConfigSchema = z.object({
  shimmer_enabled: z.boolean().optional(),
  shimmer_rate: z.number().min(0.001).max(0.1).optional(),
  hunt_enabled: z.boolean().optional(),
  base_spawn_rate: z.number().min(0.0001).max(0.01).optional(),
  probability_override: z.boolean().optional(),
  override_rate: z.number().min(0.001).max(0.05).optional(),
  override_expires_at: z.string().nullable().optional(),
  campaign_revealed: z.boolean().optional(),
  hunt_ends_at: z.string().nullable().optional(),
  xp_egg_enabled: z.boolean().optional(),
  xp_egg_spawn_rate: z.number().min(0.01).max(0.1).optional(),
});

export const goldenEggSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  egg_number: z.number().int().min(1).max(10),
  element: z.string(),
  found_at: z.string(),
  found_on_page: z.string(),
  shared_to_x: z.boolean(),
  shared_at: z.string().nullable(),
});

export type GoldenEgg = z.infer<typeof goldenEggSchema>;

export const xpEggSpawnSchema = z.object({
  token: z.string().uuid(),
  xp_amount: z.number(),
  is_shiny: z.boolean(),
});

export type XpEggSpawn = z.infer<typeof xpEggSpawnSchema>;

export const eggCheckResponseSchema = z.object({
  spawn: z.boolean(),
  shimmer: z.boolean(),
  egg: z.object({
    number: z.number(),
    element: z.string(),
  }).nullable(),
  xp_egg: xpEggSpawnSchema.nullable(),
});

export type EggCheckResponse = z.infer<typeof eggCheckResponseSchema>;

export const xpEggClaimSchema = z.object({
  token: z.string().uuid(),
});

export const eggClaimSchema = z.object({
  egg_number: z.number().int().min(1).max(10),
  found_on_page: z.string().min(1).max(200),
});

export const eggHuntStatsSchema = z.object({
  total_eggs_found: z.number(),
  unique_hunters: z.number(),
  eggs_by_element: z.record(z.number()),
  first_discovery: z.object({
    user_name: z.string().nullable(),
    element: z.string(),
    found_at: z.string(),
  }).nullable(),
});

export type EggHuntStats = z.infer<typeof eggHuntStatsSchema>;
