import { z } from 'zod';

export const donationTokenSchema = z.enum(['SOL', 'ORG']);

export const submitDonationSchema = z.object({
  tx_signature: z
    .string()
    .trim()
    .min(80, 'Invalid transaction signature')
    .max(120, 'Invalid transaction signature'),
  token: donationTokenSchema,
  amount: z.number().positive('Amount must be positive'),
  from_wallet: z
    .string()
    .trim()
    .min(32, 'Invalid wallet address')
    .max(50, 'Invalid wallet address'),
  to_wallet: z
    .string()
    .trim()
    .min(32, 'Invalid wallet address')
    .max(50, 'Invalid wallet address'),
});

export const donationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const donationLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SubmitDonationInput = z.infer<typeof submitDonationSchema>;
export type DonationHistoryQueryInput = z.infer<typeof donationHistoryQuerySchema>;
export type DonationLeaderboardQueryInput = z.infer<typeof donationLeaderboardQuerySchema>;
