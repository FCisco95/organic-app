import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const ACHIEVEMENT_COLUMNS =
  'id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, created_at';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const targetUserId = searchParams.get('userId');

    // Get current user (optional — achievements are public, but unlock status needs a user)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let unlocksUserId: string | null = null;
    let canReadUnlockStatus = false;

    if (targetUserId) {
      if (user?.id && targetUserId === user.id) {
        unlocksUserId = targetUserId;
        canReadUnlockStatus = true;
      } else {
        const { data: targetProfile, error: targetProfileError } = await supabase
          .from('user_profiles')
          .select('profile_visible')
          .eq('id', targetUserId)
          .maybeSingle();

        if (!targetProfileError && targetProfile?.profile_visible) {
          unlocksUserId = targetUserId;
          canReadUnlockStatus = true;
        }
      }
    } else if (user?.id) {
      unlocksUserId = user.id;
      canReadUnlockStatus = true;
    }

    // Fetch all achievement definitions
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select(ACHIEVEMENT_COLUMNS)
      .order('category')
      .order('condition_threshold');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    // If we have a user, fetch their unlocked achievements
    let unlockedMap: Record<string, string> = {};
    if (canReadUnlockStatus && unlocksUserId) {
      const { data: unlocked } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', unlocksUserId);

      if (unlocked) {
        unlockedMap = Object.fromEntries(
          unlocked.map((ua) => [ua.achievement_id, ua.unlocked_at])
        );
      }
    }

    // Merge unlock status
    const result = (achievements ?? []).map((a) => ({
      ...a,
      unlocked: a.id in unlockedMap,
      unlocked_at: unlockedMap[a.id] ?? null,
    }));

    return NextResponse.json({ achievements: result });
  } catch (error) {
    logger.error('Achievements GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
