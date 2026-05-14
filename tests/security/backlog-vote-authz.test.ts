import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createClient } from '@/lib/supabase/server';

function buildClient(opts: {
  user: { id: string } | null;
  profile: { id: string; organic_id: number | null } | null;
  task: { id: string; status: string; sprint_id: string | null } | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.profile,
              error: opts.profile ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    if (table === 'tasks') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opts.task,
              error: opts.task ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    if (table === 'backlog_votes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }
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

function jsonRequest(body: unknown): Request {
  return new Request('http://test/api/tasks/t-1/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Security: POST /api/tasks/[id]/vote', () => {
  it('rejects anonymous users (401)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ user: null, profile: null, task: null }) as never,
    );
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 't-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects users without organic_id (403)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'u-1' },
        profile: { id: 'u-1', organic_id: null },
        task: { id: 't-1', status: 'backlog', sprint_id: null },
      }) as never,
    );
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 't-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects votes on non-backlog tasks (409)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'u-1' },
        profile: { id: 'u-1', organic_id: 7 },
        task: { id: 't-1', status: 'in_progress', sprint_id: 's-1' },
      }) as never,
    );
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 't-1' }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects votes on tasks already assigned to a sprint (409)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'u-1' },
        profile: { id: 'u-1', organic_id: 7 },
        task: { id: 't-1', status: 'backlog', sprint_id: 's-1' },
      }) as never,
    );
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 't-1' }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects when profile is missing (404)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({
        user: { id: 'u-1' },
        profile: null,
        task: { id: 't-1', status: 'backlog', sprint_id: null },
      }) as never,
    );
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 't-1' }),
    });
    expect(res.status).toBe(404);
  });
});
