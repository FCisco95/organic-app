import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createAnonClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createAnonClient } from '@/lib/supabase/server';
import { GET } from '../route';

describe('GET /api/presence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts distinct active actors in the 5-minute window', async () => {
    vi.mocked(createAnonClient).mockReturnValue({
      from: () => ({
        select: () => ({
          gte: () => ({
            not: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { actor_id: 'a', created_at: '2026-04-28T12:00:01Z' },
                    { actor_id: 'b', created_at: '2026-04-28T12:00:00Z' },
                    { actor_id: 'a', created_at: '2026-04-28T11:59:55Z' },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.activeCount).toBe(2);
    expect(body.data.lastActivityAt).toBe('2026-04-28T12:00:01Z');
  });

  it('returns 0 active when no rows', async () => {
    vi.mocked(createAnonClient).mockReturnValue({
      from: () => ({
        select: () => ({
          gte: () => ({
            not: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.activeCount).toBe(0);
    expect(body.data.lastActivityAt).toBeNull();
  });

  it('returns 500 on db error', async () => {
    vi.mocked(createAnonClient).mockReturnValue({
      from: () => ({
        select: () => ({
          gte: () => ({
            not: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
            }),
          }),
        }),
      }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
