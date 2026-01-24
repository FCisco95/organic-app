import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
};

type LeaderboardRow = LeaderboardEntry & {
  dense_rank?: number | null;
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

    // Fetch leaderboard data directly from user_profiles
    // ordered by total_points descending
    const { data: leaderboard, error } = await supabase
      .from('leaderboard_view' as unknown as 'user_profiles')
      .select(
        'id, name, email, organic_id, avatar_url, total_points, tasks_completed, role, rank, dense_rank'
      )
      .not('organic_id', 'is', null)
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const normalized = ensureRanks((leaderboard || []) as LeaderboardRow[]);

    return NextResponse.json({
      leaderboard: normalized as LeaderboardEntry[],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
