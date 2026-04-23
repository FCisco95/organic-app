/**
 * Tests for ConsensusVerifier wiring in donation verification.
 *
 * Covers the fail-closed contract for donation tx verification:
 *   - consensus disabled → direct-Connection path (behavior unchanged)
 *   - consensus agree    → verified read, decoding proceeds
 *   - consensus disagree → ConsensusError caught → { verified: false, error }
 *                          donation stays pending; no exception bubbles up
 *   - consensus + both null → comparator returns true → "not found on-chain"
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §7
 * (donation verification row — fail closed, never silently credit).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';

// Keep the real ConsensusError class so `instanceof` checks inside the
// verifier resolve correctly after we mock the module.
vi.mock('@/lib/solana', async () => {
  const actual = await vi.importActual<typeof import('@/lib/solana')>('@/lib/solana');
  return {
    ...actual,
    getSolanaConsensus: vi.fn(),
    getConnection: vi.fn(),
  };
});

// Silence logger output during tests; spies below still observe calls.
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { verifyDonationTransaction } from '@/features/donations/verification';
import {
  ConsensusError,
  getConnection,
  getSolanaConsensus,
} from '@/lib/solana';
import { logger } from '@/lib/logger';

const FROM_WALLET = 'FromWalletPubkey11111111111111111111111111111';
const TO_WALLET = 'ToWalletPubkey111111111111111111111111111111';
const TX_SIG = 'TxSig11111111111111111111111111111111111111111';

/**
 * Build a minimal `ParsedTransactionWithMeta` that satisfies
 * `verifySOLTransfer` — a single System Program `transfer` instruction
 * of 1 SOL (1e9 lamports) from FROM_WALLET to TO_WALLET.
 */
function buildSolTx(slot: number, err: unknown = null): ParsedTransactionWithMeta {
  return {
    slot,
    transaction: {
      message: {
        instructions: [
          {
            programId: { toBase58: () => '11111111111111111111111111111111' },
            parsed: {
              type: 'transfer',
              info: {
                source: FROM_WALLET,
                destination: TO_WALLET,
                lamports: 1_000_000_000,
              },
            },
          },
        ],
      },
    },
    meta: { err },
  } as unknown as ParsedTransactionWithMeta;
}

type VerifyFn = (
  operation: (connection: Connection) => Promise<ParsedTransactionWithMeta | null>,
  opts: {
    label: string;
    compare?: (
      a: ParsedTransactionWithMeta | null,
      b: ParsedTransactionWithMeta | null
    ) => boolean;
  }
) => Promise<ParsedTransactionWithMeta | null>;

interface MockVerifier {
  verify: VerifyFn;
}

const getSolanaConsensusMock = vi.mocked(getSolanaConsensus);
const getConnectionMock = vi.mocked(getConnection);

describe('verifyDonationTransaction — consensus wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to direct Connection.getParsedTransaction when consensus is disabled', async () => {
    getSolanaConsensusMock.mockReturnValue(null);
    const tx = buildSolTx(12345);
    const getParsedTransaction = vi.fn().mockResolvedValue(tx);
    getConnectionMock.mockReturnValue({
      getParsedTransaction,
    } as unknown as Connection);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result).toMatchObject({
      verified: true,
      amount: 1,
      from_wallet: FROM_WALLET,
      to_wallet: TO_WALLET,
      token: 'SOL',
    });
    expect(getParsedTransaction).toHaveBeenCalledTimes(1);
    expect(getParsedTransaction).toHaveBeenCalledWith(TX_SIG, {
      maxSupportedTransactionVersion: 0,
      commitment: 'finalized',
    });
  });

  it('uses the winning provider response for decoding when consensus agrees', async () => {
    const winning = buildSolTx(999);
    const verifier: MockVerifier = {
      verify: vi.fn().mockResolvedValue(winning),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result).toMatchObject({
      verified: true,
      amount: 1,
      from_wallet: FROM_WALLET,
      to_wallet: TO_WALLET,
      token: 'SOL',
    });
    expect(verifier.verify).toHaveBeenCalledTimes(1);
    const callArgs = (verifier.verify as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toMatchObject({ label: 'donation.getParsedTransaction' });
    expect(typeof callArgs[1].compare).toBe('function');
    // getConnection should NOT have been used when consensus is enabled.
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it('fails closed on ConsensusError — donation stays pending, no exception bubbles', async () => {
    const verifier: MockVerifier = {
      verify: vi.fn().mockRejectedValue(
        new ConsensusError(
          'consensus disagreement',
          'donation.getParsedTransaction',
          []
        )
      ),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/inconsistent/i);
    expect(logger.error).toHaveBeenCalledWith(
      'Donation: consensus disagreement — leaving pending',
      expect.objectContaining({
        label: 'donation.getParsedTransaction',
        tx_signature: TX_SIG,
        expected_from: FROM_WALLET,
        expected_to: TO_WALLET,
      })
    );
  });

  it('returns "not found on-chain" when consensus returns null (both providers agree tx is unseen)', async () => {
    const verifier: MockVerifier = {
      verify: vi.fn().mockResolvedValue(null),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result).toEqual({
      verified: false,
      error: 'Transaction not found on-chain',
    });
    expect(verifier.verify).toHaveBeenCalledTimes(1);
  });

  it('returns "Transaction failed on-chain" when meta.err is set on the winning tx', async () => {
    const failedTx = buildSolTx(42, { InstructionError: [0, 'Custom'] });
    const verifier: MockVerifier = {
      verify: vi.fn().mockResolvedValue(failedTx),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result).toEqual({
      verified: false,
      error: 'Transaction failed on-chain',
    });
  });

  it('propagates non-consensus RPC errors as a generic error message (still does not throw)', async () => {
    const rpcError = new Error('429 Too Many Requests');
    const verifier: MockVerifier = {
      verify: vi.fn().mockRejectedValue(rpcError),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await verifyDonationTransaction(
      TX_SIG,
      FROM_WALLET,
      TO_WALLET,
      'SOL',
      1
    );

    expect(result.verified).toBe(false);
    expect(result.error).toBe('429 Too Many Requests');
    // No consensus-disagreement log for generic RPC errors.
    expect(logger.error).not.toHaveBeenCalledWith(
      'Donation: consensus disagreement — leaving pending',
      expect.anything()
    );
  });
});
