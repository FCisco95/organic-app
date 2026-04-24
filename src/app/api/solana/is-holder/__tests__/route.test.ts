import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Partial mock — keep ConsensusError class real so instanceof works.
vi.mock('@/lib/solana', async () => {
  const actual = await vi.importActual<typeof import('@/lib/solana')>(
    '@/lib/solana'
  );
  return {
    ...actual,
    getSolanaConsensus: vi.fn(),
    isOrgHolder: vi.fn(),
    isOrgHolderUsingConnection: vi.fn(),
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
  getSolanaConsensus,
  isOrgHolder,
  isOrgHolderUsingConnection,
} from '@/lib/solana';
import { createClient } from '@/lib/supabase/server';
import { GET } from '../route';

const VALID_WALLET = '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6';

function buildRequest(query: Record<string, string>): NextRequest {
  const url = new URL('http://test.local/api/solana/is-holder');
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

interface MockSupabaseReturn {
  auth: { getUser: ReturnType<typeof vi.fn> };
}

function mockSupabase(user: { id: string } | null): MockSupabaseReturn {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  };
}

type VerifyFn = (
  operation: (connection: unknown) => Promise<boolean>,
  opts: { label: string; compare?: (a: boolean, b: boolean) => boolean }
) => Promise<boolean>;

interface MockVerifier {
  verify: VerifyFn;
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(getSolanaConsensus).mockReset();
  vi.mocked(isOrgHolder).mockReset();
  vi.mocked(isOrgHolderUsingConnection).mockReset();
});

describe('GET /api/solana/is-holder', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase(null) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when supabase reports an auth error', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('session expired'),
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 on malformed wallet when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: 'user-123' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET(buildRequest({ wallet: 'not-base58!' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBe('Invalid wallet parameter');
  });

  it('returns 200 with isHolder=true and no-store when consensus agrees', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: 'user-123' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const verifier: MockVerifier = {
      verify: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(getSolanaConsensus).mockReturnValue(
      verifier as unknown as ReturnType<typeof getSolanaConsensus>
    );

    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.data).toEqual({ isHolder: true });
    expect(body.error).toBeNull();

    expect(verifier.verify).toHaveBeenCalledTimes(1);
    const callArgs = (verifier.verify as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[1]).toMatchObject({ label: 'isOrgHolder.proxy' });
    expect(typeof callArgs[1].compare).toBe('function');
    // Primary path uses the consensus-aware helper, not the cached one.
    expect(isOrgHolderUsingConnection).not.toHaveBeenCalled();
    expect(isOrgHolder).not.toHaveBeenCalled();
  });

  it('returns 503 when consensus disagrees (ConsensusError)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: 'user-123' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    vi.mocked(getSolanaConsensus).mockReturnValue({
      verify: vi
        .fn()
        .mockRejectedValue(
          new ConsensusError(
            'insufficient providers responded',
            'isOrgHolder.proxy',
            []
          )
        ),
    } as unknown as ReturnType<typeof getSolanaConsensus>);

    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toMatch(/temporarily inconsistent/i);
  });

  it('returns 500 on unexpected error from consensus.verify', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );
    const verifier = {
      verify: vi.fn().mockRejectedValue(new Error('rpc timeout')),
    };
    vi.mocked(getSolanaConsensus).mockReturnValue(
      verifier as unknown as ReturnType<typeof getSolanaConsensus>
    );
    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBe('Temporarily unavailable');
  });

  it('falls back to isOrgHolder when consensus is not configured', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: 'user-123' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    vi.mocked(getSolanaConsensus).mockReturnValue(null);
    vi.mocked(isOrgHolder).mockResolvedValueOnce(false);

    const res = await GET(buildRequest({ wallet: VALID_WALLET }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.data).toEqual({ isHolder: false });
    expect(body.error).toBeNull();

    expect(isOrgHolder).toHaveBeenCalledWith(VALID_WALLET, {
      skipCache: true,
    });
  });
});
