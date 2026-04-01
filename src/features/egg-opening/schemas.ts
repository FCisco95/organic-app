import { z } from 'zod';

// --- Request schemas ---

export const eggTierSchema = z.enum(['bronze', 'silver', 'gold']);
export type EggTierInput = z.infer<typeof eggTierSchema>;

export const eggOpenRequestSchema = z.object({
  tier: eggTierSchema,
});

// --- Response schemas ---

export const eggOpenResponseSchema = z.object({
  reward_type: z.string(),
  reward_label: z.string(),
  reward_description: z.string(),
  reward_value: z.record(z.unknown()),
  rarity: z.string(),
  xp_spent: z.number(),
  opens_remaining_today: z.number(),
});

export type EggOpenResponse = z.infer<typeof eggOpenResponseSchema>;

// --- DB record schema ---

export const eggOpenRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tier: eggTierSchema,
  xp_spent: z.number(),
  reward_type: z.string(),
  reward_value: z.record(z.unknown()),
  opened_at: z.string(),
});

export type EggOpenRecord = z.infer<typeof eggOpenRecordSchema>;
