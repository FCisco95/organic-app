import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { PersonalAnalyticsData } from '@/features/analytics/personal-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profileResult,
      xpEventsResult,
      activityLogResult,
      postsResult,
      commentsResult,
      likesGivenResult,
      likesReceivedResult,
      submissionsResult,
    ] = await Promise.all([
      // 1. User profile stats snapshot
      supabase
        .from('user_profiles')
        .select(
          'xp_total, level, current_streak, longest_streak, total_points, claimable_points, tasks_completed'
        )
        .eq('id', userId)
        .single(),

      // 2. XP events grouped by day (last 90 days)
      supabase
        .from('xp_events')
        .select('xp_amount, created_at')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo)
        .order('created_at', { ascending: true }),

      // 3. Activity log for heatmap (last 365 days)
      supabase
        .from('activity_log')
        .select('created_at')
        .eq('actor_id', userId)
        .gte('created_at', oneYearAgo),

      // 4. Posts created count
      (supabase as any)
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId),

      // 5. Comments made count
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // 6. Likes given count
      (supabase as any)
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // 7. Likes received (on user's posts via inner join)
      (supabase as any)
        .from('post_likes')
        .select('posts!inner(author_id)', { count: 'exact', head: true })
        .eq('posts.author_id', userId),

      // 8. Task submissions with review status breakdown
      supabase
        .from('task_submissions')
        .select('review_status')
        .eq('user_id', userId),
    ]);

    if (profileResult.error || !profileResult.data) {
      logger.error('Personal analytics profile fetch error', profileResult.error);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    const profile = profileResult.data;

    // Build XP trend (group by day)
    const xpByDay = new Map<string, number>();
    for (const event of xpEventsResult.data ?? []) {
      if (!event.created_at) continue;
      const day = event.created_at.slice(0, 10); // YYYY-MM-DD
      xpByDay.set(day, (xpByDay.get(day) ?? 0) + (event.xp_amount ?? 0));
    }
    const xp_trend = Array.from(xpByDay.entries())
      .map(([day, xp_earned]) => ({ day, xp_earned }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Build activity heatmap (group by day)
    const activityByDay = new Map<string, number>();
    for (const row of activityLogResult.data ?? []) {
      if (!row.created_at) continue;
      const date = row.created_at.slice(0, 10);
      activityByDay.set(date, (activityByDay.get(date) ?? 0) + 1);
    }
    const activity_heatmap = Array.from(activityByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build submission breakdown
    const submissions = submissionsResult.data ?? [];
    const submissionBreakdown = {
      total: submissions.length,
      pending: submissions.filter((s) => s.review_status === 'pending').length,
      approved: submissions.filter((s) => s.review_status === 'approved').length,
      rejected: submissions.filter((s) => s.review_status === 'rejected').length,
    };

    const data: PersonalAnalyticsData = {
      stats: {
        xp_total: profile.xp_total ?? 0,
        level: profile.level ?? 1,
        current_streak: profile.current_streak ?? 0,
        longest_streak: profile.longest_streak ?? 0,
        total_points: profile.total_points ?? 0,
        claimable_points: profile.claimable_points ?? 0,
        tasks_completed: profile.tasks_completed ?? 0,
      },
      xp_trend,
      activity_heatmap,
      engagement: {
        posts_created: postsResult.count ?? 0,
        comments_made: commentsResult.count ?? 0,
        likes_given: likesGivenResult.count ?? 0,
        likes_received: likesReceivedResult.count ?? 0,
      },
      submissions: submissionBreakdown,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error('Personal analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
