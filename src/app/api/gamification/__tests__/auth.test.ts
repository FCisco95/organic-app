import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/gamification/burn-engine', () => ({
  burnPointsToLevelUp: vi.fn().mockResolvedValue({ leveled_up: false, level: 1 }),
}));

vi.mock('@/features/gamification/points-service', () => ({
  getWeeklyOrganicPostCount: vi.fn().mockResolvedValue(0),
  getWeeklyEngagementPoints: vi.fn().mockResolvedValue(0),
  ECONOMY_CONSTANTS: {
    FREE_ORGANIC_POSTS_PER_WEEK: 5,
    WEEKLY_ENGAGEMENT_POINTS_CAP: 100,
    NON_ORGANIC_COSTS: { meme: 10 },
    ORGANIC_COSTS: { tutorial: 5 },
  },
}));

import { createClient } from '@/lib/supabase/server';

const buildAnonClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
  },
  from: vi.fn(),
});

const buildAuthedClient = (userId: string) => {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { claimable_points: 50, total_points: 100 },
      error: null,
    }),
  };
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(profileQuery),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/user/points - auth gate', () => {
  it('returns 401 for anon caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { GET } = await import('../../user/points/route');
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('returns the points payload for an authenticated caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAuthedClient('user-1') as never);
    const { GET } = await import('../../user/points/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      claimable_points: 50,
      total_points: 100,
      weekly_organic_posts: 0,
      free_organic_remaining: 5,
      weekly_engagement_points: 0,
      weekly_engagement_cap: 100,
    });
    expect(body.costs).toBeDefined();
  });
});

describe('POST /api/gamification/burn - auth gate', () => {
  it('returns 401 for anon caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { POST } = await import('../burn/route');
    const res = await POST();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Not authenticated/i);
  });

  it('invokes burnPointsToLevelUp for an authenticated caller', async () => {
    const { burnPointsToLevelUp } = await import('@/features/gamification/burn-engine');
    vi.mocked(createClient).mockResolvedValue(buildAuthedClient('user-2') as never);
    const { POST } = await import('../burn/route');
    const res = await POST();
    expect(res.status).toBe(200);
    expect(burnPointsToLevelUp).toHaveBeenCalledWith(
      expect.anything(),
      'user-2',
    );
  });
});

describe('points-service ECONOMY_CONSTANTS contract', () => {
  it('exposes the constants the route depends on', async () => {
    const constants = await import('@/features/gamification/points-service');
    expect(constants.ECONOMY_CONSTANTS).toMatchObject({
      FREE_ORGANIC_POSTS_PER_WEEK: expect.any(Number),
      WEEKLY_ENGAGEMENT_POINTS_CAP: expect.any(Number),
      NON_ORGANIC_COSTS: expect.any(Object),
      ORGANIC_COSTS: expect.any(Object),
    });
  });
});
