import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';

// Partial mock — keep ConsensusError class real so instanceof works.
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
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  ConsensusError,
  getSolanaConsensus,
  getConnection,
} from '@/lib/solana';
import { GET } from '../route';

const VALID_SIG =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

function buildRequest(query: Record<string, string>): NextRequest {
  const url = new URL('http://test.local/api/solana/tx-status');
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function fakeTx(
  overrides: Partial<ParsedTransactionWithMeta> = {}
): ParsedTransactionWithMeta {
  return {
    slot: 42,
    blockTime: 1_700_000_000,
    meta: {
      err: null,
      fee: 5000,
      innerInstructions: [],
      logMessages: [],
      postBalances: [],
      preBalances: [],
    },
    transaction: {
      message: { accountKeys: [], instructions: [] },
      signatures: [],
    },
    ...overrides,
  } as ParsedTransactionWithMeta;
}

beforeEach(() => {
  vi.mocked(getSolanaConsensus).mockReset();
  vi.mocked(getConnection).mockReset();
});

describe('GET /api/solana/tx-status', () => {
  it('returns 400 on missing signature', async () => {
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed signature', async () => {
    const res = await GET(buildRequest({ signature: 'too-short' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with tx summary on pool.call path (no consensus flag)', async () => {
    vi.mocked(getConnection).mockReturnValue({
      getParsedTransaction: vi.fn().mockResolvedValueOnce(fakeTx()),
    } as unknown as ReturnType<typeof getConnection>);
    const res = await GET(buildRequest({ signature: VALID_SIG }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({
      slot: 42,
      status: 'finalized',
      block_time: 1_700_000_000,
    });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns {status: not_found} when tx is null', async () => {
    vi.mocked(getConnection).mockReturnValue({
      getParsedTransaction: vi.fn().mockResolvedValueOnce(null),
    } as unknown as ReturnType<typeof getConnection>);
    const res = await GET(buildRequest({ signature: VALID_SIG }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ status: 'not_found' });
  });

  it('uses consensus path when ?consensus=true and returns tx summary on agreement', async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValueOnce(fakeTx({ slot: 99 })),
    };
    vi.mocked(getSolanaConsensus).mockReturnValue(
      verifier as unknown as ReturnType<typeof getSolanaConsensus>
    );
    const res = await GET(
      buildRequest({ signature: VALID_SIG, consensus: 'true' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.slot).toBe(99);
    expect(body.data.status).toBe('finalized');
    expect(verifier.verify).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ label: 'tx-status.proxy' })
    );
    // Non-consensus path must not have been taken.
    expect(getConnection).not.toHaveBeenCalled();
  });

  it('returns 503 when ?consensus=true and providers disagree', async () => {
    const verifier = {
      verify: vi
        .fn()
        .mockRejectedValueOnce(
          new ConsensusError('providers disagree', 'tx-status.proxy', [])
        ),
    };
    vi.mocked(getSolanaConsensus).mockReturnValue(
      verifier as unknown as ReturnType<typeof getSolanaConsensus>
    );
    const res = await GET(
      buildRequest({ signature: VALID_SIG, consensus: 'true' })
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it('returns status=failed when tx.meta.err is set', async () => {
    vi.mocked(getConnection).mockReturnValue({
      getParsedTransaction: vi.fn().mockResolvedValueOnce(
        fakeTx({
          meta: {
            err: { InstructionError: [0, { Custom: 1 }] },
            fee: 5000,
            innerInstructions: [],
            logMessages: [],
            postBalances: [],
            preBalances: [],
          },
        })
      ),
    } as unknown as ReturnType<typeof getConnection>);
    const res = await GET(buildRequest({ signature: VALID_SIG }));
    const body = await res.json();
    expect(body.data.status).toBe('failed');
  });

  it("returns status='unknown' when tx.meta is null (pruned metadata)", async () => {
    vi.mocked(getConnection).mockReturnValue({
      getParsedTransaction: vi.fn().mockResolvedValueOnce(fakeTx({ meta: null })),
    } as unknown as ReturnType<typeof getConnection>);
    const res = await GET(buildRequest({ signature: VALID_SIG }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('unknown');
    expect(body.data.slot).toBe(42);
  });
});
