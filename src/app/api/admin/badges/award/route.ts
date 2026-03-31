import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { awardBadgeRequestSchema } from '@/features/badges/schemas';
import { BADGES } from '@/features/badges/config';
import type { BadgeKey } from '@/features/badges/config';
import { awardXp } from '@/features/gamification/xp-service';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user };
  }

  return { error: null, user };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authErr } = await requireAdmin(supabase);
    if (authErr) return authErr;

    const body = await request.json();
    const parsed = awardBadgeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { user_id, badge_key, sprint_id, metadata } = parsed.data;
    const badgeDef = BADGES[badge_key as BadgeKey];

    if (!badgeDef) {
      return NextResponse.json({ error: `Unknown badge key: ${badge_key}` }, { status: 400 });
    }

    // Insert badge
    const { data, error } = await supabase
      .from('user_badges' as any)
      .insert({
        user_id,
        badge_key,
        badge_type: badgeDef.type,
        sprint_id: sprint_id ?? null,
        xp_awarded: badgeDef.xp,
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      // Unique violation = badge already awarded
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Badge already awarded to this user' }, { status: 409 });
      }
      logger.error('Admin badge award error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Award XP for the badge
    await awardXp(supabase, {
      userId: user_id,
      eventType: 'badge_earned',
      xpAmount: badgeDef.xp,
      sourceType: 'badge',
      sourceId: (data as any).id,
      metadata: { badge_key, badge_name: badgeDef.name },
    });

    return NextResponse.json({ data: data as any }, { status: 201 });
  } catch (error) {
    logger.error('Admin badge award error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
