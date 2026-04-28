import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAnonClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createClient, createAnonClient } from '@/lib/supabase/server';
import { GET } from '../route';

/**
 * Build a tiny chainable Supabase mock. Every call returns either:
 * - another chainable proxy (for non-terminal builder methods)
 * - the configured terminal result when awaited (for the leaf Promise)
 */
function chainable(terminalResult: unknown) {
  const proxy: Record<string | symbol, unknown> = {};
  const handler: ProxyHandler<typeof proxy> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => unknown) => resolve(terminalResult);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy(proxy, handler);
}

function buildAnonStub(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    sprints: { data: [], error: null },
    tasks: { data: [], error: null },
    activity_log: { data: [], error: null, count: 0 },
    proposals: { data: null, count: 3, error: null },
    user_profiles: { data: [], error: null },
  };
  const results = { ...defaults, ...overrides };
  return {
    from: (table: string) => chainable(results[table] ?? { data: [], error: null }),
  };
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard payload for anonymous users with myContributions=null', async () => {
    vi.mocked(createAnonClient).mockReturnValue(buildAnonStub() as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.sprint).toBeNull();
    expect(body.data.myContributions).toBeNull();
    expect(body.data.stats.openProposals).toBe(3);
    expect(Array.isArray(body.data.activityDigest)).toBe(true);
  });

  it('returns myContributions object when authenticated', async () => {
    vi.mocked(createAnonClient).mockReturnValue(buildAnonStub() as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
      },
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.myContributions).toEqual({
      tasksDone: 0,
      pointsEarned: 0,
      xpEarned: 0,
      nextTaskHref: null,
    });
  });
});
