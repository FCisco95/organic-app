import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // Check profile visibility
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        'xp_total, level, current_streak, longest_streak, last_active_date, total_points, tasks_completed, profile_visible'
      )
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!profile.profile_visible) {
      return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
    }

    // Fetch user achievements, achievement definitions, and XP events in parallel
    const [userAchievementsResult, achievementDefsResult, xpEventsResult] = await Promise.all([
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(10),
      supabase.from('achievements').select('*'),
      supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

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
    console.error('Reputation user API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
