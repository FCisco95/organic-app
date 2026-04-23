import {
  getConnection,
  getSolanaConsensus,
  ConsensusError,
  compareTxConfirmation,
} from '@/lib/solana';
import type {
  GetVersionedTransactionConfig,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { logger } from '@/lib/logger';

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
 *
 * When the ConsensusVerifier is enabled, the transaction confirmation is
 * cross-checked against all configured providers. On a disagreement we
 * fail-closed: donation stays pending, never credited (spec §7).
 * Per-provider metadata (signatures array, inner-instruction ordering) is
 * intentionally ignored by `compareTxConfirmation` — only `{slot, status}`
 * are compared. The winning provider's `ParsedTransactionWithMeta` is then
 * used for instruction decoding (verifySOLTransfer / verifySPLTransfer).
 */
export async function verifyDonationTransaction(
  txSignature: string,
  expectedFromWallet: string,
  expectedToWallet: string,
  expectedToken: 'SOL' | 'ORG',
  expectedAmount: number
): Promise<VerificationResult> {
  try {
    const tx = await readParsedTransactionWithConsensus(txSignature);

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
    if (error instanceof ConsensusError) {
      logger.error('Donation: consensus disagreement — leaving pending', {
        label: error.label,
        tx_signature: txSignature,
        expected_from: expectedFromWallet,
        expected_to: expectedToWallet,
      });
      return {
        verified: false,
        error:
          'Transaction confirmation is inconsistent across providers — leaving donation pending',
      };
    }
    const message = error instanceof Error ? error.message : 'Unknown verification error';
    return { verified: false, error: message };
  }
}

/**
 * Read a parsed transaction through the ConsensusVerifier when available,
 * otherwise fall back to the shared Connection. The consensus comparator
 * only looks at `{slot, status}` — per-provider metadata (signatures,
 * inner-instruction order) is intentionally ignored because it is allowed
 * to vary across providers even when both agree the tx confirmed at the
 * same slot.
 */
async function readParsedTransactionWithConsensus(
  txSignature: string
): Promise<ParsedTransactionWithMeta | null> {
  const options: GetVersionedTransactionConfig = {
    maxSupportedTransactionVersion: 0,
    commitment: 'finalized',
  };
  const consensus = getSolanaConsensus();
  if (!consensus) {
    return getConnection().getParsedTransaction(txSignature, options);
  }
  return consensus.verify<ParsedTransactionWithMeta | null>(
    (connection) => connection.getParsedTransaction(txSignature, options),
    {
      label: 'donation.getParsedTransaction',
      compare: (a, b) => compareTxConfirmation(summarizeTx(a), summarizeTx(b)),
    }
  );
}

/**
 * Reduce a `ParsedTransactionWithMeta` to the fields the consensus
 * comparator cares about (`{slot, status}`). When both providers return
 * `null` (tx not yet seen), `compareTxConfirmation` returns true and the
 * caller gets a consistent "not found" result.
 */
function summarizeTx(
  tx: ParsedTransactionWithMeta | null
): { slot: number; status: string } | null {
  if (!tx) return null;
  // The tx was requested with commitment='finalized', so both providers
  // returning a non-null result means both observed it as finalized.
  // `meta.err` being set does not change consensus on {slot, status} —
  // both providers should still agree it failed at the same slot.
  return { slot: tx.slot, status: 'finalized' };
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
