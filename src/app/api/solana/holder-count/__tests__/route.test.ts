import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/solana', () => ({
  getAllTokenHolders: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getAllTokenHolders } from '@/lib/solana';
import { GET } from '../route';
import { __resetHolderCountCacheForTests } from '../holder-cache';

function buildRequest(query: Record<string, string>): NextRequest {
  const url = new URL('http://test.local/api/solana/holder-count');
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const HOLDERS = [
  { address: 'A', balance: 10 },
  { address: 'B', balance: 50 },
  { address: 'C', balance: 25 },
];

beforeEach(() => {
  vi.mocked(getAllTokenHolders).mockReset();
  __resetHolderCountCacheForTests();
});

describe('GET /api/solana/holder-count', () => {
  it('returns count without top when no ?top is passed', async () => {
    vi.mocked(getAllTokenHolders).mockResolvedValueOnce(HOLDERS);
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.count).toBe(3);
    expect(body.data.top).toBeUndefined();
    expect(body.data.stale).toBe(false);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
  });

  it('returns sorted top-N when ?top=N', async () => {
    vi.mocked(getAllTokenHolders).mockResolvedValueOnce(HOLDERS);
    const res = await GET(buildRequest({ top: '2' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.count).toBe(3);
    expect(body.data.top).toEqual([
      { address: 'B', balance: 50 },
      { address: 'C', balance: 25 },
    ]);
  });

  it('rejects ?top=0 with 400', async () => {
    const res = await GET(buildRequest({ top: '0' }));
    expect(res.status).toBe(400);
    expect(vi.mocked(getAllTokenHolders)).not.toHaveBeenCalled();
  });

  it('rejects ?top=101 with 400', async () => {
    const res = await GET(buildRequest({ top: '101' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on pool exhaustion with cold cache', async () => {
    vi.mocked(getAllTokenHolders).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(500);
  });

  it('returns stale cache with stale=true when pool exhausts after a warm hit', async () => {
    vi.mocked(getAllTokenHolders).mockResolvedValueOnce(HOLDERS);
    await GET(buildRequest({ top: '2' }));
    vi.mocked(getAllTokenHolders).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({ top: '2' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.stale).toBe(true);
    expect(body.data.count).toBe(3);
    expect(body.data.top).toEqual([
      { address: 'B', balance: 50 },
      { address: 'C', balance: 25 },
    ]);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
