import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/solana', () => ({
  getTokenBalance: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getTokenBalance } from '@/lib/solana';
import { GET } from '../route';
import { __resetStaleCacheForTests } from '../stale-cache';

function buildRequest(query: Record<string, string>): NextRequest {
  const url = new URL('http://test.local/api/solana/token-balance');
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const VALID_WALLET_A = '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6';
const VALID_WALLET_B = '7Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD7';

beforeEach(() => {
  vi.mocked(getTokenBalance).mockReset();
  __resetStaleCacheForTests();
});

describe('GET /api/solana/token-balance', () => {
  it('returns 400 on missing wallet', async () => {
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 on malformed wallet', async () => {
    const res = await GET(buildRequest({ wallet: 'not-base58!' }));
    expect(res.status).toBe(400);
  });

  it('returns the balance on success with stale=false and 15s s-maxage', async () => {
    vi.mocked(getTokenBalance).mockResolvedValueOnce(42);
    const res = await GET(buildRequest({ wallet: VALID_WALLET_A }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=15');
    expect(res.headers.get('Cache-Control')).toContain('stale-while-revalidate=60');
    const body = await res.json();
    expect(body.data.balance).toBe(42);
    expect(body.data.stale).toBe(false);
  });

  it('returns stale cached balance when pool exhausts after a warm hit', async () => {
    // Warm the cache.
    vi.mocked(getTokenBalance).mockResolvedValueOnce(100);
    await GET(buildRequest({ wallet: VALID_WALLET_A }));

    // Pool exhausts on the second call.
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({ wallet: VALID_WALLET_A }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.balance).toBe(100);
    expect(body.data.stale).toBe(true);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 500 when pool exhausts with no cached balance for this wallet', async () => {
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({ wallet: VALID_WALLET_B }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.data).toBeNull();
  });
});
