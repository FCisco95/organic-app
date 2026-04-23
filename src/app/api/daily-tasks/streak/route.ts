import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { markStreakTodaySchema } from '@/features/daily-tasks/schemas';
import { checkStreakMilestones } from '@/features/gamification/streak-service';
import { computeNextStreak, localDateIn } from '@/features/daily-tasks/streak-logic';

/**
 * GET /api/daily-tasks/streak
 *
 * Returns the current user's login streak data.
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

    const { data, error } = await (supabase as any)
      .from('login_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Login streak GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default shape if no streak record exists yet
    if (!data) {
      return NextResponse.json({
        data: {
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          last_login_date: null,
          updated_at: null,
        },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Login streak GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/daily-tasks/streak
 *
 * Marks the current user as "done for the day" and advances their streak.
 * Body: { timezone: IANA string }. The server computes the user's local
 * date in that timezone so one press per local day is enforced.
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

    const body = await request.json().catch(() => null);
    const parsed = markStreakTodaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const today = localDateIn(parsed.data.timezone);

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('login_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      logger.error('Login streak POST fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const next = computeNextStreak(existing ?? null, today);

    if (next.alreadyDoneToday) {
      return NextResponse.json(
        { error: 'Already done for today', data: existing },
        { status: 409 }
      );
    }

    const payload = {
      user_id: user.id,
      current_streak: next.current_streak,
      longest_streak: next.longest_streak,
      last_login_date: next.last_login_date,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = existing
      ? await (supabase as any)
          .from('login_streaks')
          .update(payload)
          .eq('user_id', user.id)
          .select()
          .single()
      : await (supabase as any)
          .from('login_streaks')
          .insert(payload)
          .select()
          .single();

    if (saveError) {
      logger.error('Login streak POST save error:', saveError);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    // Sync reputation.current_streak and award milestone XP if hit.
    const { data: profile } = await (supabase as any)
      .from('user_profiles')
      .select('streak_milestone_claimed')
      .eq('id', user.id)
      .maybeSingle();

    await (supabase as any)
      .from('user_profiles')
      .update({
        current_streak: next.current_streak,
        longest_streak: next.longest_streak,
        last_active_date: next.last_login_date,
      })
      .eq('id', user.id);

    const { milestoneClaimed } = await checkStreakMilestones(
      supabase as any,
      user.id,
      next.current_streak,
      (profile as any)?.streak_milestone_claimed ?? 0
    );

    return NextResponse.json({
      data: saved,
      milestoneClaimed,
    });
  } catch (error) {
    logger.error('Login streak POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
