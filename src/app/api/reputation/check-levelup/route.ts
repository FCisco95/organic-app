import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current level before check
    const { data: profileBefore } = await supabase
      .from('user_profiles')
      .select('level')
      .eq('id', user.id)
      .single();

    const oldLevel = profileBefore?.level ?? 1;

    // Run achievement check (may award bonus XP and level up)
    const { data: newAchievements, error } = await supabase.rpc('check_achievements', {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
    }

    // Get level after check
    const { data: profileAfter } = await supabase
      .from('user_profiles')
      .select('level')
      .eq('id', user.id)
      .single();

    const newLevel = profileAfter?.level ?? oldLevel;

    return NextResponse.json({
      newAchievements: newAchievements ?? [],
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
    });
  } catch (err) {
    console.error('Level-up check API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
