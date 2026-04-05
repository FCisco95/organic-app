import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface EggRow {
  user_id: string;
  egg_number: number;
  element: string;
  found_at: string;
}

interface ProfileRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
  organic_id: number | null;
}

interface LeaderboardEntry {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  organic_id: number | null;
  egg_count: number;
  elements: string[];
  earliest_find: string;
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Fetch all golden eggs
    const { data: eggsRaw, error: eggsError } = await supabase
      .from('golden_eggs' as any)
      .select('user_id, egg_number, element, found_at')
      .order('found_at', { ascending: true });

    if (eggsError) {
      logger.error('Leaderboard eggs query error:', eggsError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const eggs = (eggsRaw ?? []) as unknown as EggRow[];
    if (eggs.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Group eggs by user
    const userMap = new Map<string, { elements: string[]; earliest: string }>();
    for (const egg of eggs) {
      const entry = userMap.get(egg.user_id);
      if (entry) {
        entry.elements.push(egg.element);
        if (egg.found_at < entry.earliest) {
          entry.earliest = egg.found_at;
        }
      } else {
        userMap.set(egg.user_id, {
          elements: [egg.element],
          earliest: egg.found_at,
        });
      }
    }

    // Fetch profiles for all users who found eggs
    const userIds = Array.from(userMap.keys());
    const { data: profilesRaw, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, name, avatar_url, organic_id')
      .in('id', userIds);

    if (profilesError) {
      logger.error('Leaderboard profiles query error:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    const profiles = (profilesRaw ?? []) as unknown as ProfileRow[];
    const profileMap = new Map<string, ProfileRow>();
    for (const p of profiles) {
      profileMap.set(p.id, p);
    }

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = [];
    for (const [userId, info] of userMap) {
      const profile = profileMap.get(userId);
      leaderboard.push({
        user_id: userId,
        name: profile?.name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        organic_id: profile?.organic_id ?? null,
        egg_count: info.elements.length,
        elements: info.elements,
        earliest_find: info.earliest,
      });
    }

    // Sort: most eggs first, then earliest find
    leaderboard.sort((a, b) => {
      if (b.egg_count !== a.egg_count) return b.egg_count - a.egg_count;
      return a.earliest_find.localeCompare(b.earliest_find);
    });

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    logger.error('Leaderboard route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
