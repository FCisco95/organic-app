import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Connection } from '@solana/web3.js';
import type { RpcProvider } from '../providers';
import { RpcPool } from '../rpc-pool';
import {
  ConsensusError,
  ConsensusVerifier,
  compareBoolean,
  compareHolderSet,
  compareLamports,
  compareTxConfirmation,
  defaultAuditLogWriter,
  type AuditLogWriter,
} from '../rpc-consensus';
import { logger } from '@/lib/logger';

function mockProvider(name: string, marker: string): RpcProvider {
  return {
    name,
    tier: 'primary',
    timeoutMs: 500,
    connection: { __pn: marker } as unknown as Connection,
  };
}

function connMarker(conn: Connection): string {
  return (conn as unknown as { __pn: string }).__pn;
}

function makePool(providers: ReadonlyArray<RpcProvider>): RpcPool {
  return new RpcPool(providers);
}

function makeAuditWriter(): AuditLogWriter & { writes: Array<Parameters<AuditLogWriter['write']>[0]> } {
  const writes: Array<Parameters<AuditLogWriter['write']>[0]> = [];
  return {
    writes,
    async write(row) {
      writes.push(row);
    },
  };
}

describe('ConsensusVerifier.verify — flag gating', () => {
  beforeEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
  });

  afterEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
    vi.restoreAllMocks();
  });

  it('delegates to pool.call when SOLANA_RPC_CONSENSUS_ENABLED is unset', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const spy = vi.spyOn(pool, 'call').mockResolvedValue('pool-answer');

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });
    const result = await verifier.verify(async () => 'op-answer', {
      label: 'test.op',
      timeoutMs: 1234,
    });

    expect(result).toBe('pool-answer');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), { label: 'test.op', timeoutMs: 1234 });
    expect(audit.writes).toHaveLength(0);
  });

  it("delegates to pool.call when flag is 'false'", async () => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'false';
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const spy = vi.spyOn(pool, 'call').mockResolvedValue(7);

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });
    const result = await verifier.verify(async () => 42, { label: 'test.off' });

    expect(result).toBe(7);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(audit.writes).toHaveLength(0);
  });

  it("delegates to pool.call with WARN log when flag is 'true' but only 1 provider configured", async () => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'true';
    const providers = [mockProvider('primary', 'primary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const poolSpy = vi.spyOn(pool, 'call').mockResolvedValue('single');

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });
    const result = await verifier.verify(async () => 'ignored', { label: 'test.single' });

    expect(result).toBe('single');
    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'rpc.consensus_skipped_single_provider',
      expect.objectContaining({ label: 'test.single', providers: 1, minProviders: 2 })
    );
    expect(audit.writes).toHaveLength(0);
  });
});

describe('ConsensusVerifier.verify — consensus path', () => {
  beforeEach(() => {
    process.env.SOLANA_RPC_CONSENSUS_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.SOLANA_RPC_CONSENSUS_ENABLED;
    vi.restoreAllMocks();
  });

  it('returns the agreed value when 2 providers both return true', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const poolSpy = vi.spyOn(pool, 'call');

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });
    const result = await verifier.verify(
      async (conn) => {
        const marker = connMarker(conn);
        return marker === 'primary' || marker === 'secondary';
      },
      { label: 'test.agree', compare: compareBoolean }
    );

    expect(result).toBe(true);
    expect(audit.writes).toHaveLength(0);
    expect(poolSpy).not.toHaveBeenCalled();
  });

  it('throws ConsensusError and writes audit log when 2 providers disagree (boolean)', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const fixedNow = new Date('2026-04-22T12:00:00.000Z').getTime();

    const verifier = new ConsensusVerifier(providers, pool, {
      auditLog: audit,
      now: () => fixedNow,
    });

    await expect(
      verifier.verify(
        async (conn) => connMarker(conn) === 'primary',
        { label: 'test.disagree', compare: compareBoolean }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'test.disagree',
      message: 'consensus disagreement',
    });

    expect(audit.writes).toHaveLength(1);
    const row = audit.writes[0];
    expect(row.event).toBe('rpc.consensus_disagreement');
    expect(row.label).toBe('test.disagree');
    expect(row.payload.capturedAt).toBe('2026-04-22T12:00:00.000Z');
    expect(row.payload.providers).toEqual([
      { name: 'primary', ok: true, value: true },
      { name: 'secondary', ok: true, value: false },
    ]);
  });

  it('throws ConsensusError("insufficient providers responded") when one provider throws (<minProviders success)', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();
    const boom = new Error('provider down');

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });

    await expect(
      verifier.verify(
        async (conn) => {
          if (connMarker(conn) === 'primary') throw boom;
          return true;
        },
        { label: 'test.insufficient', compare: compareBoolean }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'test.insufficient',
      message: 'insufficient providers responded',
    });

    // Insufficient is a pool health signal, not a disagreement — no audit write.
    expect(audit.writes).toHaveLength(0);
  });

  it('throws ConsensusError("consensus disagreement") when 3 providers split 2-1 (any pair mismatch fails)', async () => {
    const providers = [
      mockProvider('primary', 'primary'),
      mockProvider('secondary', 'secondary'),
      mockProvider('fallback', 'fallback'),
    ];
    const pool = makePool(providers);
    const audit = makeAuditWriter();

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });

    await expect(
      verifier.verify(
        async (conn) => connMarker(conn) !== 'fallback',
        { label: 'test.split', compare: compareBoolean }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'test.split',
      message: 'consensus disagreement',
    });

    expect(audit.writes).toHaveLength(1);
    expect(audit.writes[0].payload.providers).toEqual([
      { name: 'primary', ok: true, value: true },
      { name: 'secondary', ok: true, value: true },
      { name: 'fallback', ok: true, value: false },
    ]);
  });

  it('treats per-provider timeout as a failed response (pushes into insufficient path)', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const audit = makeAuditWriter();

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: audit });

    await expect(
      verifier.verify(
        (conn) => {
          if (connMarker(conn) === 'primary') {
            return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 200));
          }
          return Promise.reject(new Error('down'));
        },
        { label: 'test.timeout', compare: compareBoolean, timeoutMs: 25 }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      label: 'test.timeout',
      message: 'insufficient providers responded',
    });

    expect(audit.writes).toHaveLength(0);
  });

  it('still throws ConsensusError when audit writer throws; logs rpc.consensus_audit_write_failed', async () => {
    const providers = [mockProvider('primary', 'primary'), mockProvider('secondary', 'secondary')];
    const pool = makePool(providers);
    const auditErr = new Error('audit down');
    const failingAudit: AuditLogWriter = {
      write: () => Promise.reject(auditErr),
    };
    const errSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const verifier = new ConsensusVerifier(providers, pool, { auditLog: failingAudit });

    await expect(
      verifier.verify(
        async (conn) => connMarker(conn) === 'primary',
        { label: 'test.audit-fail', compare: compareBoolean }
      )
    ).rejects.toMatchObject({
      name: 'ConsensusError',
      message: 'consensus disagreement',
      label: 'test.audit-fail',
    });

    expect(errSpy).toHaveBeenCalledWith(
      'rpc.consensus_audit_write_failed',
      expect.objectContaining({ label: 'test.audit-fail', error: auditErr })
    );
  });
});

describe('ConsensusError', () => {
  it('has name "ConsensusError", is Error instance, and exposes label + results', () => {
    const results = [
      { provider: 'primary', ok: true, value: 1 },
      { provider: 'secondary', ok: false, error: new Error('x') },
    ];
    const err = new ConsensusError('some message', 'test.label', results);
    expect(err.name).toBe('ConsensusError');
    expect(err).toBeInstanceOf(Error);
    expect(err.label).toBe('test.label');
    expect(err.results).toEqual(results);
    expect(err.message).toBe('some message');
  });
});

describe('compareBoolean', () => {
  it('returns true for matching booleans', () => {
    expect(compareBoolean(true, true)).toBe(true);
    expect(compareBoolean(false, false)).toBe(true);
  });

  it('returns false for mismatched booleans', () => {
    expect(compareBoolean(true, false)).toBe(false);
    expect(compareBoolean(false, true)).toBe(false);
  });
});

describe('compareLamports', () => {
  it('compares two bigints exactly', () => {
    expect(compareLamports(1n, 1n)).toBe(true);
    expect(compareLamports(1n, 2n)).toBe(false);
  });

  it('coerces number to bigint when comparing mixed inputs', () => {
    expect(compareLamports(1, 1n)).toBe(true);
    expect(compareLamports(1n, 1)).toBe(true);
  });

  it('handles large-but-safe number values converted to bigint', () => {
    const n = 100_000_000_000_000;
    expect(compareLamports(BigInt(n), n)).toBe(true);
    expect(compareLamports(BigInt(n), n + 1)).toBe(false);
  });

  it('returns false for mismatched lamport counts', () => {
    expect(compareLamports(100, 101)).toBe(false);
  });
});

describe('compareHolderSet', () => {
  it('returns true for same holders in different order', () => {
    const a = [
      { address: 'alice', balance: 5 },
      { address: 'bob', balance: 2 },
    ];
    const b = [
      { address: 'bob', balance: 2 },
      { address: 'alice', balance: 5 },
    ];
    expect(compareHolderSet(a, b)).toBe(true);
  });

  it('returns false for different members', () => {
    const a = [{ address: 'alice', balance: 5 }];
    const b = [{ address: 'bob', balance: 5 }];
    expect(compareHolderSet(a, b)).toBe(false);
  });

  it('returns true for two empty sets', () => {
    expect(compareHolderSet([], [])).toBe(true);
  });

  it('sums duplicate owners before comparison (dedup-by-owner normalization)', () => {
    const a = [
      { address: 'alice', balance: 5 },
      { address: 'alice', balance: 5 },
    ];
    const b = [{ address: 'alice', balance: 10 }];
    expect(compareHolderSet(a, b)).toBe(true);
  });

  it('returns false comparing empty vs non-empty', () => {
    expect(compareHolderSet([], [{ address: 'alice', balance: 1 }])).toBe(false);
    expect(compareHolderSet([{ address: 'alice', balance: 1 }], [])).toBe(false);
  });
});

describe('compareTxConfirmation', () => {
  it('returns true when both are null', () => {
    expect(compareTxConfirmation(null, null)).toBe(true);
  });

  it('returns true for same slot and confirmed status', () => {
    expect(
      compareTxConfirmation(
        { slot: 100, status: 'confirmed' },
        { slot: 100, status: 'confirmed' }
      )
    ).toBe(true);
  });

  it('returns true for same slot, one confirmed one finalized (both in allowed set)', () => {
    expect(
      compareTxConfirmation(
        { slot: 100, status: 'confirmed' },
        { slot: 100, status: 'finalized' }
      )
    ).toBe(true);
  });

  it('returns false when slots differ', () => {
    expect(
      compareTxConfirmation(
        { slot: 100, status: 'confirmed' },
        { slot: 101, status: 'confirmed' }
      )
    ).toBe(false);
  });

  it('returns false when status is "processed" (outside allowed set)', () => {
    expect(
      compareTxConfirmation(
        { slot: 100, status: 'processed' },
        { slot: 100, status: 'confirmed' }
      )
    ).toBe(false);
  });

  it('returns false when one is null and other is not', () => {
    expect(compareTxConfirmation(null, { slot: 100, status: 'confirmed' })).toBe(false);
    expect(compareTxConfirmation({ slot: 100, status: 'confirmed' }, null)).toBe(false);
  });
});

describe('defaultAuditLogWriter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes via logger.error with rpc.consensus_disagreement event', async () => {
    const errSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const row = {
      event: 'rpc.consensus_disagreement' as const,
      label: 'test.default',
      payload: {
        providers: [{ name: 'p1', ok: true, value: 1 }],
        capturedAt: '2026-04-22T12:00:00.000Z',
      },
    };
    await defaultAuditLogWriter.write(row);
    expect(errSpy).toHaveBeenCalledWith('rpc.consensus_disagreement', row);
  });
});
