import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createClient } from '@/lib/supabase/server';

type ProfileRow = { id: string; organic_id: number | null };
type TaskRow = { id: string; status: string; sprint_id: string | null };
type ExistingVoteRow = { id: string; value: number } | null;
type TaskSnapshotRow = { id: string; upvotes: number; downvotes: number };

interface ClientFixture {
  user: { id: string } | null;
  profile: ProfileRow | null;
  task: TaskRow | null;
  existingVote: ExistingVoteRow;
  snapshot: TaskSnapshotRow;
  upsertError?: unknown;
  deleteError?: unknown;
}

function buildClient(fixture: ClientFixture) {
  const upsertFn = vi.fn().mockResolvedValue({ error: fixture.upsertError ?? null });
  const deleteEqEq = vi.fn().mockResolvedValue({ error: fixture.deleteError ?? null });
  const deleteEq = vi.fn().mockReturnValue({ eq: deleteEqEq });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

  const from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: fixture.profile,
              error: fixture.profile ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    if (table === 'tasks') {
      // Two reads occur: initial select + snapshot select. Both return matching data.
      return {
        select: vi.fn().mockImplementation((cols: string) => ({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              cols.includes('upvotes')
                ? { data: fixture.snapshot, error: null }
                : { data: fixture.task, error: fixture.task ? null : { message: 'not found' } },
            ),
          }),
        })),
      };
    }
    if (table === 'backlog_votes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: fixture.existingVote, error: null }),
            }),
          }),
        }),
        upsert: upsertFn,
        delete: deleteFn,
      };
    }
    return { select: vi.fn() };
  });

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: fixture.user },
          error: fixture.user ? null : { message: 'no session' },
        }),
      },
      from,
    },
    spies: { upsertFn, deleteFn, deleteEqEq },
  };
}

function jsonRequest(body: unknown): Request {
  return new Request('http://test/api/tasks/task-1/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/tasks/[id]/vote', () => {
  it('returns 400 on invalid body', async () => {
    const fx = buildClient({
      user: { id: 'user-1' },
      profile: { id: 'user-1', organic_id: 42 },
      task: { id: 'task-1', status: 'backlog', sprint_id: null },
      existingVote: null,
      snapshot: { id: 'task-1', upvotes: 0, downvotes: 0 },
    });
    vi.mocked(createClient).mockResolvedValue(fx.client as never);
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'wat' }) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('casts an upvote and returns the new score', async () => {
    const fx = buildClient({
      user: { id: 'user-1' },
      profile: { id: 'user-1', organic_id: 42 },
      task: { id: 'task-1', status: 'backlog', sprint_id: null },
      existingVote: null,
      snapshot: { id: 'task-1', upvotes: 1, downvotes: 0 },
    });
    vi.mocked(createClient).mockResolvedValue(fx.client as never);
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.my_vote).toBe(1);
    expect(json.data.task_id).toBe('task-1');
    expect(json.data.upvotes).toBe(1);
    expect(fx.spies.upsertFn).toHaveBeenCalledOnce();
  });

  it('toggles vote off when same value is re-submitted', async () => {
    const fx = buildClient({
      user: { id: 'user-1' },
      profile: { id: 'user-1', organic_id: 42 },
      task: { id: 'task-1', status: 'backlog', sprint_id: null },
      existingVote: { id: 'v-1', value: 1 },
      snapshot: { id: 'task-1', upvotes: 0, downvotes: 0 },
    });
    vi.mocked(createClient).mockResolvedValue(fx.client as never);
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.my_vote).toBe(0);
    expect(fx.spies.deleteEqEq).toHaveBeenCalledOnce();
    expect(fx.spies.upsertFn).not.toHaveBeenCalled();
  });

  it('switches vote from up to down', async () => {
    const fx = buildClient({
      user: { id: 'user-1' },
      profile: { id: 'user-1', organic_id: 42 },
      task: { id: 'task-1', status: 'backlog', sprint_id: null },
      existingVote: { id: 'v-1', value: 1 },
      snapshot: { id: 'task-1', upvotes: 0, downvotes: 1 },
    });
    vi.mocked(createClient).mockResolvedValue(fx.client as never);
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'down' }) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.my_vote).toBe(-1);
    expect(fx.spies.upsertFn).toHaveBeenCalledOnce();
  });

  it("clears vote when value='none' is sent", async () => {
    const fx = buildClient({
      user: { id: 'user-1' },
      profile: { id: 'user-1', organic_id: 42 },
      task: { id: 'task-1', status: 'backlog', sprint_id: null },
      existingVote: { id: 'v-1', value: 1 },
      snapshot: { id: 'task-1', upvotes: 0, downvotes: 0 },
    });
    vi.mocked(createClient).mockResolvedValue(fx.client as never);
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'none' }) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.my_vote).toBe(0);
    expect(fx.spies.deleteEqEq).toHaveBeenCalledOnce();
  });
});
