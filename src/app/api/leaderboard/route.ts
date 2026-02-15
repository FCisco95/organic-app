import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type LeaderboardRow = Database['public']['Views']['leaderboard_view']['Row'];

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

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch leaderboard data from the leaderboard_view
    // which includes pre-computed rank and dense_rank
    const { data: leaderboard, error } = await supabase
      .from('leaderboard_view')
      .select(
        'id, name, email, organic_id, avatar_url, total_points, tasks_completed, role, rank, dense_rank, xp_total, level, current_streak'
      )
      .not('organic_id', 'is', null)
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const normalized = ensureRanks(leaderboard || []);

    // Map to LeaderboardEntry (filter out nulls for required fields)
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

    return NextResponse.json({
      leaderboard: result,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
