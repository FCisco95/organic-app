import { getConnection } from '@/lib/solana';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';

export interface VerificationResult {
  verified: boolean;
  amount?: number;
  from_wallet?: string;
  to_wallet?: string;
  token?: string;
  error?: string;
}

/**
 * Verify an on-chain donation transaction via Solana RPC.
 *
 * Checks:
 * 1. Transaction exists and is finalized
 * 2. Transfer instruction matches expected from/to wallets
 * 3. Amount matches (within small tolerance for fees)
 */
export async function verifyDonationTransaction(
  txSignature: string,
  expectedFromWallet: string,
  expectedToWallet: string,
  expectedToken: 'SOL' | 'ORG',
  expectedAmount: number
): Promise<VerificationResult> {
  try {
    const connection = getConnection();

    const tx: ParsedTransactionWithMeta | null =
      await connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'finalized',
      });

    if (!tx) {
      return { verified: false, error: 'Transaction not found on-chain' };
    }

    if (tx.meta?.err) {
      return { verified: false, error: 'Transaction failed on-chain' };
    }

    const instructions = tx.transaction.message.instructions;

    if (expectedToken === 'SOL') {
      return verifySOLTransfer(instructions, expectedFromWallet, expectedToWallet, expectedAmount);
    }

    // ORG (SPL token) transfer
    return verifySPLTransfer(instructions, expectedFromWallet, expectedToWallet, expectedAmount);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown verification error';
    return { verified: false, error: message };
  }
}

function verifySOLTransfer(
  instructions: Array<
    | { programId: { toBase58(): string }; parsed?: { type?: string; info?: Record<string, unknown> } }
    | { programId: { toBase58(): string } }
  >,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): VerificationResult {
  for (const ix of instructions) {
    if (!('parsed' in ix) || !ix.parsed) continue;
    const { type, info } = ix.parsed;

    if (type === 'transfer' && info) {
      const from = info.source as string;
      const to = info.destination as string;
      const lamports = info.lamports as number;

      if (!from || !to || !lamports) continue;

      // SOL amounts are in lamports (1 SOL = 1e9 lamports)
      const solAmount = lamports / 1e9;

      if (from === expectedFrom && to === expectedTo) {
        // Allow 1% tolerance for rounding
        const tolerance = expectedAmount * 0.01;
        if (Math.abs(solAmount - expectedAmount) <= tolerance) {
          return {
            verified: true,
            amount: solAmount,
            from_wallet: from,
            to_wallet: to,
            token: 'SOL',
          };
        }
        return { verified: false, error: `Amount mismatch: expected ${expectedAmount}, got ${solAmount}` };
      }
    }
  }

  return { verified: false, error: 'No matching SOL transfer instruction found' };
}

function verifySPLTransfer(
  instructions: Array<
    | { programId: { toBase58(): string }; parsed?: { type?: string; info?: Record<string, unknown> } }
    | { programId: { toBase58(): string } }
  >,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): VerificationResult {
  for (const ix of instructions) {
    if (!('parsed' in ix) || !ix.parsed) continue;
    const { type, info } = ix.parsed;

    // SPL transfer or transferChecked
    if ((type === 'transfer' || type === 'transferChecked') && info) {
      const authority = (info.authority ?? info.source) as string;
      const destination = info.destination as string;
      const amount = info.tokenAmount
        ? (info.tokenAmount as { uiAmount: number }).uiAmount
        : Number(info.amount ?? 0);

      if (!authority || !destination) continue;

      // For SPL transfers, authority is the wallet owner — require BOTH wallets match
      if (authority === expectedFrom && destination === expectedTo) {
        const tolerance = expectedAmount * 0.01;
        if (Math.abs(amount - expectedAmount) <= tolerance) {
          return {
            verified: true,
            amount,
            from_wallet: authority,
            to_wallet: destination,
            token: 'ORG',
          };
        }
      }
    }
  }

  return { verified: false, error: 'No matching SPL token transfer instruction found' };
}
