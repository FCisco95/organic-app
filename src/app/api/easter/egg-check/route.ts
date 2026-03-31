import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { EGG_ELEMENTS } from '@/features/easter/elements';

export async function GET() {
  const EMPTY = { spawn: false, shimmer: false, egg: null };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(EMPTY);
    }

    // Rate limit: 1 check per 3 seconds per user
    const rateLimited = await applyUserRateLimit(user.id, 'egg-check', {
      limit: 20,
      windowMs: 60_000, // 20 per minute (~1 per 3s)
    });
    if (rateLimited) {
      return NextResponse.json(EMPTY);
    }

    // Read config
    const { data: configRaw } = await supabase
      .from('egg_hunt_config' as any)
      .select('*')
      .limit(1)
      .single();

    const config = configRaw as any;
    if (!config) {
      return NextResponse.json(EMPTY);
    }

    const shimmerEnabled = config.shimmer_enabled as boolean;
    const huntEnabled = config.hunt_enabled as boolean;
    const shimmerRate = Number(config.shimmer_rate) || 0.03;

    // If neither shimmer nor hunt is enabled, return empty
    if (!shimmerEnabled && !huntEnabled) {
      return NextResponse.json(EMPTY);
    }

    // Check if hunt has ended
    if (config.hunt_ends_at && new Date(config.hunt_ends_at as string) < new Date()) {
      // Hunt ended — still show shimmers if enabled
      if (shimmerEnabled) {
        const shimmerRoll = Math.random();
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null });
      }
      return NextResponse.json(EMPTY);
    }

    // If hunt not enabled, only do shimmer
    if (!huntEnabled) {
      const shimmerRoll = Math.random();
      return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null });
    }

    // -- Hunt is enabled: run the RNG engine --

    // Check user qualifies (has organic_id or completed at least 1 task)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.organic_id) {
      // Shimmer only for non-qualified users
      if (shimmerEnabled) {
        const shimmerRoll = Math.random();
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null });
      }
      return NextResponse.json(EMPTY);
    }

    // Get user's existing eggs
    const { data: existingEggsRaw } = await supabase
      .from('golden_eggs' as any)
      .select('egg_number')
      .eq('user_id', user.id) as { data: any[] | null };

    const foundEggNumbers = new Set((existingEggsRaw ?? []).map((e: any) => e.egg_number as number));

    // If user has all 10, no more spawns
    if (foundEggNumbers.size >= 10) {
      if (shimmerEnabled) {
        const shimmerRoll = Math.random();
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null });
      }
      return NextResponse.json(EMPTY);
    }

    // Calculate effective spawn rate
    let effectiveRate = Number(config.base_spawn_rate) || 0.001;

    // Check probability override
    if (config.probability_override) {
      // Check if override has expired
      if (config.override_expires_at && new Date(config.override_expires_at as string) < new Date()) {
        // Override expired — auto-disable (best effort, don't block the response)
        supabase
          .from('egg_hunt_config' as any)
          .update({ probability_override: false, updated_at: new Date().toISOString() })
          .eq('id', config.id)
          .then(() => {});
      } else {
        effectiveRate = Number(config.override_rate) || 0.005;
      }
    }

    // Get luck boost
    const { data: luckRaw } = await supabase
      .from('egg_hunt_luck' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    const luck = luckRaw as any;

    let luckBoost = 0;
    let pageLoadsSinceFind = 0;

    if (luck) {
      luckBoost = Number(luck.luck_boost) || 0;
      pageLoadsSinceFind = (luck.page_loads_since_last_find as number) || 0;

      // Check if luck boost has expired
      if (luck.luck_boost_expires_at && new Date(luck.luck_boost_expires_at as string) < new Date()) {
        luckBoost = 0;
      }
    }

    // Progressive probability bonus
    let progressiveBonus = 0;
    if (pageLoadsSinceFind >= 2000) progressiveBonus = 0.0015;
    else if (pageLoadsSinceFind >= 1000) progressiveBonus = 0.001;
    else if (pageLoadsSinceFind >= 500) progressiveBonus = 0.0005;

    const totalRate = effectiveRate + luckBoost + progressiveBonus;

    // Roll for each unfound egg type
    const unfoundElements = EGG_ELEMENTS.filter((e) => !foundEggNumbers.has(e.number));
    let spawnedEgg: { number: number; element: string } | null = null;

    for (const element of unfoundElements) {
      const elementRate = totalRate * element.rarityModifier;
      const roll = Math.random();
      if (roll < elementRate) {
        spawnedEgg = { number: element.number, element: element.element };
        break; // Only one egg per check
      }
    }

    // Increment page loads (upsert)
    if (luck) {
      supabase
        .from('egg_hunt_luck' as any)
        .update({
          page_loads_since_last_find: pageLoadsSinceFind + 1,
          last_calculated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .then(() => {});
    } else {
      supabase
        .from('egg_hunt_luck' as any)
        .insert({
          user_id: user.id,
          page_loads_since_last_find: 1,
          luck_boost: 0,
          last_calculated_at: new Date().toISOString(),
        })
        .then(() => {});
    }

    if (spawnedEgg) {
      return NextResponse.json({ spawn: true, shimmer: false, egg: spawnedEgg });
    }

    // No egg — roll shimmer
    if (shimmerEnabled) {
      const shimmerRoll = Math.random();
      return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null });
    }

    return NextResponse.json(EMPTY);
  } catch (error) {
    logger.error('Egg check error:', error);
    return NextResponse.json(EMPTY);
  }
}
