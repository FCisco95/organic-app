import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { GamificationConfig } from './types';

type DbClient = SupabaseClient<Database>;

// ─── Types ──────────────────────────────────────────────────────────────

export interface AwardXpOptions {
  userId: string;
  eventType: string;
  xpAmount: number;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AwardXpResult {
  awarded: boolean;
  xpAwarded: number;
  bonusApplied: boolean;
  reason?: string;
}

// ─── Daily Cap Configuration ────────────────────────────────────────────

/** Maximum XP awards per event type per day. 0 = unlimited. */
const DAILY_CAPS: Record<string, number> = {
  idea_created: 5,        // 5 ideas/day
  idea_voted: 5,          // 5 vote XP awards/day
  idea_vote_received: 10, // 10 "vote received" XP awards/day
  idea_comment_created: 5,
  post_created: 3,
  post_liked: 10,
  donation_verified: 5,
};

/** After this many awards in a day, XP starts diminishing (50% per extra). */
const DIMINISHING_THRESHOLD_RATIO = 0.8; // 80% of daily cap

/** Probability of a 2x bonus roll (variable reward psychology). */
const BONUS_ROLL_CHANCE = 0.05; // 5%
const BONUS_MULTIPLIER = 2;

// ─── Helpers ────────────────────────────────────────────────────────────

function getUtcDayStart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function getGamificationConfig(supabase: DbClient): Promise<GamificationConfig> {
  const { data } = await supabase
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();

  return (data?.gamification_config as unknown ?? {}) as GamificationConfig;
}

function levelFromXp(xp: number): number {
  if (xp >= 80_000) return 11;
  if (xp >= 40_000) return 10;
  if (xp >= 20_000) return 9;
  if (xp >= 10_000) return 8;
  if (xp >= 5_000) return 7;
  if (xp >= 2_500) return 6;
  if (xp >= 1_200) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

// ─── Core Service ───────────────────────────────────────────────────────

/**
 * Centralized XP award service. ALL XP grants should route through this.
 *
 * Features:
 * - Daily action caps per event type
 * - Diminishing returns after threshold
 * - Random bonus roll (5% chance of 2x)
 * - Trust score multiplier (default 1.0, extensible)
 * - Deduplication check via unique index
 * - Metadata logging
 */
export async function awardXp(
  supabase: DbClient,
  options: AwardXpOptions
): Promise<AwardXpResult> {
  const { userId, eventType, xpAmount, sourceType, sourceId, metadata } = options;

  if (xpAmount <= 0) {
    return { awarded: false, xpAwarded: 0, bonusApplied: false, reason: 'zero_xp' };
  }

  // 1. Check gamification is enabled
  const config = await getGamificationConfig(supabase);
  if (!config.enabled) {
    return { awarded: false, xpAwarded: 0, bonusApplied: false, reason: 'gamification_disabled' };
  }

  // 2. Daily cap check
  const dailyCap = DAILY_CAPS[eventType] ?? 0;
  if (dailyCap > 0) {
    const dayStart = getUtcDayStart();
    const { count } = await supabase
      .from('xp_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .gte('created_at', dayStart.toISOString());

    const todayCount = count ?? 0;
    if (todayCount >= dailyCap) {
      return { awarded: false, xpAwarded: 0, bonusApplied: false, reason: 'daily_cap_reached' };
    }

    // 3. Diminishing returns after threshold
    const threshold = Math.floor(dailyCap * DIMINISHING_THRESHOLD_RATIO);
    let adjustedXp = xpAmount;
    if (todayCount >= threshold) {
      const overCount = todayCount - threshold + 1;
      adjustedXp = Math.max(1, Math.round(xpAmount * Math.pow(0.5, overCount)));
    }

    // 4. Random bonus roll
    const bonusApplied = Math.random() < BONUS_ROLL_CHANCE;
    if (bonusApplied) {
      adjustedXp = adjustedXp * BONUS_MULTIPLIER;
    }

    // 5. Trust score multiplier (default 1.0, extensible via user_profiles)
    // For now we default to 1.0 — future: read from user_profiles.trust_score
    const trustMultiplier = 1.0;
    adjustedXp = Math.round(adjustedXp * trustMultiplier);

    return await insertXpAward(supabase, config, {
      ...options,
      xpAmount: adjustedXp,
      metadata: {
        ...metadata,
        original_xp: xpAmount,
        daily_count: todayCount + 1,
        daily_cap: dailyCap,
        bonus_applied: bonusApplied,
      },
    });
  }

  // No daily cap — apply bonus roll only
  let adjustedXp = xpAmount;
  const bonusApplied = Math.random() < BONUS_ROLL_CHANCE;
  if (bonusApplied) {
    adjustedXp = adjustedXp * BONUS_MULTIPLIER;
  }

  return await insertXpAward(supabase, config, {
    ...options,
    xpAmount: adjustedXp,
    metadata: { ...metadata, original_xp: xpAmount, bonus_applied: bonusApplied },
  });
}

async function insertXpAward(
  supabase: DbClient,
  config: GamificationConfig,
  options: AwardXpOptions
): Promise<AwardXpResult> {
  const { userId, eventType, xpAmount, sourceType, sourceId, metadata } = options;
  const bonusApplied = (metadata?.bonus_applied as boolean) ?? false;

  // 6. Deduplication: unique index (user_id, event_type, source_type, source_id)
  //    will reject duplicates when source_id is provided.
  const insertPayload = {
    user_id: userId,
    event_type: eventType,
    source_type: sourceType ?? null,
    source_id: sourceId ?? null,
    xp_amount: xpAmount,
    metadata: metadata ?? {},
  };
  const { error: xpError } = await supabase.from('xp_events').insert(insertPayload as any);

  if (xpError) {
    // Unique violation = duplicate, treat as success (already awarded)
    if (xpError.code === '23505') {
      return { awarded: false, xpAwarded: 0, bonusApplied: false, reason: 'duplicate' };
    }
    throw new Error(`Failed to insert XP event: ${xpError.message}`);
  }

  // 7. Update user_profiles XP total + level (if auto leveling)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('xp_total')
    .eq('id', userId)
    .single();

  if (profile) {
    const newXp = (profile.xp_total ?? 0) + xpAmount;
    const updateData: Record<string, unknown> = { xp_total: newXp };
    if (config.leveling_mode !== 'manual_burn') {
      updateData.level = levelFromXp(newXp);
    }
    await supabase
      .from('user_profiles')
      .update(updateData as never)
      .eq('id', userId);
  }

  return { awarded: true, xpAwarded: xpAmount, bonusApplied };
}
