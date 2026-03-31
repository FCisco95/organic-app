import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { eggOpenRequestSchema } from '@/features/egg-opening/schemas';
import { EGG_TIERS, DAILY_EGG_LIMIT, rollReward, resolveRewardValue } from '@/features/egg-opening/config';
import type { EggTier } from '@/features/egg-opening/config';

function getUtcDayStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limit: 1 open per second per user
    const rateLimited = await applyUserRateLimit(user.id, 'egg-open', {
      limit: 1,
      windowMs: 1_000,
    });
    if (rateLimited) return rateLimited;

    // Parse and validate body
    const body = await request.json();
    const parsed = eggOpenRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tier: EggTier = parsed.data.tier;
    const tierConfig = EGG_TIERS[tier];

    // Check daily limit
    const dayStart = getUtcDayStart();
    const { count: todayCount, error: countError } = await supabase
      .from('egg_opens' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('opened_at', dayStart);

    if (countError) {
      logger.error('Egg open daily count error:', countError);
      return NextResponse.json({ error: 'Failed to check daily limit' }, { status: 500 });
    }

    const opensToday = todayCount ?? 0;
    if (opensToday >= DAILY_EGG_LIMIT) {
      return NextResponse.json(
        { error: 'Daily egg limit reached', daily_limit: DAILY_EGG_LIMIT },
        { status: 429 }
      );
    }

    // Check user has enough XP
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('xp_total')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      logger.error('Egg open profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const currentXp = (profile as any).xp_total ?? 0;
    if (currentXp < tierConfig.cost) {
      return NextResponse.json(
        { error: 'Not enough XP', required: tierConfig.cost, current: currentXp },
        { status: 400 }
      );
    }

    // Deduct XP: insert negative xp_event and update user_profiles.xp_total
    const newXpTotal = currentXp - tierConfig.cost;

    const { error: xpEventError } = await supabase
      .from('xp_events')
      .insert({
        user_id: user.id,
        event_type: 'egg_open_cost',
        xp_amount: -tierConfig.cost,
        source_type: 'egg_opening',
        source_id: null,
        metadata: { tier, cost: tierConfig.cost },
      } as any);

    if (xpEventError) {
      logger.error('Egg open XP event insert error:', xpEventError);
      return NextResponse.json({ error: 'Failed to deduct XP' }, { status: 500 });
    }

    const { error: xpUpdateError } = await supabase
      .from('user_profiles')
      .update({ xp_total: newXpTotal } as never)
      .eq('id', user.id);

    if (xpUpdateError) {
      logger.error('Egg open XP update error:', xpUpdateError);
      // Non-fatal: the xp_event is the source of truth, profile will resync
    }

    // Roll for reward
    const reward = rollReward(tier);
    const rewardValue = resolveRewardValue(reward);

    // Insert egg_open record
    const { error: insertError } = await supabase
      .from('egg_opens' as any)
      .insert({
        user_id: user.id,
        tier,
        xp_spent: tierConfig.cost,
        reward_type: reward.type,
        reward_value: rewardValue,
      });

    if (insertError) {
      logger.error('Egg open record insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record egg open' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        reward_type: reward.type,
        reward_label: reward.label,
        reward_description: reward.description,
        reward_value: rewardValue,
        rarity: reward.rarity,
        xp_spent: tierConfig.cost,
        opens_remaining_today: DAILY_EGG_LIMIT - opensToday - 1,
      },
    });
  } catch (error) {
    logger.error('Egg open error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
