import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DAILY_TASK_DEFINITIONS } from '@/features/daily-tasks/config';

/**
 * GET /api/daily-tasks
 *
 * Returns today's daily/weekly tasks with the current user's progress.
 * Creates task entries for today if they don't exist yet.
 *
 * Streak is no longer auto-incremented here — it only advances when the user
 * explicitly presses the flame button (POST /api/daily-tasks/streak).
 */
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

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch existing progress for today
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('daily_task_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today);

    if (fetchError) {
      logger.error('Daily tasks GET fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const existingKeys = new Set((existing as any[] ?? []).map((t: any) => t.task_key));

    // Create entries for tasks that don't exist yet today
    const missing = DAILY_TASK_DEFINITIONS.filter((t) => !existingKeys.has(t.key));

    if (missing.length > 0) {
      const rows = missing.map((t) => ({
        user_id: user.id,
        task_key: t.key,
        progress: 0,
        target: t.target,
        completed: false,
        completed_at: null,
        date: today,
        xp_awarded: 0,
        points_awarded: 0,
      }));

      const { error: insertError } = await (supabase as any)
        .from('daily_task_progress')
        .insert(rows);

      if (insertError) {
        logger.error('Daily tasks GET insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Re-fetch all tasks for today (after inserts)
    const { data: tasks, error: refetchError } = await (supabase as any)
      .from('daily_task_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('task_key');

    if (refetchError) {
      logger.error('Daily tasks GET refetch error:', refetchError);
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    // Auto-complete daily_login task (task progress only — streak is manual)
    await autoCompleteLogin(supabase, user.id, today, tasks as any[]);

    // Read current streak without mutating it
    const { data: streak } = await (supabase as any)
      .from('login_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({ data: tasks, streak: streak ?? null });
  } catch (error) {
    logger.error('Daily tasks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Auto-complete the daily_login task if not already completed */
async function autoCompleteLogin(
  supabase: any,
  userId: string,
  today: string,
  tasks: any[]
) {
  const loginTask = tasks.find(
    (t: any) => t.task_key === 'daily_login' && !t.completed
  );

  if (!loginTask) return;

  const { awardXp } = await import('@/features/gamification/xp-service');
  const loginDef = DAILY_TASK_DEFINITIONS.find((d) => d.key === 'daily_login')!;

  await (supabase as any)
    .from('daily_task_progress')
    .update({
      progress: 1,
      completed: true,
      completed_at: new Date().toISOString(),
      xp_awarded: loginDef.xpReward,
      points_awarded: loginDef.pointsReward,
    })
    .eq('user_id', userId)
    .eq('task_key', 'daily_login')
    .eq('date', today);

  // Award XP
  await awardXp(supabase, {
    userId,
    eventType: 'daily_task_login',
    xpAmount: loginDef.xpReward,
    sourceType: 'daily_task',
    sourceId: `daily_login_${today}`,
  });
}
