import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/engagement/dao-vote', () => ({
  sweepExpiredAppeals: vi.fn().mockResolvedValue({ resolved: 0 }),
}));

vi.mock('@/features/engagement/processing', () => ({
  pollEngagement: vi.fn().mockResolvedValue({ processed: 0 }),
}));

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }
});

function buildRequest(url: string, authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new Request(url, { method: 'GET', headers });
}

describe('GET /api/internal/engagement/appeals-sweep - cron auth gate', () => {
  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import('../engagement/appeals-sweep/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/appeals-sweep', 'Bearer anything'),
    );
    expect(res.status).toBe(503);
  });

  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'shhh';
    const { GET } = await import('../engagement/appeals-sweep/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/appeals-sweep'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when the bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'shhh';
    const { GET } = await import('../engagement/appeals-sweep/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/appeals-sweep', 'Bearer wrong'),
    );
    expect(res.status).toBe(401);
  });

  it('runs the sweep when the bearer token matches', async () => {
    process.env.CRON_SECRET = 'shhh';
    const { sweepExpiredAppeals } = await import('@/features/engagement/dao-vote');
    const { GET } = await import('../engagement/appeals-sweep/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/appeals-sweep', 'Bearer shhh'),
    );
    expect(res.status).toBe(200);
    expect(sweepExpiredAppeals).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, resolved: 0 });
    expect(body.ran_at).toBeTruthy();
  });
});

describe('GET /api/internal/engagement/poll - cron auth gate', () => {
  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'shhh';
    const { GET } = await import('../engagement/poll/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/poll'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when the bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'shhh';
    const { GET } = await import('../engagement/poll/route');
    const res = await GET(
      buildRequest('http://test/api/internal/engagement/poll', 'Bearer wrong'),
    );
    expect(res.status).toBe(401);
  });
});
