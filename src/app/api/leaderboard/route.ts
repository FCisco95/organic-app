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
};

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch leaderboard data directly from user_profiles
    // ordered by total_points descending
    const { data: leaderboard, error } = await supabase
      .from('user_profiles')
      .select('id, name, email, organic_id, avatar_url, total_points, tasks_completed, role')
      .not('organic_id', 'is', null)
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Add rank to each entry
    const entries = (leaderboard || []) as LeaderboardEntry[];
    const rankedLeaderboard = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({ leaderboard: rankedLeaderboard });
  } catch (error: any) {
    console.error('Error in leaderboard route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
