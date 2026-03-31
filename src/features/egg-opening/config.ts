// Egg tier definitions and reward pools for the XP egg-opening mini-game

export const EGG_TIERS = {
  bronze: { cost: 25, label: 'Bronze Egg' },
  silver: { cost: 75, label: 'Silver Egg' },
  gold: { cost: 200, label: 'Gold Egg' },
} as const;

export type EggTier = keyof typeof EGG_TIERS;

export const DAILY_EGG_LIMIT = 5;

export type RewardType =
  | 'points_small'
  | 'points_medium'
  | 'points_large'
  | 'xp_boost'
  | 'luck_boost'
  | 'badge_flair'
  | 'profile_border'
  | 'mystery'
  | 'empty';

export type RarityLabel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RewardDefinition {
  type: RewardType;
  label: string;
  description: string;
  rarity: RarityLabel;
  /** Value payload stored in reward_value JSONB */
  value: Record<string, unknown>;
  /** Probability per tier (0–1). Must sum to 1.0 per tier across all rewards. */
  probability: Record<EggTier, number>;
}

export const REWARD_POOL: RewardDefinition[] = [
  {
    type: 'points_small',
    label: '5–15 Points',
    description: 'A small handful of points.',
    rarity: 'common',
    value: { points_min: 5, points_max: 15 },
    probability: { bronze: 0.40, silver: 0.20, gold: 0.05 },
  },
  {
    type: 'points_medium',
    label: '20–50 Points',
    description: 'A decent pile of points.',
    rarity: 'uncommon',
    value: { points_min: 20, points_max: 50 },
    probability: { bronze: 0.15, silver: 0.25, gold: 0.15 },
  },
  {
    type: 'badge_flair',
    label: 'Cosmetic Badge Flair',
    description: 'A unique badge flair for your profile.',
    rarity: 'uncommon',
    value: { flair_id: 'egg_flair' },
    probability: { bronze: 0.10, silver: 0.15, gold: 0.20 },
  },
  {
    type: 'xp_boost',
    label: 'Temporary 2x XP Boost',
    description: '2x XP for 1 hour.',
    rarity: 'rare',
    value: { multiplier: 2, duration_minutes: 60 },
    probability: { bronze: 0.03, silver: 0.10, gold: 0.15 },
  },
  {
    type: 'luck_boost',
    label: 'Egg Hunt Luck Boost',
    description: 'Increased luck in the golden egg hunt.',
    rarity: 'rare',
    value: { luck_increase: 0.002, duration_minutes: 120 },
    probability: { bronze: 0.02, silver: 0.08, gold: 0.15 },
  },
  {
    type: 'profile_border',
    label: 'Exclusive Profile Border',
    description: 'A rare border for your profile card.',
    rarity: 'epic',
    value: { border_id: 'egg_border' },
    probability: { bronze: 0, silver: 0.02, gold: 0.10 },
  },
  {
    type: 'points_large',
    label: '100 Points',
    description: 'A massive points jackpot!',
    rarity: 'epic',
    value: { points: 100 },
    probability: { bronze: 0, silver: 0, gold: 0.05 },
  },
  {
    type: 'mystery',
    label: 'Mystery Reward',
    description: 'Something mysterious... TBD.',
    rarity: 'legendary',
    value: { mystery: true },
    probability: { bronze: 0, silver: 0, gold: 0.02 },
  },
  {
    type: 'empty',
    label: 'Empty Egg',
    description: 'Nothing inside... better luck next time.',
    rarity: 'common',
    value: {},
    probability: { bronze: 0.30, silver: 0.20, gold: 0.13 },
  },
];

/**
 * Roll a reward from the pool for the given tier using weighted random selection.
 */
export function rollReward(tier: EggTier): RewardDefinition {
  const roll = Math.random();
  let cumulative = 0;

  for (const reward of REWARD_POOL) {
    cumulative += reward.probability[tier];
    if (roll < cumulative) {
      return reward;
    }
  }

  // Fallback (should not happen if probabilities sum to 1.0)
  return REWARD_POOL[REWARD_POOL.length - 1];
}

/**
 * For points rewards that have a range, resolve the actual value.
 */
export function resolveRewardValue(reward: RewardDefinition): Record<string, unknown> {
  if (reward.type === 'points_small' || reward.type === 'points_medium') {
    const min = (reward.value.points_min as number) ?? 0;
    const max = (reward.value.points_max as number) ?? 0;
    const points = Math.floor(Math.random() * (max - min + 1)) + min;
    return { ...reward.value, points };
  }
  return reward.value;
}
