import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type LeaderboardRow = Database['public']['Views']['leaderboard_materialized']['Row'];

type LeaderboardEntry = {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
  total_points: number | null;
  tasks_completed: number | null;
  role: string;
  rank: number | null;
  xp_total: number | null;
  level: number | null;
  current_streak: number | null;
};
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

const ensureRanks = (entries: LeaderboardRow[]) => {
  if (entries.length === 0) return entries;

  const hasAnyRank = entries.some((entry) => entry.rank != null);
  if (hasAnyRank) return entries;

  let lastPoints: number | null = null;
  let lastRank = 0;

  return entries.map((entry, index) => {
    const points = entry.total_points ?? 0;
    if (lastPoints === null || points < lastPoints) {
      lastRank = index + 1;
      lastPoints = points;
    }

    return { ...entry, rank: lastRank };
  });
};

// Cache leaderboard for 300s (5 min) — rankings change slowly
const getCachedLeaderboard = unstable_cache(
  async () => {
    const supabase = await createClient();

    // Use materialized view (refreshed every 5 min via pg_cron) for faster queries
    const { data: leaderboard, error } = await supabase
      .from('leaderboard_materialized')
      .select(
        'id, name, email, organic_id, avatar_url, total_points, tasks_completed, role, rank, dense_rank, xp_total, level, current_streak, claimable_points'
      )
      .not('organic_id', 'is', null)
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error('Failed to fetch leaderboard');
    }

    const normalized = ensureRanks(leaderboard || []);

    const result: LeaderboardEntry[] = normalized
      .filter(
        (row): row is LeaderboardRow & { id: string; email: string } =>
          row.id !== null && row.email !== null
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        organic_id: row.organic_id,
        avatar_url: row.avatar_url,
        total_points: row.total_points,
        tasks_completed: row.tasks_completed,
        role: row.role ?? 'guest',
        rank: row.rank,
        xp_total: row.xp_total,
        level: row.level,
        current_streak: row.current_streak,
      }));

    return { leaderboard: result };
  },
  ['leaderboard-data'],
  { revalidate: 300 }
);

export async function GET() {
  try {
    const response = await getCachedLeaderboard();

    return NextResponse.json(response, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
