import { z } from 'zod';

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const walletQuerySchema = z.object({
  wallet: z
    .string()
    .trim()
    .min(32, { message: 'wallet must be a base58 pubkey' })
    .max(44, { message: 'wallet must be a base58 pubkey' })
    .regex(BASE58_REGEX, { message: 'wallet must be base58' }),
});

export const txSignatureQuerySchema = z.object({
  signature: z
    .string()
    .trim()
    .min(64, { message: 'signature must be a base58 tx signature' })
    .max(88, { message: 'signature must be a base58 tx signature' })
    .regex(BASE58_REGEX, { message: 'signature must be base58' }),
});

export const MAX_TOP_N = 100;

export const topNSchema = z
  .string()
  .regex(/^\d+$/, { message: 'top must be a positive integer' })
  .transform((v) => Number.parseInt(v, 10))
  .refine((n) => n >= 1 && n <= MAX_TOP_N, {
    message: `top must be 1..${MAX_TOP_N}`,
  });

export type WalletQuery = z.infer<typeof walletQuerySchema>;
export type TxSignatureQuery = z.infer<typeof txSignatureQuerySchema>;
