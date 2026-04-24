/**
 * End-to-end security coverage for the ConsensusVerifier wiring across
 * all four protected call sites.
 *
 * Each `describe` exercises a realistic provider-disagreement scenario
 * and asserts the expected fail-mode:
 *   - isOrgHolder (boolean)                       → ConsensusError + audit row
 *   - getAllTokenHolders (holder-set)             → ConsensusError + audit row
 *   - readTreasurySolBalance (lamports)           → graceful-degrade stale=true
 *   - verifyDonationTransaction (tx confirmation) → fail-closed VerificationResult
 *
 * Plus: the audit writer throwing must NOT mask the original ConsensusError —
 * the security signal is preserved at the verifier level.
 *
 * Notes:
 * - No DB `audit_log` table exists in this repo. The `defaultAuditLogWriter`
 *   writes through the structured logger; these tests assert on the
 *   `AuditLogWriter` shape and on `logger.error` call shape instead of on
 *   DB rows.
 * - `FixtureSolanaRpc` does not support per-provider scripting. Instead of
 *   adding a feature used only by this one file, we use direct stub
 *   providers with per-connection sentinels (same pattern as
 *   `src/lib/solana/__tests__/rpc-consensus.test.ts`).
 * - The plan spec mentions `metrics.increment` for a disagreement counter,
 *   but this project has no telemetry module today; that assertion is
 *   intentionally skipped.
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §7, §11.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import type { RpcProvider } from '@/lib/solana/providers';
import { RpcPool } from '@/lib/solana/rpc-pool';
import {
  ConsensusError,
  ConsensusVerifier,
  compareBoolean,
  compareHolderSet,
  type AuditLogWriter,
  type AuditLogRow,
} from '@/lib/solana/rpc-consensus';
import type { TokenHolder } from '@/lib/solana/rpc';

// --- Shared helpers -----------------------------------------------------

type ConnectionSentinel = { __providerName: string } & Partial<Connection>;

function makeProvider(name: string): RpcProvider {
  return {
    name,
    tier: 'primary',
    timeoutMs: 5_000,
    connection: { __providerName: name } as unknown as Connection,
  };
}

function makePool(providers: ReadonlyArray<RpcProvider>): RpcPool {
  return new RpcPool(providers);
}

function providerNameOf(conn: Connection): string {
  return (conn as unknown as ConnectionSentinel).__providerName;
}

interface AuditSpy {
  writer: AuditLogWriter;
  writes: AuditLogRow[];
}

function makeAuditSpy(): AuditSpy {
  const writes: AuditLogRow[] = [];
  return {
    writes,
    writer: {
      async write(row: AuditLogRow): Promise<void> {
        writes.push(row);
      },
    },
  };
}

// --- Verifier-level describes -------------------------------------------

describe('Consensus — Organic ID grant (isOrgHolder)', () => {
  beforeEach(() => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
    vi.restoreAllMocks();
  });

  it('throws ConsensusError with an audit row when providers disagree on holder status', async () => {
    const primary = makeProvider('primary');
    const secondary = makeProvider('secondary');
    const pool = makePool([primary, secondary]);
    const audit = makeAuditSpy();
    const verifier = new ConsensusVerifier([primary, secondary], pool, {
      auditLog: audit.writer,
    });

    // Primary says "holder"; secondary says "not holder" — exactly the
    // disagreement that must fail-closed for an Organic ID grant.
    const operation = (connection: Connection): Promise<boolean> => {
      return Promise.resolve(providerNameOf(connection) === 'primary');
    };

    await expect(
      verifier.verify<boolean>(operation, {
        label: 'isOrgHolder',
        compare: compareBoolean,
      })
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'isOrgHolder',
      message: 'consensus disagreement',
    });

    expect(audit.writes).toHaveLength(1);
    const row = audit.writes[0];
    expect(row.event).toBe('rpc.consensus_disagreement');
    expect(row.label).toBe('isOrgHolder');
    expect(row.payload.providers).toHaveLength(2);
    const values = row.payload.providers.map((p) => p.value);
    expect(values).toContain(true);
    expect(values).toContain(false);
  });
});

describe('Consensus — vote snapshot (getAllTokenHolders)', () => {
  beforeEach(() => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
    vi.restoreAllMocks();
  });

  it('throws ConsensusError with an audit row when providers return different holder member lists', async () => {
    const primary = makeProvider('primary');
    const secondary = makeProvider('secondary');
    const pool = makePool([primary, secondary]);
    const audit = makeAuditSpy();
    const verifier = new ConsensusVerifier([primary, secondary], pool, {
      auditLog: audit.writer,
    });

    const primarySet: ReadonlyArray<TokenHolder> = [
      { address: 'walletA', balance: 100 },
      { address: 'walletB', balance: 50 },
    ];
    const secondarySet: ReadonlyArray<TokenHolder> = [
      { address: 'walletA', balance: 100 },
      { address: 'walletC', balance: 75 },
    ];

    const operation = (
      connection: Connection
    ): Promise<ReadonlyArray<TokenHolder>> => {
      return Promise.resolve(
        providerNameOf(connection) === 'primary' ? primarySet : secondarySet
      );
    };

    await expect(
      verifier.verify<ReadonlyArray<TokenHolder>>(operation, {
        label: 'getAllTokenHolders',
        compare: compareHolderSet,
        timeoutMs: 10_000,
      })
    ).rejects.toBeInstanceOf(ConsensusError);

    expect(audit.writes).toHaveLength(1);
    expect(audit.writes[0].label).toBe('getAllTokenHolders');
    expect(audit.writes[0].event).toBe('rpc.consensus_disagreement');
    expect(audit.writes[0].payload.providers).toHaveLength(2);
  });
});

// --- Helper-level describes (treasury + donation) -----------------------
//
// These two exercise the layer that converts ConsensusError into the
// call-site's documented fail-mode (graceful-degrade vs. VerificationResult).
// They reuse the partial-mock + importActual pattern proven in
// src/app/api/treasury/__tests__/consensus-balance.test.ts and
// src/features/donations/__tests__/verification-consensus.test.ts.

vi.mock('@/lib/solana', async () => {
  const actual = await vi.importActual<typeof import('@/lib/solana')>(
    '@/lib/solana'
  );
  return {
    ...actual,
    getSolanaConsensus: vi.fn(),
    getConnection: vi.fn(),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Imports that depend on the mocks above.
// eslint-disable-next-line import/first
import {
  __resetTreasuryConsensusCacheForTests,
  readTreasurySolBalance,
} from '@/features/treasury/server/consensus-balance';
// eslint-disable-next-line import/first
import { verifyDonationTransaction } from '@/features/donations/verification';
// eslint-disable-next-line import/first
import { getConnection, getSolanaConsensus } from '@/lib/solana';
// eslint-disable-next-line import/first
import { logger } from '@/lib/logger';

const getSolanaConsensusMock = vi.mocked(getSolanaConsensus);
const getConnectionMock = vi.mocked(getConnection);

function fakeTreasuryPubkey(): PublicKey {
  return { __marker: 'treasury-pubkey' } as unknown as PublicKey;
}

type TreasuryVerifyFn = (
  operation: (connection: Connection) => Promise<number>,
  opts: { label: string; compare?: (a: number, b: number) => boolean }
) => Promise<number>;

interface MockTreasuryVerifier {
  verify: TreasuryVerifyFn;
}

describe('Consensus — treasury balance', () => {
  beforeEach(() => {
    __resetTreasuryConsensusCacheForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves last-known-good with stale=true when providers disagree on lamports', async () => {
    // Step 1: warm the cache via a successful agreeing call.
    const agreeingVerifier: MockTreasuryVerifier = {
      verify: vi.fn().mockResolvedValue(9_000),
    };
    getSolanaConsensusMock.mockReturnValue(agreeingVerifier as never);
    const warm = await readTreasurySolBalance(fakeTreasuryPubkey());
    expect(warm).toEqual({ balance: 9_000, stale: false });

    // Step 2: next call disagrees — graceful-degrade must kick in.
    const disagreeingVerifier: MockTreasuryVerifier = {
      verify: vi
        .fn()
        .mockRejectedValue(
          new ConsensusError('consensus disagreement', 'treasury.getBalance', [])
        ),
    };
    getSolanaConsensusMock.mockReturnValue(disagreeingVerifier as never);

    const stale = await readTreasurySolBalance(fakeTreasuryPubkey());
    expect(stale).toEqual({ balance: 9_000, stale: true });

    // The graceful-degrade path must log the disagreement — that log line
    // is the security signal operators rely on.
    expect(logger.error).toHaveBeenCalledWith(
      'Treasury: consensus disagreement — serving last-known-good with stale=true',
      expect.objectContaining({ label: 'treasury.getBalance' })
    );
    // And the direct-connection path must NOT have been used when consensus
    // is available.
    expect(getConnectionMock).not.toHaveBeenCalled();
  });
});

const FROM_WALLET = 'FromWalletPubkey11111111111111111111111111111';
const TO_WALLET = 'ToWalletPubkey111111111111111111111111111111';
const TX_SIG = 'TxSig11111111111111111111111111111111111111111';

type DonationVerifyFn = (
  operation: (
    connection: Connection
  ) => Promise<ParsedTransactionWithMeta | null>,
  opts: {
    label: string;
    compare?: (
      a: ParsedTransactionWithMeta | null,
      b: ParsedTransactionWithMeta | null
    ) => boolean;
  }
) => Promise<ParsedTransactionWithMeta | null>;

interface MockDonationVerifier {
  verify: DonationVerifyFn;
}

describe('Consensus — donation verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a fail-closed result when providers disagree on tx confirmation', async () => {
    const verifier: MockDonationVerifier = {
      verify: vi
        .fn()
        .mockRejectedValue(
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
});

// --- Audit-writer failure must not mask the security signal -------------

describe('Consensus — audit writer resilience', () => {
  beforeEach(() => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
    vi.restoreAllMocks();
  });

  it('still throws ConsensusError when the audit writer itself fails; logs the audit-write failure separately', async () => {
    const primary = makeProvider('primary');
    const secondary = makeProvider('secondary');
    const pool = makePool([primary, secondary]);
    const auditErr = new Error('audit sink unavailable');
    const failingWriter: AuditLogWriter = {
      write: () => Promise.reject(auditErr),
    };

    // We mocked `@/lib/logger` at module scope above, so `logger.error` is
    // already a `vi.fn()`. Reset it to assert on this test's calls only.
    vi.mocked(logger.error).mockClear();

    const verifier = new ConsensusVerifier([primary, secondary], pool, {
      auditLog: failingWriter,
    });

    await expect(
      verifier.verify<boolean>(
        (connection) => Promise.resolve(providerNameOf(connection) === 'primary'),
        { label: 'audit-fail.boolean', compare: compareBoolean }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'audit-fail.boolean',
      message: 'consensus disagreement',
    });

    expect(logger.error).toHaveBeenCalledWith(
      'rpc.consensus_audit_write_failed',
      expect.objectContaining({ label: 'audit-fail.boolean', error: auditErr })
    );
  });
});
