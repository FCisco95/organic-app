/**
 * Unit tests for the treasury consensus-read helper.
 *
 * Covers the graceful-degrade contract for treasury balance reads:
 *   - consensus disabled → direct-Connection path, stale=false
 *   - consensus agree    → verified read, stale=false
 *   - consensus disagree + warm cache → last-known-good with stale=true
 *   - consensus disagree + cold cache → ConsensusError propagates
 *   - non-consensus error → propagates unchanged
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §7.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection, PublicKey } from '@solana/web3.js';

// Keep the real ConsensusError class so `instanceof` checks inside the
// helper resolve correctly after we mock the module.
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

import {
  __resetTreasuryConsensusCacheForTests,
  readTreasurySolBalance,
} from '@/features/treasury/server/consensus-balance';
import {
  ConsensusError,
  getConnection,
  getSolanaConsensus,
} from '@/lib/solana';
import { logger } from '@/lib/logger';

type VerifyFn = (
  operation: (connection: Connection) => Promise<number>,
  opts: { label: string; compare?: (a: number, b: number) => boolean }
) => Promise<number>;

interface MockVerifier {
  verify: VerifyFn;
}

function fakePubkey(): PublicKey {
  return { __marker: 'treasury-pubkey' } as unknown as PublicKey;
}

const getSolanaConsensusMock = vi.mocked(getSolanaConsensus);
const getConnectionMock = vi.mocked(getConnection);

describe('readTreasurySolBalance', () => {
  beforeEach(() => {
    __resetTreasuryConsensusCacheForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to direct Connection.getBalance when consensus is disabled', async () => {
    getSolanaConsensusMock.mockReturnValue(null);
    const getBalance = vi.fn().mockResolvedValue(777);
    getConnectionMock.mockReturnValue({ getBalance } as unknown as Connection);

    const pubkey = fakePubkey();
    const result = await readTreasurySolBalance(pubkey);

    expect(result).toEqual({ balance: 777, stale: false });
    expect(getBalance).toHaveBeenCalledTimes(1);
    expect(getBalance).toHaveBeenCalledWith(pubkey);
  });

  it('caches last-known-good on consensus-disabled path', async () => {
    getSolanaConsensusMock.mockReturnValue(null);
    const getBalance = vi.fn().mockResolvedValue(555);
    getConnectionMock.mockReturnValue({ getBalance } as unknown as Connection);

    await readTreasurySolBalance(fakePubkey());

    // Now enable consensus, force a disagreement, and expect the fallback
    // to return 555 with stale=true.
    const verifier: MockVerifier = {
      verify: vi.fn().mockRejectedValue(
        new ConsensusError('consensus disagreement', 'treasury.getBalance', [])
      ),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const result = await readTreasurySolBalance(fakePubkey());
    expect(result).toEqual({ balance: 555, stale: true });
  });

  it('returns verified balance with stale=false when providers agree', async () => {
    const verifier: MockVerifier = {
      verify: vi.fn().mockResolvedValue(123456),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    const pubkey = fakePubkey();
    const result = await readTreasurySolBalance(pubkey);

    expect(result).toEqual({ balance: 123456, stale: false });
    expect(verifier.verify).toHaveBeenCalledTimes(1);
    const callArgs = (verifier.verify as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toMatchObject({ label: 'treasury.getBalance' });
    expect(typeof callArgs[1].compare).toBe('function');
  });

  it('returns cached balance with stale=true on ConsensusError when cache is warm', async () => {
    // Warm the cache via a successful agree call.
    const verifierOk: MockVerifier = {
      verify: vi.fn().mockResolvedValue(9000),
    };
    getSolanaConsensusMock.mockReturnValue(verifierOk as never);
    const warm = await readTreasurySolBalance(fakePubkey());
    expect(warm).toEqual({ balance: 9000, stale: false });

    // Next call disagrees — expect graceful-degrade.
    const verifierFail: MockVerifier = {
      verify: vi.fn().mockRejectedValue(
        new ConsensusError('consensus disagreement', 'treasury.getBalance', [])
      ),
    };
    getSolanaConsensusMock.mockReturnValue(verifierFail as never);

    const result = await readTreasurySolBalance(fakePubkey());
    expect(result).toEqual({ balance: 9000, stale: true });

    expect(logger.error).toHaveBeenCalledWith(
      'Treasury: consensus disagreement — serving last-known-good with stale=true',
      expect.objectContaining({ label: 'treasury.getBalance' })
    );
  });

  it('propagates ConsensusError when cache is empty (cold start)', async () => {
    const verifier: MockVerifier = {
      verify: vi.fn().mockRejectedValue(
        new ConsensusError('consensus disagreement', 'treasury.getBalance', [])
      ),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    await expect(readTreasurySolBalance(fakePubkey())).rejects.toBeInstanceOf(
      ConsensusError
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Treasury: consensus disagreement and no cached balance — propagating',
      expect.objectContaining({ label: 'treasury.getBalance' })
    );
  });

  it('propagates non-consensus errors unchanged (e.g., RPC 429)', async () => {
    const rpcError = new Error('429 Too Many Requests');
    const verifier: MockVerifier = {
      verify: vi.fn().mockRejectedValue(rpcError),
    };
    getSolanaConsensusMock.mockReturnValue(verifier as never);

    await expect(readTreasurySolBalance(fakePubkey())).rejects.toBe(rpcError);
  });
});
