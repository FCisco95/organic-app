import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  applyUserRateLimit: vi.fn().mockResolvedValue(null),
  RATE_LIMITS: { sensitive: { limit: 5, windowMs: 60_000 } },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/steward', () => ({
  getStewardClient: vi.fn().mockResolvedValue({
    reviewBacklogCandidates: vi.fn().mockResolvedValue([]),
    suggestN: vi.fn().mockResolvedValue(3),
  }),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';

function buildClient(opts: {
  user: { id: string } | null;
  profile: { id: string; role: string } | null;
  sprint: { id: string; status: string } | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === 'user_profiles')
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: opts.profile, error: null }),
          }),
        }),
      };
    if (table === 'sprints')
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opts.sprint,
              error: opts.sprint ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    return { select: vi.fn() };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.user ? null : { message: 'no session' },
      }),
    },
    from,
  };
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  } as never);
});

describe('Security: POST /api/admin/sprints/[id]/promote-backlog', () => {
  it('rejects anonymous (401)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ user: null, profile: null, sprint: null }) as never,
    );
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects members (403)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'm-1' },
        profile: { id: 'm-1', role: 'member' },
        sprint: { id: 's-1', status: 'planning' },
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows admins (200)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'a-1' },
        profile: { id: 'a-1', role: 'admin' },
        sprint: { id: 's-1', status: 'planning' },
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(200);
  });

  it('allows council (200)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'c-1' },
        profile: { id: 'c-1', role: 'council' },
        sprint: { id: 's-1', status: 'planning' },
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects non-planning sprints (409)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'a-1' },
        profile: { id: 'a-1', role: 'admin' },
        sprint: { id: 's-1', status: 'active' },
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(409);
  });
});

describe('Security: POST /api/admin/steward/review-backlog', () => {
  it('rejects anonymous (401)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ user: null, profile: null, sprint: null }) as never,
    );
    const { POST } = await import('@/app/api/admin/steward/review-backlog/route');
    const res = await POST(
      jsonRequest('/api/admin/steward/review-backlog', {
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  it('rejects members (403)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'm-1' },
        profile: { id: 'm-1', role: 'member' },
        sprint: null,
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/steward/review-backlog/route');
    const res = await POST(
      jsonRequest('/api/admin/steward/review-backlog', {
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }) as never,
    );
    expect(res.status).toBe(403);
  });

  it('allows admin (200)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'a-1' },
        profile: { id: 'a-1', role: 'admin' },
        sprint: null,
      }) as never,
    );
    const { POST } = await import('@/app/api/admin/steward/review-backlog/route');
    const res = await POST(
      jsonRequest('/api/admin/steward/review-backlog', {
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }) as never,
    );
    expect(res.status).toBe(200);
  });
});
