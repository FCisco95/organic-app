import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
