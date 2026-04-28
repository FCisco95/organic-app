import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/gamification/xp-service', () => ({
  awardXp: vi.fn().mockResolvedValue({ awarded: true, xpAwarded: 50, bonusApplied: false }),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { awardXp } from '@/features/gamification/xp-service';
import { GET, POST } from '../route';

function buildPostRequest(body: unknown): Request {
  return new Request('http://test.local/api/testimonials/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function buildGetRequest(): Request {
  return new Request('http://test.local/api/testimonials/admin', { method: 'GET' });
}

function buildAuthClient(opts: { user: { id: string } | null; role?: string }) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: opts.user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: opts.role ? { role: opts.role } : null,
              error: null,
            }),
        }),
      }),
    }),
  } as never;
}

describe('admin testimonials route — auth gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAuthClient({ user: null }));
    const res = await GET(buildGetRequest());
    expect(res.status).toBe(401);
  });

  it('GET returns 403 when user is a regular member', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClient({ user: { id: 'u' }, role: 'member' })
    );
    const res = await GET(buildGetRequest());
    expect(res.status).toBe(403);
  });

  it('POST returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAuthClient({ user: null }));
    const res = await POST(buildPostRequest({ testimonialId: 'x', action: 'approve' }));
    expect(res.status).toBe(401);
  });

  it('POST returns 403 when user is council but unauthorized? Actually council is admin', async () => {
    // Council is allowed; this test sanity-checks regular member rejection.
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClient({ user: { id: 'u' }, role: 'member' })
    );
    const res = await POST(
      buildPostRequest({ testimonialId: '00000000-0000-0000-0000-000000000001', action: 'approve' })
    );
    expect(res.status).toBe(403);
  });
});

describe('admin testimonials route — approve flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves a pending testimonial, awards XP, sends notification', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClient({ user: { id: 'admin-1' }, role: 'admin' })
    );

    const updateSpy = vi.fn(() => ({
      eq: () => Promise.resolve({ error: null }),
    }));
    const notificationInsertSpy = vi.fn(() => Promise.resolve({ error: null }));

    vi.mocked(createServiceClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'testimonials') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: '00000000-0000-0000-0000-000000000001',
                      member_id: 'user-1',
                      status: 'pending',
                    },
                    error: null,
                  }),
              }),
            }),
            update: updateSpy,
          };
        }
        if (table === 'notifications') {
          return { insert: notificationInsertSpy };
        }
        return {};
      },
    } as never);

    const res = await POST(
      buildPostRequest({
        testimonialId: '00000000-0000-0000-0000-000000000001',
        action: 'approve',
      })
    );
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalled();
    expect(awardXp).toHaveBeenCalled();
    expect(notificationInsertSpy).toHaveBeenCalled();
    const updateCalls = updateSpy.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const updateArg = updateCalls[0]?.[0];
    expect(updateArg?.status).toBe('approved');
    expect(updateArg?.points_awarded).toBe(50);
  });

  it('rejects an already-reviewed testimonial with 409', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClient({ user: { id: 'admin-1' }, role: 'admin' })
    );

    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  member_id: 'user-1',
                  status: 'approved',
                },
                error: null,
              }),
          }),
        }),
      }),
    } as never);

    const res = await POST(
      buildPostRequest({
        testimonialId: '00000000-0000-0000-0000-000000000001',
        action: 'approve',
      })
    );
    expect(res.status).toBe(409);
  });
});
