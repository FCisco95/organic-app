import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type DbClient = SupabaseClient<Database>;

// ─── Types ──────────────────────────────────────────────────────────────

export interface DeductPointsResult {
  success: boolean;
  newBalance: number;
  reason?: string;
}

export interface AwardPointsResult {
  success: boolean;
  amount: number;
  newBalance: number;
  reason?: string;
}

export type PostType = 'text' | 'thread' | 'announcement' | 'link_share';

// ─── Post Creation Costs ────────────────────────────────────────────────

/** Point costs for non-organic posts */
const NON_ORGANIC_COSTS: Record<PostType, number> = {
  link_share: 5,
  text: 8,
  thread: 12,
  announcement: 0, // free (admin-only)
};

/** Point costs for organic posts after free weekly quota */
const ORGANIC_COSTS: Record<PostType, number> = {
  link_share: 3,
  text: 5,
  thread: 8,
  announcement: 0,
};

/** Free organic posts per week */
const FREE_ORGANIC_POSTS_PER_WEEK = 3;

/** Max engagement points per week */
const WEEKLY_ENGAGEMENT_POINTS_CAP = 200;

// ─── Helpers ────────────────────────────────────────────────────────────

function getUtcWeekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  // Monday = 0 offset
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

// ─── Core Functions ─────────────────────────────────────────────────────

/**
 * Calculate the point cost for creating a post.
 */
export function calculatePostCost(
  postType: PostType,
  isOrganic: boolean,
  weeklyOrganicCount: number
): number {
  if (postType === 'announcement') return 0;

  if (isOrganic) {
    if (weeklyOrganicCount < FREE_ORGANIC_POSTS_PER_WEEK) return 0;
    return ORGANIC_COSTS[postType];
  }

  return NON_ORGANIC_COSTS[postType];
}

/**
 * Get the number of organic posts the user has created this week.
 */
export async function getWeeklyOrganicPostCount(
  supabase: DbClient,
  userId: string
): Promise<number> {
  const weekStart = getUtcWeekStart();

  const { count } = await (supabase as any)
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('is_organic', true)
    .eq('status', 'published')
    .gte('created_at', weekStart.toISOString());

  return count ?? 0;
}

/**
 * Get total engagement points earned this week (capped at WEEKLY_ENGAGEMENT_POINTS_CAP).
 */
export async function getWeeklyEngagementPoints(
  supabase: DbClient,
  userId: string
): Promise<number> {
  const weekStart = getUtcWeekStart();

  const { data } = await (supabase as any)
    .from('points_ledger')
    .select('amount')
    .eq('user_id', userId)
    .eq('source_type', 'engagement')
    .gte('created_at', weekStart.toISOString())
    .gt('amount', 0);

  if (!data || data.length === 0) return 0;

  return data.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);
}

/**
 * Check if user can earn more engagement points this week.
 */
export async function canEarnEngagementPoints(
  supabase: DbClient,
  userId: string,
  amount: number
): Promise<{ allowed: boolean; remaining: number }> {
  const earned = await getWeeklyEngagementPoints(supabase, userId);
  const remaining = Math.max(0, WEEKLY_ENGAGEMENT_POINTS_CAP - earned);
  return {
    allowed: remaining >= amount,
    remaining,
  };
}

/**
 * Deduct points from user's claimable_points balance.
 * Returns failure if insufficient balance.
 */
export async function deductPoints(
  supabase: DbClient,
  userId: string,
  amount: number,
  reason: string,
  sourceType?: string,
  sourceId?: string
): Promise<DeductPointsResult> {
  if (amount <= 0) {
    return { success: true, newBalance: 0, reason: 'no_cost' };
  }

  // Get current balance
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('claimable_points')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { success: false, newBalance: 0, reason: 'profile_not_found' };
  }

  const currentBalance = profile.claimable_points ?? 0;

  if (currentBalance < amount) {
    return {
      success: false,
      newBalance: currentBalance,
      reason: 'insufficient_points',
    };
  }

  const newBalance = currentBalance - amount;

  // Update balance
  await supabase
    .from('user_profiles')
    .update({ claimable_points: newBalance } as never)
    .eq('id', userId);

  // Record in ledger
  await (supabase as any).from('points_ledger').insert({
    user_id: userId,
    amount: -amount,
    reason,
    source_type: sourceType ?? null,
    source_id: sourceId ?? null,
    balance_after: newBalance,
  });

  return { success: true, newBalance };
}

/**
 * Award points to user's claimable_points and total_points.
 * Respects weekly engagement cap when source_type is 'engagement'.
 */
export async function awardPoints(
  supabase: DbClient,
  userId: string,
  amount: number,
  reason: string,
  sourceType?: string,
  sourceId?: string
): Promise<AwardPointsResult> {
  if (amount <= 0) {
    return { success: true, amount: 0, newBalance: 0, reason: 'zero_amount' };
  }

  // Check weekly engagement cap
  let effectiveAmount = amount;
  if (sourceType === 'engagement') {
    const { remaining } = await canEarnEngagementPoints(supabase, userId, amount);
    if (remaining <= 0) {
      return { success: false, amount: 0, newBalance: 0, reason: 'weekly_engagement_cap' };
    }
    effectiveAmount = Math.min(amount, remaining);
  }

  // Get current balance
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('claimable_points, total_points')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { success: false, amount: 0, newBalance: 0, reason: 'profile_not_found' };
  }

  const newClaimable = (profile.claimable_points ?? 0) + effectiveAmount;
  const newTotal = (profile.total_points ?? 0) + effectiveAmount;

  // Update balance
  await supabase
    .from('user_profiles')
    .update({ claimable_points: newClaimable, total_points: newTotal } as never)
    .eq('id', userId);

  // Record in ledger (unique index on (user_id, source_type, source_id)
  // prevents duplicate awards, e.g. from like toggle cycles)
  const { error: ledgerError } = await (supabase as any).from('points_ledger').insert({
    user_id: userId,
    amount: effectiveAmount,
    reason,
    source_type: sourceType ?? null,
    source_id: sourceId ?? null,
    balance_after: newClaimable,
  });

  if (ledgerError) {
    // Unique violation = already awarded for this source — roll back balance update
    if (ledgerError.code === '23505') {
      await supabase
        .from('user_profiles')
        .update({
          claimable_points: (profile.claimable_points ?? 0),
          total_points: (profile.total_points ?? 0),
        } as never)
        .eq('id', userId);
      return { success: false, amount: 0, newBalance: profile.claimable_points ?? 0, reason: 'duplicate' };
    }
    throw new Error(`Failed to insert points ledger: ${ledgerError.message}`);
  }

  return { success: true, amount: effectiveAmount, newBalance: newClaimable };
}

// ─── Promotion Costs ────────────────────────────────────────────────────

export type PromotionTier = 'spotlight' | 'feature' | 'mega';

export const PROMOTION_CONFIG: Record<
  PromotionTier,
  { cost: number; durationHours: number; multiplier: number; label: string }
> = {
  spotlight: { cost: 25, durationHours: 24, multiplier: 1.5, label: 'Spotlight' },
  feature: { cost: 50, durationHours: 48, multiplier: 2.0, label: 'Feature' },
  mega: { cost: 100, durationHours: 72, multiplier: 2.5, label: 'Mega Boost' },
};

/**
 * Get the engagement reward multiplier for a post.
 * Returns 1.0 for non-promoted posts or expired promotions.
 */
export function getPromotionMultiplier(
  isPromoted: boolean,
  promotionTier: PromotionTier | null,
  promotionExpiresAt: string | null
): number {
  if (!isPromoted || !promotionTier || !promotionExpiresAt) return 1.0;
  if (new Date(promotionExpiresAt) < new Date()) return 1.0;
  return PROMOTION_CONFIG[promotionTier]?.multiplier ?? 1.0;
}

// ─── Exports for UI ─────────────────────────────────────────────────────

export const ECONOMY_CONSTANTS = {
  FREE_ORGANIC_POSTS_PER_WEEK,
  WEEKLY_ENGAGEMENT_POINTS_CAP,
  NON_ORGANIC_COSTS,
  ORGANIC_COSTS,
  PROMOTION_CONFIG,
} as const;
