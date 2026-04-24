/**
 * Pure math for X Engagement Rewards payouts.
 *
 * Three multiplicative inputs drive every XP award:
 *   1. base XP by engagement type (like / retweet / comment-score-mapped)
 *   2. rank decay — the Nth engager of a given type on a given post gets
 *      100%, 50%, 10%… of the base (configurable)
 *   3. wave multiplier — engaging early (within 1h / 6h) boosts the payout
 *
 * Final award = round(baseXp × rankDecay × waveMultiplier).
 */

export interface WaveTier {
  maxAgeMinutes: number;
  multiplier: number;
}

export interface EngagementPayoutConfig {
  likeBaseXp: number;
  retweetBaseXp: number;
  commentScoreToXp: Record<string, number>; // e.g. { "5": 10, "4": 8, "3": 5, "2": 2, "1": 0 }
  waveMultipliers: WaveTier[];
  rankDecay: number[]; // index 0 = 1st place multiplier, etc.
  defaultMultiplierBeyondRank: number; // for ranks past rankDecay[].length
}

export const DEFAULT_PAYOUT_CONFIG: EngagementPayoutConfig = {
  likeBaseXp: 1,
  retweetBaseXp: 3,
  commentScoreToXp: { '5': 10, '4': 8, '3': 5, '2': 2, '1': 0 },
  waveMultipliers: [
    { maxAgeMinutes: 60, multiplier: 1.3 },
    { maxAgeMinutes: 360, multiplier: 1.1 },
  ],
  rankDecay: [1.0, 0.5, 0.1],
  defaultMultiplierBeyondRank: 0.1,
};

/** Returns the rank-decay multiplier for a 1-indexed rank. */
export function computeRankDecay(rank: number, config: EngagementPayoutConfig = DEFAULT_PAYOUT_CONFIG): number {
  if (rank < 1) throw new Error(`rank must be >= 1, got ${rank}`);
  const idx = rank - 1;
  if (idx < config.rankDecay.length) return config.rankDecay[idx] ?? config.defaultMultiplierBeyondRank;
  return config.defaultMultiplierBeyondRank;
}

/**
 * Picks the wave multiplier tier based on how long after `postedAt` the
 * engagement happened. Tiers are evaluated in order and the first tier whose
 * `maxAgeMinutes` bound is satisfied wins — so list them tightest-first.
 *
 * Falls through to 1.0 if no tier matches.
 */
export function computeWaveMultiplier(
  postedAt: Date | string,
  engagedAt: Date | string,
  config: EngagementPayoutConfig = DEFAULT_PAYOUT_CONFIG
): number {
  const posted = typeof postedAt === 'string' ? new Date(postedAt) : postedAt;
  const engaged = typeof engagedAt === 'string' ? new Date(engagedAt) : engagedAt;
  const ageMs = engaged.getTime() - posted.getTime();
  if (ageMs < 0) return 1.0; // clock skew — treat as 'not early enough to prove'

  const ageMinutes = ageMs / 60_000;
  const tiers = [...config.waveMultipliers].sort((a, b) => a.maxAgeMinutes - b.maxAgeMinutes);

  for (const tier of tiers) {
    if (ageMinutes <= tier.maxAgeMinutes) return tier.multiplier;
  }
  return 1.0;
}

/** Maps a 1–5 Claude comment score to base XP using the config table. 0 for invalid scores. */
export function commentScoreToXp(score: number, config: EngagementPayoutConfig = DEFAULT_PAYOUT_CONFIG): number {
  if (!Number.isFinite(score)) return 0;
  const rounded = Math.round(score);
  if (rounded < 1 || rounded > 5) return 0;
  return config.commentScoreToXp[String(rounded)] ?? 0;
}

export type EngagementType = 'like' | 'retweet' | 'comment';

export interface PayoutInput {
  engagementType: EngagementType;
  rank: number;
  postedAt: Date | string;
  engagedAt: Date | string;
  commentScore?: number | null; // required for comments
}

export interface PayoutBreakdown {
  baseXp: number;
  rankDecay: number;
  waveMultiplier: number;
  xpAwarded: number;
}

/**
 * Computes the final XP award for a single engagement. Pure — no I/O.
 */
export function computePayout(
  input: PayoutInput,
  config: EngagementPayoutConfig = DEFAULT_PAYOUT_CONFIG
): PayoutBreakdown {
  let baseXp = 0;
  if (input.engagementType === 'like') baseXp = config.likeBaseXp;
  else if (input.engagementType === 'retweet') baseXp = config.retweetBaseXp;
  else if (input.engagementType === 'comment') baseXp = commentScoreToXp(input.commentScore ?? 0, config);

  const rankDecay = computeRankDecay(input.rank, config);
  const waveMultiplier = computeWaveMultiplier(input.postedAt, input.engagedAt, config);
  const xpAwarded = Math.max(0, Math.round(baseXp * rankDecay * waveMultiplier));

  return { baseXp, rankDecay, waveMultiplier, xpAwarded };
}

/**
 * Distributes a post's sprint-end bonus pool to the top-N engagers weighted
 * by each engager's earned XP on that post. Uses largest-remainder (Hamilton)
 * rounding so the full pool is distributed with no fractional units lost.
 *
 * Input map: userId → earned XP on this post (comment score + likes + retweets
 * summed). Users with 0 earned XP are excluded. Returns userId → bonus XP int.
 */
export function distributeSprintBonus(
  poolSize: number,
  userScores: Record<string, number>,
  topN: number
): Record<string, number> {
  if (poolSize <= 0) return {};

  const sorted = Object.entries(userScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(topN, 0));

  if (sorted.length === 0) return {};

  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
  if (totalScore <= 0) return {};

  const fractional: Array<{ userId: string; floor: number; remainder: number }> = sorted.map(([userId, score]) => {
    const exact = (poolSize * score) / totalScore;
    const floor = Math.floor(exact);
    return { userId, floor, remainder: exact - floor };
  });

  let allocated = fractional.reduce((sum, f) => sum + f.floor, 0);
  let leftover = poolSize - allocated;

  // Largest-remainder: award +1 to users with highest fractional remainder
  // until we've exhausted the leftover.
  const byRemainder = [...fractional].sort((a, b) => b.remainder - a.remainder);
  const bumps = new Set<string>();
  for (let i = 0; i < byRemainder.length && leftover > 0; i++) {
    bumps.add(byRemainder[i]!.userId);
    leftover--;
  }

  const result: Record<string, number> = {};
  for (const f of fractional) {
    const bonus = f.floor + (bumps.has(f.userId) ? 1 : 0);
    if (bonus > 0) result[f.userId] = bonus;
  }
  return result;
}

/**
 * Parses a gamification_config JSONB `engagement` key into a PayoutConfig,
 * falling back to DEFAULT_PAYOUT_CONFIG fields when any piece is missing.
 *
 * Ignores malformed values silently so a typo in admin config never crashes
 * the cron — the caller can still verify with `validatePayoutConfig` for UI.
 */
export function resolvePayoutConfig(raw: unknown): EngagementPayoutConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const likeBaseXp = typeof src.like_base_xp === 'number' ? src.like_base_xp : DEFAULT_PAYOUT_CONFIG.likeBaseXp;
  const retweetBaseXp =
    typeof src.retweet_base_xp === 'number' ? src.retweet_base_xp : DEFAULT_PAYOUT_CONFIG.retweetBaseXp;

  const commentScoreToXpRaw = src.comment_score_to_xp;
  const commentScoreToXp =
    commentScoreToXpRaw && typeof commentScoreToXpRaw === 'object'
      ? Object.fromEntries(
          Object.entries(commentScoreToXpRaw as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'number'
          ) as Array<[string, number]>
        )
      : DEFAULT_PAYOUT_CONFIG.commentScoreToXp;

  const waveMultipliersRaw = src.wave_multipliers;
  const waveMultipliers = Array.isArray(waveMultipliersRaw)
    ? waveMultipliersRaw
        .filter(
          (t): t is WaveTier =>
            !!t &&
            typeof t === 'object' &&
            typeof (t as WaveTier).maxAgeMinutes === 'number' &&
            typeof (t as WaveTier).multiplier === 'number'
        )
        .map((t) => ({ maxAgeMinutes: t.maxAgeMinutes, multiplier: t.multiplier }))
    : DEFAULT_PAYOUT_CONFIG.waveMultipliers;

  const rankDecayRaw = src.rank_decay;
  const rankDecay = Array.isArray(rankDecayRaw)
    ? rankDecayRaw.filter((n): n is number => typeof n === 'number')
    : DEFAULT_PAYOUT_CONFIG.rankDecay;

  const defaultMultiplierBeyondRank =
    typeof src.default_multiplier_beyond_rank === 'number'
      ? src.default_multiplier_beyond_rank
      : DEFAULT_PAYOUT_CONFIG.defaultMultiplierBeyondRank;

  return {
    likeBaseXp,
    retweetBaseXp,
    commentScoreToXp: Object.keys(commentScoreToXp).length > 0
      ? commentScoreToXp
      : DEFAULT_PAYOUT_CONFIG.commentScoreToXp,
    waveMultipliers: waveMultipliers.length > 0 ? waveMultipliers : DEFAULT_PAYOUT_CONFIG.waveMultipliers,
    rankDecay: rankDecay.length > 0 ? rankDecay : DEFAULT_PAYOUT_CONFIG.rankDecay,
    defaultMultiplierBeyondRank,
  };
}
