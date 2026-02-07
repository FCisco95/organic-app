import { z } from 'zod';

export const generalSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  logo_url: z.string().url().nullable().or(z.literal('')),
});

export const tokenSettingsSchema = z.object({
  token_symbol: z.string().min(1).max(20),
  token_mint: z.string().nullable().or(z.literal('')),
  token_decimals: z.coerce.number().int().min(0).max(18),
  token_total_supply: z.coerce.number().int().positive(),
});

const treasuryAllocationItemSchema = z.object({
  key: z.string().min(1).max(50),
  percentage: z.number().min(0).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const treasurySettingsSchema = z
  .object({
    treasury_wallet: z.string().nullable().or(z.literal('')),
    treasury_allocations: z.array(treasuryAllocationItemSchema),
  })
  .refine(
    (data) => {
      const total = data.treasury_allocations.reduce((sum, a) => sum + a.percentage, 0);
      return total === 100 || data.treasury_allocations.length === 0;
    },
    { message: 'Allocations must sum to 100%', path: ['treasury_allocations'] }
  );

export const governanceSettingsSchema = z.object({
  quorum_percentage: z.coerce.number().min(0).max(100),
  approval_threshold: z.coerce.number().min(0).max(100),
  voting_duration_days: z.coerce.number().int().min(1).max(90),
  proposal_threshold_org: z.coerce.number().min(0),
  proposer_cooldown_days: z.coerce.number().int().min(0).max(365),
  max_live_proposals: z.coerce.number().int().min(1).max(100),
  abstain_counts_toward_quorum: z.boolean(),
});

export const sprintSettingsSchema = z.object({
  default_sprint_capacity: z.coerce.number().int().min(1),
  default_sprint_duration_days: z.coerce.number().int().min(1).max(90),
  organic_id_threshold: z.coerce.number().min(0).nullable(),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type TokenSettingsInput = z.infer<typeof tokenSettingsSchema>;
export type TreasurySettingsInput = z.infer<typeof treasurySettingsSchema>;
export type GovernanceSettingsInput = z.infer<typeof governanceSettingsSchema>;
export type SprintSettingsInput = z.infer<typeof sprintSettingsSchema>;
