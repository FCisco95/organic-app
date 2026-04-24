/**
 * Pure helpers for the daily streak. Kept out of the App Router route file
 * because Next.js disallows arbitrary named exports from route.ts modules.
 */

/** Return YYYY-MM-DD for "now" in the given IANA timezone. */
export function localDateIn(timezone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Day difference between two YYYY-MM-DD strings (b - a). */
export function dayDiff(a: string, b: string): number {
  const aMs = new Date(a + 'T00:00:00Z').getTime();
  const bMs = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24));
}

export interface StreakRowLike {
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
}

export interface NextStreakResult {
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
  alreadyDoneToday: boolean;
}

/**
 * Compute the next streak row state given the previous row and today's
 * local date. Pure function to keep logic easy to test.
 */
export function computeNextStreak(
  prev: StreakRowLike | null,
  today: string
): NextStreakResult {
  if (!prev || !prev.last_login_date) {
    return {
      current_streak: 1,
      longest_streak: Math.max(prev?.longest_streak ?? 0, 1),
      last_login_date: today,
      alreadyDoneToday: false,
    };
  }

  if (prev.last_login_date === today) {
    return {
      current_streak: prev.current_streak,
      longest_streak: prev.longest_streak,
      last_login_date: prev.last_login_date,
      alreadyDoneToday: true,
    };
  }

  const diff = dayDiff(prev.last_login_date, today);
  const next = diff === 1 ? prev.current_streak + 1 : 1;
  return {
    current_streak: next,
    longest_streak: Math.max(prev.longest_streak, next),
    last_login_date: today,
    alreadyDoneToday: false,
  };
}
