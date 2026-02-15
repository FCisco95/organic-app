import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const targetUserId = searchParams.get('userId');

    // Get current user (optional — achievements are public, but unlock status needs a user)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = targetUserId || user?.id;

    // Fetch all achievement definitions
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .order('category')
      .order('condition_threshold');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    // If we have a user, fetch their unlocked achievements
    let unlockedMap: Record<string, string> = {};
    if (userId) {
      const { data: unlocked } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);

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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
