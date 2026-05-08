import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createClient } from '@/lib/supabase/server';

function buildAnonClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(),
  };
}

function buildAuthedClient(userId: string, listResult: unknown[] = []) {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Final resolution for non-`.single()` chains:
    then: undefined as unknown,
  };
  // Make the builder thenable so `await supabase.from(...).select(...)...`
  // resolves. Returning data directly.
  Object.defineProperty(queryBuilder, 'then', {
    value: (resolve: (v: { data: unknown[]; error: null; count: number }) => void) =>
      resolve({ data: listResult, error: null, count: listResult.length }),
  });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn().mockReturnValue(queryBuilder),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/notifications - auth gate', () => {
  it('returns 401 when no user is in the session', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { GET } = await import('../route');
    const req = new Request('http://test/api/notifications');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('rejects malformed query parameters with 400', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthedClient('user-1') as never,
    );
    const { GET } = await import('../route');
    const req = new Request('http://test/api/notifications?limit=not-a-number');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/notifications/preferences - auth gate', () => {
  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { GET } = await import('../preferences/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/notifications/preferences - auth gate + Zod', () => {
  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { PATCH } = await import('../preferences/route');
    const req = new Request('http://test/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'tasks', in_app: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('rejects body that fails Zod validation with 400', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthedClient('user-1') as never,
    );
    const { PATCH } = await import('../preferences/route');
    const req = new Request('http://test/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'not-a-category' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid input/i);
  });

  it('rejects malformed JSON with 400', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthedClient('user-1') as never,
    );
    const { PATCH } = await import('../preferences/route');
    const req = new Request('http://test/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/notifications/[id]/read - auth gate + IDOR scope', () => {
  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { PATCH } = await import('../[id]/read/route');
    const req = new Request('http://test/api/notifications/abc/read', { method: 'PATCH' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(401);
  });

  it('scopes UPDATE to user_id = current user (IDOR guard)', async () => {
    const queryBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn().mockReturnValue(queryBuilder),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const { PATCH } = await import('../[id]/read/route');
    const req = new Request('http://test/api/notifications/n-1/read', { method: 'PATCH' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'n-1' }) });

    expect(res.status).toBe(200);
    // The .eq calls must include both id (the path param) and user_id (the
    // current user) — that's the IDOR guard preventing user A from marking
    // user B's notifications as read.
    const eqCalls = vi.mocked(queryBuilder.eq).mock.calls;
    const cols = eqCalls.map((c) => c[0]);
    expect(cols).toContain('id');
    expect(cols).toContain('user_id');
    const userIdCall = eqCalls.find((c) => c[0] === 'user_id');
    expect(userIdCall?.[1]).toBe('user-1');
  });
});
