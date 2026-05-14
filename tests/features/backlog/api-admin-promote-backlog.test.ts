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

import { createClient, createServiceClient } from '@/lib/supabase/server';

function buildAdminClient(opts: { role: 'admin' | 'council' | 'member'; sprintStatus: string | null }) {
  const from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u-1', role: opts.role },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'sprints') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opts.sprintStatus ? { id: 's-1', status: opts.sprintStatus } : null,
              error: opts.sprintStatus ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
    from,
  };
}

function buildServiceClient(promotedIds: string[]) {
  return {
    from: vi.fn(() => ({ select: vi.fn() })),
    rpc: vi.fn().mockResolvedValue({
      data: promotedIds.map((id) => ({ promoted_task_id: id })),
      error: null,
    }),
  };
}

function jsonRequest(body: unknown): Request {
  return new Request('http://test/api/admin/sprints/s-1/promote-backlog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/admin/sprints/[id]/promote-backlog', () => {
  it('returns 400 on invalid n', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAdminClient({ role: 'admin', sprintStatus: 'planning' }) as never,
    );
    vi.mocked(createServiceClient).mockReturnValue(buildServiceClient([]) as never);
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest({ n: 0 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns the promoted task ids on success', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAdminClient({ role: 'admin', sprintStatus: 'planning' }) as never,
    );
    const service = buildServiceClient(['t-1', 't-2']);
    vi.mocked(createServiceClient).mockReturnValue(service as never);
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest({ n: 2 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.promoted_task_ids).toEqual(['t-1', 't-2']);
    expect(json.data.n_actually_promoted).toBe(2);
    expect(service.rpc).toHaveBeenCalledWith('promote_top_backlog_to_sprint', {
      p_sprint_id: 's-1',
      p_n: 2,
    });
  });

  it('idempotent: returns empty list when no candidates remain', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAdminClient({ role: 'admin', sprintStatus: 'planning' }) as never,
    );
    vi.mocked(createServiceClient).mockReturnValue(buildServiceClient([]) as never);
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest({ n: 5 }) as never, {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.promoted_task_ids).toEqual([]);
    expect(json.data.n_actually_promoted).toBe(0);
  });
});
