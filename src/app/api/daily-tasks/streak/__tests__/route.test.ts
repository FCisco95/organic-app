import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/gamification/streak-service', () => ({
  checkStreakMilestones: vi.fn().mockResolvedValue({ milestoneClaimed: null }),
}));

import { createClient } from '@/lib/supabase/server';
import { checkStreakMilestones } from '@/features/gamification/streak-service';
import { POST } from '../route';
import {
  computeNextStreak,
  dayDiff,
  localDateIn,
} from '@/features/daily-tasks/streak-logic';

const USER_ID = '00000000-0000-0000-0000-00000000abcd';

describe('streak pure logic', () => {
  it('dayDiff handles consecutive days and gaps', () => {
    expect(dayDiff('2026-04-22', '2026-04-23')).toBe(1);
    expect(dayDiff('2026-04-20', '2026-04-23')).toBe(3);
    expect(dayDiff('2026-04-23', '2026-04-23')).toBe(0);
  });

  it('localDateIn formats YYYY-MM-DD in a given tz', () => {
    // 2026-04-23 03:00 UTC → still 2026-04-22 in Los Angeles (UTC-7 in April)
    const nightUtc = new Date('2026-04-23T03:00:00Z');
    expect(localDateIn('America/Los_Angeles', nightUtc)).toBe('2026-04-22');
    expect(localDateIn('UTC', nightUtc)).toBe('2026-04-23');
  });

  it('computeNextStreak seeds at 1 when no prior row', () => {
    const next = computeNextStreak(null, '2026-04-23');
    expect(next.current_streak).toBe(1);
    expect(next.longest_streak).toBe(1);
    expect(next.last_login_date).toBe('2026-04-23');
    expect(next.alreadyDoneToday).toBe(false);
  });

  it('computeNextStreak flags alreadyDoneToday when last_login_date equals today', () => {
    const next = computeNextStreak(
      { current_streak: 5, longest_streak: 10, last_login_date: '2026-04-23' },
      '2026-04-23'
    );
    expect(next.alreadyDoneToday).toBe(true);
    expect(next.current_streak).toBe(5);
  });

  it('computeNextStreak increments on consecutive day', () => {
    const next = computeNextStreak(
      { current_streak: 5, longest_streak: 5, last_login_date: '2026-04-22' },
      '2026-04-23'
    );
    expect(next.current_streak).toBe(6);
    expect(next.longest_streak).toBe(6);
    expect(next.alreadyDoneToday).toBe(false);
  });

  it('computeNextStreak resets to 1 on gap > 1 day but keeps longest_streak', () => {
    const next = computeNextStreak(
      { current_streak: 12, longest_streak: 30, last_login_date: '2026-04-20' },
      '2026-04-23'
    );
    expect(next.current_streak).toBe(1);
    expect(next.longest_streak).toBe(30);
  });
});

// ─── Handler tests ─────────────────────────────────────────────────────

function buildRequest(body: unknown): Request {
  return new Request('http://test.local/api/daily-tasks/streak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface SupabaseStub {
  existing: Record<string, unknown> | null;
  upserted: Record<string, unknown> | null;
}

function makeSupabase(stub: SupabaseStub) {
  const loginStreakTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: stub.existing, error: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: stub.upserted, error: null }),
  };

  const userProfilesTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { streak_milestone_claimed: 0 },
      error: null,
    }),
    update: vi.fn().mockReturnThis(),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'login_streaks') return loginStreakTable;
      if (table === 'user_profiles') return userProfilesTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
    __loginStreakTable: loginStreakTable,
  };
}

describe('POST /api/daily-tasks/streak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated users', async () => {
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'nope' },
        }),
      },
    });

    const res = await POST(buildRequest({ timezone: 'UTC' }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid timezone', async () => {
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    });

    const res = await POST(buildRequest({ timezone: 'Not/A/Zone' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when already claimed today', async () => {
    const today = localDateIn('UTC');
    const supabase = makeSupabase({
      existing: {
        user_id: USER_ID,
        current_streak: 3,
        longest_streak: 7,
        last_login_date: today,
      },
      upserted: null,
    });
    (createClient as any).mockResolvedValue(supabase);

    const res = await POST(buildRequest({ timezone: 'UTC' }));
    expect(res.status).toBe(409);
  });

  it('increments on a fresh day and invokes milestone check', async () => {
    const today = localDateIn('UTC');
    const yesterdayMs = new Date(today + 'T00:00:00Z').getTime() - 86_400_000;
    const yesterday = new Date(yesterdayMs).toISOString().slice(0, 10);

    const supabase = makeSupabase({
      existing: {
        user_id: USER_ID,
        current_streak: 4,
        longest_streak: 10,
        last_login_date: yesterday,
      },
      upserted: {
        user_id: USER_ID,
        current_streak: 5,
        longest_streak: 10,
        last_login_date: today,
      },
    });
    (createClient as any).mockResolvedValue(supabase);

    const res = await POST(buildRequest({ timezone: 'UTC' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.current_streak).toBe(5);
    expect(checkStreakMilestones).toHaveBeenCalledWith(
      expect.anything(),
      USER_ID,
      5,
      0
    );
  });
});
