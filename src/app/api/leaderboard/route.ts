import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import {
  rankLeaderboardEntries,
  type LeaderboardEntry,
} from '@/features/reputation/types';

// Inline anon client to avoid importing from server.ts which references cookies().
// unstable_cache does not allow modules that touch dynamic data sources.
function createCacheSafeAnonClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

type LeaderboardRow = {
  id: string | null;
  name: string | null;
  organic_id: number | null;
  avatar_url: string | null;
  total_points: number | null;
  tasks_completed: number | null;
  role: Database['public']['Enums']['user_role'] | null;
  rank: number | null;
  dense_rank: number | null;
  xp_total: number | null;
  level: number | null;
  current_streak: number | null;
  restriction_status: string | null;
};
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
// No email or wallet — PII must not appear in public leaderboard
const LEADERBOARD_COLUMNS =
  'id, name, organic_id, avatar_url, total_points, tasks_completed, role, rank, dense_rank, xp_total, level, current_streak, restriction_status';

type NormalizedLeaderboardEntry = Omit<LeaderboardEntry, 'rank'>;

function normalizeLeaderboardRow(row: LeaderboardRow): NormalizedLeaderboardEntry | null {
  if (!row.id) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: null,
    organic_id: row.organic_id,
    avatar_url: row.avatar_url,
    total_points: row.total_points ?? 0,
    tasks_completed: row.tasks_completed ?? 0,
    role: row.role ?? 'guest',
    xp_total: row.xp_total ?? 0,
    level: row.level,
    current_streak: row.current_streak,
  };
}

async function queryLeaderboardMaterialized() {
  // Use anon client — safe because materialized view has no PII (email removed)
  const supabase = createCacheSafeAnonClient();
  return supabase
    .from('leaderboard_materialized')
    .select(LEADERBOARD_COLUMNS)
    .not('organic_id', 'is', null)
    .order('xp_total', { ascending: false })
    .order('total_points', { ascending: false })
    .order('tasks_completed', { ascending: false })
    .order('id', { ascending: true })
    .limit(100);
}

async function queryLeaderboardView() {
  const supabase = createCacheSafeAnonClient();
  return supabase
    .from('leaderboard_view')
    .select(LEADERBOARD_COLUMNS)
    .not('organic_id', 'is', null)
    .order('xp_total', { ascending: false })
    .order('total_points', { ascending: false })
    .order('tasks_completed', { ascending: false })
    .order('id', { ascending: true })
    .limit(100);
}

async function directUserProfilesFallback(): Promise<LeaderboardRow[]> {
  const supabase = createCacheSafeAnonClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name, organic_id, avatar_url, total_points, tasks_completed, role, xp_total, level, current_streak, restriction_status')
    .not('organic_id', 'is', null)
    .order('xp_total', { ascending: false })
    .order('total_points', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Direct user_profiles fallback also failed: ${error.message}`);
  }

  return (data ?? []).map((row, i) => ({
    ...row,
    rank: i + 1,
    dense_rank: i + 1,
    restriction_status: row.restriction_status ?? null,
  }));
}

async function fetchLeaderboardRows(forceLiveView = false): Promise<LeaderboardRow[]> {
  if (forceLiveView) {
    const viewResult = await queryLeaderboardView();
    if (viewResult.error) {
      logger.warn('Leaderboard view query failed, trying direct user_profiles fallback', {
        code: viewResult.error.code,
        message: viewResult.error.message,
      });
      return directUserProfilesFallback();
    }
    return viewResult.data ?? [];
  }

  const materializedResult = await queryLeaderboardMaterialized();
  if (!materializedResult.error) {
    return materializedResult.data ?? [];
  }

  logger.warn('Leaderboard materialized query failed, falling back to view', {
    code: materializedResult.error.code,
    message: materializedResult.error.message,
  });

  const viewResult = await queryLeaderboardView();
  if (!viewResult.error) {
    return viewResult.data ?? [];
  }

  logger.warn('Leaderboard view also failed, falling back to direct user_profiles query', {
    code: viewResult.error.code,
    message: viewResult.error.message,
  });
  return directUserProfilesFallback();
}

async function fetchLeaderboardPayload(forceLiveView = false): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const rows = await fetchLeaderboardRows(forceLiveView);
  const hiddenStatuses = new Set(['restricted', 'banned']);
  const normalized = rows
    .filter((row) => !hiddenStatuses.has(row.restriction_status ?? ''))
    .map(normalizeLeaderboardRow)
    .filter((row): row is NormalizedLeaderboardEntry => row !== null);

  const ranked = rankLeaderboardEntries(normalized);

  return {
    leaderboard: ranked.map((entry) => ({
      ...entry,
      email: null,
      rank: entry.rank,
    })),
  };
}

// Cache leaderboard for 300s (5 min) — rankings change slowly
const getCachedLeaderboard = unstable_cache(
  async () => fetchLeaderboardPayload(),
  ['leaderboard-data'],
  { revalidate: 300 }
);

export async function GET(request: NextRequest) {
  try {
    const fresh = request.nextUrl.searchParams.get('fresh') === '1';
    const response = fresh ? await fetchLeaderboardPayload(true) : await getCachedLeaderboard();

    return NextResponse.json(response, {
      headers: { 'Cache-Control': fresh ? 'no-store' : RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    logger.error('Leaderboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
