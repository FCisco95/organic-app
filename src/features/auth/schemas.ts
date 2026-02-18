import { z } from 'zod';

export const linkWalletSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export type LinkWalletInput = z.infer<typeof linkWalletSchema>;
