import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/easter/elements', () => ({
  getEggElement: vi.fn().mockReturnValue('cosmic'),
}));

vi.mock('@/features/gamification/xp-service', () => ({
  awardXp: vi.fn().mockResolvedValue({ awarded: 10 }),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';

const buildAnonClient = () => ({
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  from: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/easter/egg-claim - auth gate', () => {
  it('returns 401 for anon caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { GET } = await import('../egg-claim/route');
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Not authenticated/i);
  });
});

describe('POST /api/easter/egg-claim - auth gate + Zod', () => {
  it('returns 401 for anon caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { POST } = await import('../egg-claim/route');
    const req = new Request('http://test/api/easter/egg-claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ egg_number: 1, found_on_page: '/home' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects payload that fails Zod with 400', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const { POST } = await import('../egg-claim/route');
    const req = new Request('http://test/api/easter/egg-claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ egg_number: 'not-a-number' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/easter/leaderboard - public read using service client', () => {
  it('uses createServiceClient (not createClient) for leaderboard reads', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    vi.mocked(createServiceClient).mockReturnValue(supabase as never);

    const { GET } = await import('../leaderboard/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('golden_eggs');
  });
});

describe('POST /api/easter/xp-egg-claim - auth gate', () => {
  it('returns 401 for anon caller', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAnonClient() as never);
    const { POST } = await import('../xp-egg-claim/route');
    const req = new Request('http://test/api/easter/xp-egg-claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'abc' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
