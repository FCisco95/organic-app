import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { EGG_ELEMENTS } from '@/features/easter/elements';

// XP egg tier probabilities (must sum to 1.0)
const XP_EGG_TIERS = [
  { xp: 1, probability: 0.60 },
  { xp: 2, probability: 0.20 },
  { xp: 5, probability: 0.10 },
  { xp: 10, probability: 0.099 },
  { xp: 0, probability: 0.001 }, // 0 = shiny (golden egg)
];

function rollXpTier(): { xp: number; isShiny: boolean } {
  const roll = Math.random();
  let cumulative = 0;
  for (const tier of XP_EGG_TIERS) {
    cumulative += tier.probability;
    if (roll < cumulative) {
      return { xp: tier.xp, isShiny: tier.xp === 0 };
    }
  }
  return { xp: 1, isShiny: false };
}

export async function GET() {
  const EMPTY = { spawn: false, shimmer: false, egg: null, xp_egg: null };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(EMPTY);
    }

    // Rate limit: ~6 checks per minute per user (1 per 10s)
    const rateLimited = await applyUserRateLimit(user.id, 'egg-check', {
      limit: 6,
      windowMs: 60_000,
    });
    if (rateLimited) {
      // Return empty instead of 429 — egg hunt should never show errors
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
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null, xp_egg: null });
      }
      return NextResponse.json(EMPTY);
    }

    // If hunt not enabled, only do shimmer
    if (!huntEnabled) {
      const shimmerRoll = Math.random();
      return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null, xp_egg: null });
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
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null, xp_egg: null });
      }
      return NextResponse.json(EMPTY);
    }

    // Get ALL globally claimed eggs (each egg can only have 1 owner)
    const { data: allClaimedRaw } = await supabase
      .from('golden_eggs' as any)
      .select('egg_number, user_id') as { data: any[] | null };

    const allClaimed = allClaimedRaw ?? [];
    const globallyClaimedNumbers = new Set(allClaimed.map((e: any) => e.egg_number as number));
    const userOwnedNumbers = new Set(
      allClaimed.filter((e: any) => e.user_id === user.id).map((e: any) => e.egg_number as number)
    );

    // If all 10 eggs are claimed globally, no more golden egg spawns for anyone
    if (globallyClaimedNumbers.size >= 10) {
      if (shimmerEnabled) {
        const shimmerRoll = Math.random();
        return NextResponse.json({ spawn: false, shimmer: shimmerRoll < shimmerRate, egg: null, xp_egg: null });
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

    // Roll for each globally unclaimed egg type (1 owner per egg)
    const unfoundElements = EGG_ELEMENTS.filter((e) => !globallyClaimedNumbers.has(e.number));
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
      // Golden egg takes priority — no XP egg on this check
      return NextResponse.json({ spawn: true, shimmer: false, egg: spawnedEgg, xp_egg: null });
    }

    // -- XP Egg roll (only if no golden egg spawned) --
    const xpEggEnabled = config.xp_egg_enabled as boolean;
    const xpEggSpawnRate = Number(config.xp_egg_spawn_rate) || 0.04;
    let xpEggResult: { token: string; xp_amount: number; is_shiny: boolean } | null = null;

    if (xpEggEnabled) {
      const xpRoll = Math.random();
      if (xpRoll < xpEggSpawnRate) {
        const tier = rollXpTier();

        let xpAmount = tier.xp;
        let isShiny = tier.isShiny;
        let eggNumber: number | null = null;
        let element: string | null = null;

        if (isShiny && unfoundElements.length > 0) {
          // Shiny = random unfound golden egg
          const shinyElement = unfoundElements[Math.floor(Math.random() * unfoundElements.length)];
          eggNumber = shinyElement.number;
          element = shinyElement.element;
          xpAmount = 0;
        } else if (isShiny) {
          // User has all 10 — re-roll as 10 XP instead
          isShiny = false;
          xpAmount = 10;
        }

        // Insert pending claim token (service client — RLS blocks authenticated INSERT)
        const serviceClient = createServiceClient();
        const { data: pendingRaw } = await serviceClient
          .from('xp_egg_pending' as any)
          .insert({
            user_id: user.id,
            xp_amount: xpAmount,
            is_shiny: isShiny,
            egg_number: eggNumber,
            element,
          })
          .select('id')
          .single();

        if (pendingRaw) {
          xpEggResult = {
            token: (pendingRaw as any).id as string,
            xp_amount: isShiny ? 0 : xpAmount,
            is_shiny: isShiny,
          };
        }
      }
    }

    // No golden egg — roll shimmer, include XP egg if rolled
    if (shimmerEnabled) {
      const shimmerRoll = Math.random();
      return NextResponse.json({
        spawn: false,
        shimmer: shimmerRoll < shimmerRate,
        egg: null,
        xp_egg: xpEggResult,
      });
    }

    return NextResponse.json({ ...EMPTY, xp_egg: xpEggResult });
  } catch (error) {
    logger.error('Egg check error:', error);
    return NextResponse.json(EMPTY);
  }
}
