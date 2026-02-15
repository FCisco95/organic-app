import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const achievementCheckByUser = new Map<string, number>();
const ACHIEVEMENT_CHECK_TTL_MS = 5 * 60 * 1000;
const XP_EVENT_COLUMNS =
  'id, user_id, event_type, source_type, source_id, xp_amount, metadata, created_at';
const ACHIEVEMENT_COLUMNS =
  'id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, created_at';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const isHistory = searchParams.get('history') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If history mode, return just XP events
    if (isHistory) {
      const { data: events, error } = await supabase
        .from('xp_events')
        .select(XP_EVENT_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch XP history' }, { status: 500 });
      }

      return NextResponse.json({ recent_xp_events: events ?? [] });
    }

    // Full reputation response: profile + user_achievements + achievement defs + recent XP
    const [profileResult, userAchievementsResult, achievementDefsResult, xpEventsResult] =
      await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'xp_total, level, current_streak, longest_streak, last_active_date, total_points, tasks_completed'
          )
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_achievements')
          .select('achievement_id, unlocked_at')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(5),
        supabase.from('achievements').select(ACHIEVEMENT_COLUMNS),
        supabase
          .from('xp_events')
          .select(XP_EVENT_COLUMNS)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    if (profileResult.error) {
      return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 });
    }

    // Avoid running the expensive achievement scan on every read request.
    const now = Date.now();
    const lastCheckedAt = achievementCheckByUser.get(user.id) ?? 0;
    if (now - lastCheckedAt >= ACHIEVEMENT_CHECK_TTL_MS) {
      await supabase.rpc('check_achievements', { p_user_id: user.id });
      achievementCheckByUser.set(user.id, now);
    }

    const profile = profileResult.data;
    const achievementDefs = achievementDefsResult.data ?? [];
    const defsMap = Object.fromEntries(achievementDefs.map((a) => [a.id, a]));

    const achievements = (userAchievementsResult.data ?? [])
      .filter((ua) => defsMap[ua.achievement_id])
      .map((ua) => ({
        ...defsMap[ua.achievement_id],
        unlocked: true,
        unlocked_at: ua.unlocked_at,
      }));

    return NextResponse.json({
      xp_total: profile.xp_total,
      level: profile.level,
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
      last_active_date: profile.last_active_date,
      total_points: profile.total_points,
      tasks_completed: profile.tasks_completed,
      achievement_count: achievements.length,
      recent_xp_events: xpEventsResult.data ?? [],
      recent_achievements: achievements,
    });
  } catch (err) {
    console.error('Reputation API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
