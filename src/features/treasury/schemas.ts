import { z } from 'zod';

export const treasuryBalanceSchema = z.object({
  sol: z.number(),
  sol_usd: z.number().nullable(),
  org: z.number(),
  org_usd: z.number().nullable(),
  total_usd: z.number().nullable(),
});

export const treasuryAllocationSchema = z.object({
  key: z.string(),
  label: z.string(),
  percentage: z.number(),
  color: z.string(),
  amount_usd: z.number().nullable(),
});

export const treasuryTransactionSchema = z.object({
  signature: z.string(),
  block_time: z.number().nullable(),
  slot: z.number(),
  type: z.enum(['transfer', 'token_transfer', 'unknown']),
  amount: z.number().nullable(),
  token: z.enum(['SOL', 'ORG']).nullable(),
  direction: z.enum(['in', 'out']),
});

export const treasuryEmissionPolicySchema = z.object({
  settlement_emission_percent: z.number(),
  settlement_fixed_cap_per_sprint: z.number(),
  settlement_carryover_sprint_cap: z.number(),
});

export const treasuryLatestSettlementSchema = z.object({
  sprint_id: z.string().nullable(),
  status: z.enum(['pending', 'committed', 'held', 'killed']).nullable(),
  committed_at: z.string().nullable(),
  kill_switch_at: z.string().nullable(),
  blocked_reason: z.string().nullable(),
  emission_cap: z.number().nullable(),
  carryover_amount: z.number().nullable(),
});

export const treasuryTrustMetaSchema = z.object({
  emission_policy: treasuryEmissionPolicySchema,
  latest_settlement: treasuryLatestSettlementSchema,
  audit_log_link: z.string(),
  updated_at: z.string(),
  refresh_interval_seconds: z.number(),
});

export const treasuryDataSchema = z.object({
  balances: treasuryBalanceSchema,
  allocations: z.array(treasuryAllocationSchema),
  transactions: z.array(treasuryTransactionSchema),
  wallet_address: z.string(),
  trust: treasuryTrustMetaSchema,
});
