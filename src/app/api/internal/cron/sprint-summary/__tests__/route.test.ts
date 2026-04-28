import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/dashboard/sprint-summary-service', () => ({
  generateSprintSummary: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { generateSprintSummary } from '@/features/dashboard/sprint-summary-service';
import { GET, POST } from '../route';

function buildRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new Request('http://test.local/api/internal/cron/sprint-summary', {
    method: 'GET',
    headers,
  });
}

describe('cron sprint-summary route — auth gate', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(buildRequest('Bearer anything'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/CRON_SECRET/);
  });

  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'shhh';
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'shhh';
    const res = await GET(buildRequest('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('processes active sprints when authorized (GET)', async () => {
    process.env.CRON_SECRET = 'shhh';
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [
                { id: 'sprint-a', status: 'active' },
                { id: 'sprint-b', status: 'review' },
              ],
              error: null,
            }),
        }),
      }),
    } as never);
    vi.mocked(generateSprintSummary).mockResolvedValue({ ok: true, model: 'claude-haiku-4-5' });

    const res = await GET(buildRequest('Bearer shhh'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(2);
    expect(generateSprintSummary).toHaveBeenCalledTimes(2);
  });

  it('POST also requires the secret', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(buildRequest('Bearer anything'));
    expect(res.status).toBe(503);
  });
});
