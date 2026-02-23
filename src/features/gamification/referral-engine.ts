import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ReferralCode, ReferralStats, ReferralTier, GamificationConfig } from './types';

type DbClient = SupabaseClient<Database>;
type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

const DEFAULT_TIERS: ReferralTier[] = [
  { name: 'Bronze', min: 1, max: 5, multiplier: 1.0 },
  { name: 'Silver', min: 6, max: 15, multiplier: 1.25 },
  { name: 'Gold', min: 16, max: null, multiplier: 1.5 },
];

function isMissingRelationError(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

function isUniqueViolation(error: PostgrestLikeError | null | undefined): boolean {
  return (error?.code ?? '') === '23505';
}

function resolveBaseUrl(baseUrl?: string): string {
  const candidate =
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function calculateReferralTier(
  totalReferrals: number,
  tiers: ReferralTier[]
): ReferralTier {
  const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
  for (const tier of sortedTiers) {
    if (totalReferrals >= tier.min) {
      return tier;
    }
  }
  return tiers[0] ?? DEFAULT_TIERS[0];
}

export async function getOrCreateReferralCode(
  supabase: DbClient,
  userId: string
): Promise<ReferralCode> {
  // Try to fetch existing code
  const existingResult = await supabase
    .from('referral_codes' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    if (isMissingRelationError(existingResult.error as PostgrestLikeError)) {
      throw new Error('Referral tables are not available yet');
    }

    if (existingResult.error.code !== 'PGRST116') {
      throw new Error(`Failed to load referral code: ${existingResult.error.message}`);
    }
  }

  const existing = existingResult.data;
  if (existing) {
    return existing as unknown as ReferralCode;
  }

  // Generate new code with retry on collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const insertResult = await supabase
      .from('referral_codes' as any)
      .insert({ user_id: userId, code })
      .select()
      .single();

    const { data, error } = insertResult;
    if (data) return data as unknown as ReferralCode;
    if (isMissingRelationError(error as PostgrestLikeError)) {
      throw new Error('Referral tables are not available yet');
    }

    // Handle races where another request inserted the same user's code.
    if (isUniqueViolation(error as PostgrestLikeError)) {
      const existingByUserResult = await supabase
        .from('referral_codes' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingByUserResult.data) {
        return existingByUserResult.data as unknown as ReferralCode;
      }

      continue;
    }

    if (error) throw new Error(`Failed to create referral code: ${error.message}`);
  }

  throw new Error('Failed to generate unique referral code after 5 attempts');
}

export async function validateReferralCode(
  supabase: DbClient,
  code: string
): Promise<{ referrer_id: string; code_id: string } | null> {
  const { data } = await supabase
    .from('referral_codes' as any)
    .select('id, user_id')
    .eq('code', code)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as { id: string; user_id: string };
  return { referrer_id: row.user_id, code_id: row.id };
}

export async function createReferral(
  supabase: DbClient,
  referrerId: string,
  referredId: string,
  codeId: string
): Promise<string> {
  // Don't allow self-referral
  if (referrerId === referredId) {
    throw new Error('Cannot refer yourself');
  }

  const { data, error } = await supabase
    .from('referrals' as any)
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referral_code_id: codeId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user has already been referred');
    }
    throw new Error(`Failed to create referral: ${error.message}`);
  }

  return (data as unknown as { id: string }).id;
}

async function getGamificationConfig(supabase: DbClient): Promise<GamificationConfig> {
  const { data } = await supabase
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();

  return (data?.gamification_config as unknown ?? {}) as GamificationConfig;
}

export async function completeReferral(
  supabase: DbClient,
  referralId: string,
  actorUserId?: string
): Promise<void> {
  const config = await getGamificationConfig(supabase);
  if (!config.referral_enabled) return;

  // Get referral
  const { data: referral, error: refError } = await supabase
    .from('referrals' as any)
    .select('*')
    .eq('id', referralId)
    .eq('status', 'pending')
    .single();

  if (isMissingRelationError(refError as PostgrestLikeError)) {
    throw new Error('Referral tables are not available yet');
  }
  if (refError || !referral) return;
  const ref = referral as unknown as { referrer_id: string; referred_id: string };

  if (actorUserId && actorUserId !== ref.referrer_id && actorUserId !== ref.referred_id) {
    throw new Error('You are not allowed to complete this referral');
  }

  // Count total completed referrals for tier calculation
  const { count } = await supabase
    .from('referrals' as any)
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', ref.referrer_id)
    .eq('status', 'completed');

  const totalReferrals = (count ?? 0) + 1;
  const tiers = config.referral_tiers ?? DEFAULT_TIERS;
  const tier = calculateReferralTier(totalReferrals, tiers);

  const xpReward = Math.round((config.referral_xp_per_signup ?? 100) * tier.multiplier);

  // Mark referral complete
  const { error: completeError } = await supabase
    .from('referrals' as any)
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', referralId);
  if (completeError) {
    throw new Error(`Failed to complete referral: ${completeError.message}`);
  }

  // Award XP to referrer
  if (xpReward > 0) {
    const { error: rewardsError } = await supabase.from('referral_rewards' as any).insert({
      referral_id: referralId,
      referrer_id: ref.referrer_id,
      reward_type: 'xp',
      amount: xpReward,
    });
    if (rewardsError) {
      throw new Error(`Failed to store referral reward: ${rewardsError.message}`);
    }

    // Update user XP — try RPC first, fall back to direct update
    const { error: rpcError } = await supabase.rpc('award_referral_xp' as never, {
      p_user_id: ref.referrer_id,
      p_xp_amount: xpReward,
      p_referral_id: referralId,
    } as never);

    if (rpcError) {
      // RPC may not exist yet, fall back to direct XP update
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('xp_total')
        .eq('id', ref.referrer_id)
        .single();

      if (profile) {
        const newXp = (profile.xp_total ?? 0) + xpReward;
        const updateData: Record<string, unknown> = { xp_total: newXp };
        if (config.leveling_mode !== 'manual_burn') {
          const levelFromXp = (xp: number) => {
            if (xp >= 80000) return 11;
            if (xp >= 40000) return 10;
            if (xp >= 20000) return 9;
            if (xp >= 10000) return 8;
            if (xp >= 5000) return 7;
            if (xp >= 2500) return 6;
            if (xp >= 1200) return 5;
            if (xp >= 600) return 4;
            if (xp >= 300) return 3;
            if (xp >= 100) return 2;
            return 1;
          };
          updateData.level = levelFromXp(newXp);
        }
        await supabase
          .from('user_profiles')
          .update(updateData as never)
          .eq('id', ref.referrer_id);
      }
    }

    // Insert XP event for tracking
    const { error: xpEventError } = await supabase.from('xp_events').insert({
      user_id: ref.referrer_id,
      event_type: 'referral_completed',
      source_type: 'referral',
      source_id: referralId,
      xp_amount: xpReward,
      metadata: { referred_user_id: ref.referred_id, tier: tier.name },
    });
    if (xpEventError && !isUniqueViolation(xpEventError as PostgrestLikeError)) {
      throw new Error(`Failed to log referral XP event: ${xpEventError.message}`);
    }
  }
}

export async function getReferralStats(
  supabase: DbClient,
  userId: string,
  baseUrl?: string
): Promise<ReferralStats> {
  const config = await getGamificationConfig(supabase);
  const referralCode = await getOrCreateReferralCode(supabase, userId);
  const origin = resolveBaseUrl(baseUrl);

  const [completedResult, pendingResult, rewardsResult] = await Promise.all([
    supabase
      .from('referrals' as any)
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('referrals' as any)
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('referral_rewards' as any)
      .select('reward_type, amount')
      .eq('referrer_id', userId),
  ]);

  if (completedResult.error) {
    throw new Error(`Failed to load completed referrals: ${completedResult.error.message}`);
  }
  if (pendingResult.error) {
    throw new Error(`Failed to load pending referrals: ${pendingResult.error.message}`);
  }
  if (rewardsResult.error) {
    throw new Error(`Failed to load referral rewards: ${rewardsResult.error.message}`);
  }

  const completedReferrals = completedResult.count ?? 0;
  const pendingReferrals = pendingResult.count ?? 0;
  const totalReferrals = completedReferrals + pendingReferrals;

  let totalXpEarned = 0;
  let totalPointsEarned = 0;
  const rewards = (rewardsResult.data ?? []) as unknown as { reward_type: string; amount: number }[];
  for (const reward of rewards) {
    if (reward.reward_type === 'xp') totalXpEarned += reward.amount;
    if (reward.reward_type === 'points') totalPointsEarned += reward.amount;
  }

  const tiers = config.referral_tiers ?? DEFAULT_TIERS;
  const currentTier = calculateReferralTier(completedReferrals, tiers);

  return {
    code: referralCode.code,
    referral_link: `${origin}/join?ref=${referralCode.code}`,
    total_referrals: totalReferrals,
    completed_referrals: completedReferrals,
    pending_referrals: pendingReferrals,
    total_xp_earned: totalXpEarned,
    total_points_earned: totalPointsEarned,
    current_tier: currentTier,
  };
}
