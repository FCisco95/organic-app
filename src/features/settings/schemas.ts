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

export const governancePolicySchema = z.object({
  qualification_threshold_percent: z.coerce.number().min(0).max(100),
  anti_spam_min_hours_between_proposals: z.coerce.number().int().min(0).max(720),
  override_ttl_days: z.coerce.number().int().min(1).max(30),
  override_requires_council_review: z.boolean(),
});

export const sprintPolicySchema = z.object({
  dispute_window_hours: z.coerce.number().int().min(1).max(168),
  reviewer_sla_hours: z.coerce.number().int().min(1).max(168),
  reviewer_sla_extension_hours: z.coerce.number().int().min(1).max(168),
});

export const rewardsConfigSchema = z.object({
  enabled: z.boolean(),
  points_to_token_rate: z.coerce.number().positive(),
  min_claim_threshold: z.coerce.number().min(0),
  default_epoch_pool: z.coerce.number().min(0),
  claim_requires_wallet: z.boolean(),
  settlement_emission_percent: z.coerce.number().gt(0).lte(1).optional(),
  settlement_fixed_cap_per_sprint: z.coerce.number().min(0).optional(),
  settlement_carryover_sprint_cap: z.coerce.number().int().min(1).max(3).optional(),
  treasury_balance_for_emission: z.coerce.number().min(0).optional(),
});

export const gamificationConfigPatchSchema = z.object({
  enabled: z.boolean().optional(),
  xp_per_task_point: z.coerce.number().int().positive().optional(),
  xp_vote_cast: z.coerce.number().int().nonnegative().optional(),
  xp_proposal_created: z.coerce.number().int().nonnegative().optional(),
  xp_comment_created: z.coerce.number().int().nonnegative().optional(),
  leveling_mode: z.enum(['auto', 'manual_burn']).optional(),
  burn_cost_multiplier: z.coerce.number().positive().optional(),
  referral_enabled: z.boolean().optional(),
  referral_xp_per_signup: z.coerce.number().int().nonnegative().optional(),
  referral_point_share_percent: z.coerce.number().min(0).max(100).optional(),
  referral_share_duration_days: z.coerce.number().int().positive().optional(),
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
  sprint_policy: sprintPolicySchema,
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type TokenSettingsInput = z.infer<typeof tokenSettingsSchema>;
export type TreasurySettingsInput = z.infer<typeof treasurySettingsSchema>;
export type GovernanceSettingsInput = z.infer<typeof governanceSettingsSchema>;
export type SprintSettingsInput = z.infer<typeof sprintSettingsSchema>;
export type GovernancePolicyInput = z.infer<typeof governancePolicySchema>;
export type SprintPolicyInput = z.infer<typeof sprintPolicySchema>;
export type RewardsConfigInput = z.infer<typeof rewardsConfigSchema>;

// Server-side schema for the PATCH /api/settings route.
// Accepts any combination of org + voting config fields in a flat payload.
const orgFieldsSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  logo_url: z.string().url().nullable().or(z.literal('')),
  token_symbol: z.string().min(1).max(20),
  token_mint: z.string().nullable().or(z.literal('')),
  token_decimals: z.coerce.number().int().min(0).max(18),
  token_total_supply: z.coerce.number().int().positive(),
  treasury_wallet: z.string().nullable().or(z.literal('')),
  treasury_allocations: z.array(treasuryAllocationItemSchema),
  default_sprint_capacity: z.coerce.number().int().min(1),
  default_sprint_duration_days: z.coerce.number().int().min(1).max(90),
  organic_id_threshold: z.coerce.number().min(0).nullable(),
  governance_policy: governancePolicySchema,
  sprint_policy: sprintPolicySchema,
  rewards_config: rewardsConfigSchema,
});

const votingFieldsSchema = z.object({
  quorum_percentage: z.coerce.number().min(0).max(100),
  approval_threshold: z.coerce.number().min(0).max(100),
  voting_duration_days: z.coerce.number().int().min(1).max(90),
  proposal_threshold_org: z.coerce.number().min(0),
  proposer_cooldown_days: z.coerce.number().int().min(0).max(365),
  max_live_proposals: z.coerce.number().int().min(1).max(100),
  abstain_counts_toward_quorum: z.boolean(),
});

export const settingsPatchSchema = orgFieldsSchema
  .merge(votingFieldsSchema)
  .partial()
  .extend({
    reason: z.string().trim().min(8).max(500),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'reason'), {
    message: 'At least one settings field must be provided',
    path: ['reason'],
  });
export type SettingsPatchInput = z.infer<typeof settingsPatchSchema>;
