import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { trackTaskSchema } from '@/features/daily-tasks/schemas';
import { DAILY_TASK_MAP } from '@/features/daily-tasks/config';
import { awardXp } from '@/features/gamification/xp-service';

/**
 * POST /api/daily-tasks/track
 *
 * Increments progress for a task_key. Awards XP/points on completion.
 * Body: { task_key: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = trackTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { task_key } = parsed.data;
    const taskDef = DAILY_TASK_MAP.get(task_key);
    if (!taskDef) {
      return NextResponse.json({ error: 'Unknown task_key' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Fetch current progress
    const { data: row, error: fetchError } = await (supabase as any)
      .from('daily_task_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_key', task_key)
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      logger.error('Daily tasks track fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If no row exists, create one (user may not have called GET /api/daily-tasks yet)
    if (!row) {
      const { data: created, error: createError } = await (supabase as any)
        .from('daily_task_progress')
        .insert({
          user_id: user.id,
          task_key,
          progress: 0,
          target: taskDef.target,
          completed: false,
          completed_at: null,
          date: today,
          xp_awarded: 0,
          points_awarded: 0,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Daily tasks track create error:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return await incrementProgress(supabase, user.id, created as any, taskDef, today);
    }

    // Already completed — no-op
    if (row.completed) {
      return NextResponse.json({
        data: row,
        message: 'Task already completed',
      });
    }

    return await incrementProgress(supabase, user.id, row as any, taskDef, today);
  } catch (error) {
    logger.error('Daily tasks track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function incrementProgress(
  supabase: any,
  userId: string,
  row: any,
  taskDef: { key: string; xpReward: number; pointsReward: number; target: number },
  today: string
) {
  const newProgress = Math.min(row.progress + 1, taskDef.target);
  const nowCompleted = newProgress >= taskDef.target;

  const updateData: Record<string, unknown> = {
    progress: newProgress,
  };

  if (nowCompleted && !row.completed) {
    updateData.completed = true;
    updateData.completed_at = new Date().toISOString();
    updateData.xp_awarded = taskDef.xpReward;
    updateData.points_awarded = taskDef.pointsReward;
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from('daily_task_progress')
    .update(updateData)
    .eq('id', row.id)
    .select()
    .single();

  if (updateError) {
    logger.error('Daily tasks track update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Award XP on completion
  if (nowCompleted && !row.completed) {
    await awardXp(supabase, {
      userId,
      eventType: `daily_task_${taskDef.key}`,
      xpAmount: taskDef.xpReward,
      sourceType: 'daily_task',
      sourceId: `${taskDef.key}_${today}`,
    });
  }

  return NextResponse.json({
    data: updated,
    completed: nowCompleted,
  });
}
