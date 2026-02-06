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

export const treasuryDataSchema = z.object({
  balances: treasuryBalanceSchema,
  allocations: z.array(treasuryAllocationSchema),
  transactions: z.array(treasuryTransactionSchema),
  wallet_address: z.string(),
});
