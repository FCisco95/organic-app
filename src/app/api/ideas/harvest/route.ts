import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekWindow } from '@/features/ideas/server';
import { logger } from '@/lib/logger';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

const AUTHOR_SELECT =
  'id, name, email, organic_id, avatar_url';

export async function GET() {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const week = getCurrentWeekWindow();

    const [
      winnerResult,
      topContributorsResult,
      weekVotesResult,
      weekIdeasResult,
      activeStreaksResult,
    ] = await Promise.all([
      // This week's winning idea (top-scoring created this week)
      supabase
        .from('ideas')
        .select('id, title, body, score, upvotes, downvotes, comments_count, created_at, author:user_profiles!ideas_author_id_fkey(id, name, email, organic_id, avatar_url)')
        .is('removed_at', null)
        .gte('created_at', week.startIso)
        .lt('created_at', week.endIso)
        .order('score', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),

      // Top 3 contributors by XP earned this week
      supabase
        .from('xp_events')
        .select('user_id, xp_amount')
        .gte('created_at', week.startIso)
        .lt('created_at', week.endIso),

      // Total votes cast this week
      supabase
        .from('idea_votes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', week.startIso),

      // New ideas this week
      supabase
        .from('ideas')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', week.startIso)
        .lt('created_at', week.endIso),

      // Users with active streaks (>=3 days)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('current_streak', 3),
    ]);

    // Aggregate top contributors from XP events
    const xpByUser = new Map<string, number>();
    for (const row of topContributorsResult.data ?? []) {
      xpByUser.set(row.user_id, (xpByUser.get(row.user_id) ?? 0) + row.xp_amount);
    }
    const topUserIds = [...xpByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([userId, xp]) => ({ userId, xp }));

    // Fetch profiles for top contributors
    let topContributors: Array<{ user: Record<string, unknown>; xp_earned: number }> = [];
    if (topUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select(AUTHOR_SELECT)
        .in('id', topUserIds.map((u) => u.userId));

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      topContributors = topUserIds.map(({ userId, xp }) => ({
        user: (profileMap.get(userId) ?? { id: userId }) as Record<string, unknown>,
        xp_earned: xp,
      }));
    }

    return NextResponse.json({
      week_start: week.startIso,
      week_end: week.endIso,
      winner: winnerResult.data ?? null,
      top_contributors: topContributors,
      stats: {
        total_votes: weekVotesResult.count ?? 0,
        new_ideas: weekIdeasResult.count ?? 0,
        active_streaks: activeStreaksResult.count ?? 0,
      },
    });
  } catch (error) {
    logger.error('Ideas harvest route error', error);
    return NextResponse.json({ error: 'Failed to fetch harvest data' }, { status: 500 });
  }
}
