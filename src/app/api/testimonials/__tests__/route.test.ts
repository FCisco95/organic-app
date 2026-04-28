import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAnonClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createClient, createAnonClient } from '@/lib/supabase/server';
import { GET, POST } from '../route';

function buildRequest(body: unknown, opts: { method?: string } = {}): Request {
  return new Request('http://test.local/api/testimonials', {
    method: opts.method ?? 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function chainable(terminalResult: unknown) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => unknown) => resolve(terminalResult);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

describe('GET /api/testimonials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns approved testimonials with member info', async () => {
    const tableHandlers: Record<string, unknown> = {
      testimonials: {
        data: [
          {
            id: 'tst-1',
            rating: 5,
            quote: 'Great community',
            approved_at: '2026-04-28T00:00:00Z',
            member_id: 'user-1',
          },
        ],
        error: null,
      },
      user_profiles: {
        data: [
          { id: 'user-1', name: 'Alice', organic_id: 1, avatar_url: null },
        ],
        error: null,
      },
    };
    vi.mocked(createAnonClient).mockReturnValue({
      from: (table: string) => chainable(tableHandlers[table] ?? { data: [], error: null }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].member.name).toBe('Alice');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(createAnonClient).mockReturnValue({
      from: () => chainable({ data: null, error: { message: 'boom' } }),
    } as never);
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/testimonials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as never);
    const res = await POST(buildRequest({ rating: 5, quote: 'Hello world!' }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid input with 400', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      },
    } as never);
    const res = await POST(buildRequest({ rating: 99, quote: 'x' }));
    expect(res.status).toBe(400);
  });

  it('rejects with 429 when member submitted in last 30 days', async () => {
    const tableHandlers: Record<string, unknown> = {
      testimonials: { data: [{ id: 'recent-1', created_at: '2026-04-01T00:00:00Z' }], error: null },
    };
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: (table: string) => chainable(tableHandlers[table] ?? { data: [], error: null }),
    } as never);
    const res = await POST(buildRequest({ rating: 5, quote: 'Solid community work' }));
    expect(res.status).toBe(429);
  });

  it('inserts pending testimonial when valid + within rate limit', async () => {
    const insertSpy = vi.fn(() => Promise.resolve({ error: null }));
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: (table: string) => {
        if (table === 'testimonials') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
            insert: insertSpy,
          };
        }
        return chainable({ data: [], error: null });
      },
    } as never);

    const res = await POST(
      buildRequest({ rating: 5, quote: 'Solid community contributions' })
    );
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalled();
    const calls = insertSpy.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const insertArg = calls[0]?.[0];
    expect(insertArg?.member_id).toBe('user-1');
    expect(insertArg?.status).toBe('pending');
  });
});
