import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import {
  rankLeaderboardEntries,
  type LeaderboardEntry,
} from '@/features/reputation/types';

type LeaderboardRow = {
  id: string | null;
  name: string | null;
  email: string | null;
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
};
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
const LEADERBOARD_COLUMNS =
  'id, name, email, organic_id, avatar_url, total_points, tasks_completed, role, rank, dense_rank, xp_total, level, current_streak';

type NormalizedLeaderboardEntry = Omit<LeaderboardEntry, 'rank'>;

function normalizeLeaderboardRow(row: LeaderboardRow): NormalizedLeaderboardEntry | null {
  if (!row.id || !row.email) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
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
  const supabase = createAnonClient();
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
  const supabase = createAnonClient();
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

async function fetchLeaderboardRows(forceLiveView = false): Promise<LeaderboardRow[]> {
  if (forceLiveView) {
    const viewResult = await queryLeaderboardView();
    if (viewResult.error) {
      throw new Error('Failed to fetch leaderboard');
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
  if (viewResult.error) {
    throw new Error('Failed to fetch leaderboard');
  }

  return viewResult.data ?? [];
}

async function fetchLeaderboardPayload(forceLiveView = false): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const rows = await fetchLeaderboardRows(forceLiveView);
  const normalized = rows
    .map(normalizeLeaderboardRow)
    .filter((row): row is NormalizedLeaderboardEntry => row !== null);

  const ranked = rankLeaderboardEntries(normalized);

  return {
    leaderboard: ranked.map((entry) => ({
      ...entry,
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
