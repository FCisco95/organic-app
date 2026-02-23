import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BurnCostInfo, GamificationConfig } from './types';
import { REPUTATION_LEVELS } from '@/features/reputation';

type DbClient = SupabaseClient<Database>;

function getXpForLevel(level: number): number {
  const lvl = REPUTATION_LEVELS.find((l) => l.level === level);
  return lvl?.xpRequired ?? 0;
}

export async function getBurnCost(
  supabase: DbClient,
  userId: string
): Promise<BurnCostInfo> {
  const [profileResult, configResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('xp_total, level, claimable_points')
      .eq('id', userId)
      .single(),
    supabase
      .from('orgs')
      .select('gamification_config')
      .limit(1)
      .single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error('Failed to load user profile');
  }

  const profile = profileResult.data;
  const config = (configResult.data?.gamification_config as unknown ?? {}) as GamificationConfig;
  const levelingMode = config.leveling_mode ?? 'auto';
  const multiplier = config.burn_cost_multiplier ?? 1.0;

  const currentLevel = profile.level ?? 1;
  const currentXp = profile.xp_total ?? 0;
  const availablePoints = profile.claimable_points ?? 0;

  if (currentLevel >= 11) {
    return {
      current_level: currentLevel,
      next_level: 11,
      current_xp: currentXp,
      xp_for_next_level: getXpForLevel(11),
      points_cost: 0,
      available_points: availablePoints,
      can_burn: false,
      leveling_mode: levelingMode,
    };
  }

  const nextLevel = currentLevel + 1;
  const xpForNextLevel = getXpForLevel(nextLevel);
  const xpDeficit = Math.max(0, xpForNextLevel - currentXp);
  const pointsCost = Math.ceil(xpDeficit * multiplier);

  const canBurn = levelingMode === 'manual_burn'
    ? pointsCost > 0 && availablePoints >= pointsCost
    : false; // In auto mode, leveling is automatic — no burn needed

  return {
    current_level: currentLevel,
    next_level: nextLevel,
    current_xp: currentXp,
    xp_for_next_level: xpForNextLevel,
    points_cost: pointsCost,
    available_points: availablePoints,
    can_burn: canBurn,
    leveling_mode: levelingMode,
  };
}

export async function burnPointsToLevelUp(
  supabase: DbClient,
  userId: string
): Promise<{ from_level: number; to_level: number; points_burned: number }> {
  const burnCost = await getBurnCost(supabase, userId);

  if (!burnCost.can_burn) {
    throw new Error(
      burnCost.leveling_mode === 'auto'
        ? 'Burning is not available in auto leveling mode'
        : burnCost.available_points < burnCost.points_cost
          ? 'Insufficient points to burn'
          : 'Cannot level up further'
    );
  }

  const fromLevel = burnCost.current_level;
  const toLevel = burnCost.next_level;
  const pointsToBurn = burnCost.points_cost;

  // Deduct points and update level atomically
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      claimable_points: burnCost.available_points - pointsToBurn,
      level: toLevel,
    } as never)
    .eq('id', userId)
    .gte('claimable_points', pointsToBurn);

  if (updateError) {
    throw new Error(`Failed to burn points: ${updateError.message}`);
  }

  // Record the burn
  await supabase.from('point_burns' as any).insert({
    user_id: userId,
    points_burned: pointsToBurn,
    from_level: fromLevel,
    to_level: toLevel,
  });

  return { from_level: fromLevel, to_level: toLevel, points_burned: pointsToBurn };
}
