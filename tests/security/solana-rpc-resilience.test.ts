/**
 * End-to-end security coverage for /api/solana/* proxy routes.
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §11.
 *
 * - Pool exhaustion surfaces stale cache with `stale: true`, never a fresh zero.
 * - Consensus disagreement on /is-holder fail-closes with 503.
 * - Consensus disagreement on /tx-status?consensus=true fail-closes with 503.
 * - /is-holder rejects anonymous callers with 401 (prevents holder enumeration).
 * - Middleware rate-limit policy covers every /api/solana/* route.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';

// ConsensusError kept real across all three consumer routes.
vi.mock('@/lib/solana', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/solana')>('@/lib/solana');
  return {
    ...actual,
    getTokenBalance: vi.fn(),
    getSolanaConsensus: vi.fn(),
    isOrgHolder: vi.fn(),
    isOrgHolderUsingConnection: vi.fn(),
    getConnection: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  ConsensusError,
  getTokenBalance,
  getSolanaConsensus,
  isOrgHolderUsingConnection,
} from '@/lib/solana';
import { createClient } from '@/lib/supabase/server';
import { __resetStaleCacheForTests } from '@/app/api/solana/token-balance/stale-cache';
import { GET as tokenBalanceGET } from '@/app/api/solana/token-balance/route';
import { GET as isHolderGET } from '@/app/api/solana/is-holder/route';
import { GET as txStatusGET } from '@/app/api/solana/tx-status/route';

const VALID_WALLET = '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6';
const VALID_SIG =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

function buildRequest(
  path: string,
  query: Record<string, string> = {}
): NextRequest {
  const url = new URL(`http://test.local${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

type AuthedUser = { id: string } | null;
function mockAuth(user: AuthedUser): void {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.mocked(getTokenBalance).mockReset();
  vi.mocked(getSolanaConsensus).mockReset();
  vi.mocked(isOrgHolderUsingConnection).mockReset();
  vi.mocked(createClient).mockReset();
  __resetStaleCacheForTests();
});

describe('Solana RPC resilience — spec §11 security matrix', () => {
  describe('/api/solana/token-balance', () => {
    it('surfaces stale cache with stale=true when pool exhausts after a warm hit', async () => {
      // Warm the cache.
      vi.mocked(getTokenBalance).mockResolvedValueOnce(777);
      await tokenBalanceGET(
        buildRequest('/api/solana/token-balance', { wallet: VALID_WALLET })
      );
      // Pool exhausts on the follow-up call.
      vi.mocked(getTokenBalance).mockRejectedValueOnce(
        new Error('all providers exhausted')
      );
      const res = await tokenBalanceGET(
        buildRequest('/api/solana/token-balance', { wallet: VALID_WALLET })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.balance).toBe(777);
      expect(body.data.stale).toBe(true);
      // Critical: stale responses must not be CDN-cached.
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns 500 (not a fresh zero) when pool exhausts with no cached value', async () => {
      vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('exhausted'));
      const res = await tokenBalanceGET(
        buildRequest('/api/solana/token-balance', { wallet: VALID_WALLET })
      );
      expect(res.status).toBe(500);
      // Must NOT return `balance: 0` — that would be silently mis-reporting on-chain state.
      const body = await res.json();
      expect(body.data).toBeNull();
    });
  });

  describe('/api/solana/is-holder', () => {
    it('rejects anonymous callers with 401 (prevents holder enumeration)', async () => {
      mockAuth(null);
      const res = await isHolderGET(
        buildRequest('/api/solana/is-holder', { wallet: VALID_WALLET })
      );
      expect(res.status).toBe(401);
      // Auth gate must run BEFORE isOrgHolderUsingConnection — no RPC call on anon.
      expect(isOrgHolderUsingConnection).not.toHaveBeenCalled();
    });

    it('fail-closes with 503 on consensus disagreement (lying provider)', async () => {
      mockAuth({ id: 'user-1' });
      const verifier = {
        verify: vi
          .fn()
          .mockRejectedValueOnce(
            new ConsensusError(
              'providers returned different holder status',
              'isOrgHolder.proxy',
              []
            )
          ),
      };
      vi.mocked(getSolanaConsensus).mockReturnValue(
        verifier as unknown as ReturnType<typeof getSolanaConsensus>
      );
      const res = await isHolderGET(
        buildRequest('/api/solana/is-holder', { wallet: VALID_WALLET })
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.data).toBeNull();
    });
  });

  describe('/api/solana/tx-status', () => {
    it('fail-closes with 503 when ?consensus=true and providers disagree', async () => {
      const verifier = {
        verify: vi
          .fn()
          .mockRejectedValueOnce(
            new ConsensusError(
              'providers returned different tx confirmation',
              'tx-status.proxy',
              []
            )
          ),
      };
      vi.mocked(getSolanaConsensus).mockReturnValue(
        verifier as unknown as ReturnType<typeof getSolanaConsensus>
      );
      const res = await txStatusGET(
        buildRequest('/api/solana/tx-status', {
          signature: VALID_SIG,
          consensus: 'true',
        })
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.data).toBeNull();
    });
  });

  describe('middleware rate-limit registry', () => {
    // Source-grep assertion (spec §11 fallback since there's no middleware test harness).
    // Ensures every /api/solana/* route is covered by the new solana-proxy buckets.
    it('every new /api/solana/* route appears in the middleware rate-limit policy', () => {
      const middleware = readFileSync('src/middleware.ts', 'utf-8');
      // is-holder uses the user-scoped bucket.
      expect(middleware).toContain('/api/solana/is-holder');
      expect(middleware).toContain('solanaProxyUser');
      // IP-scoped path prefix covers token-balance, holder-count, tx-status.
      expect(middleware).toContain('/api/solana/');
      expect(middleware).toContain('solanaProxy');
    });
  });
});
