import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { createAnonClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/features/rewards';
import { gamificationOverviewSchema, gamificationAchievementSchema } from '@/features/gamification/schemas';
import { getQuestProgress } from '@/features/gamification/quest-engine';
import { getLevelInfo, getXpProgress, getXpRemaining } from '@/features/reputation/types';

const USER_PROFILE_COLUMNS =
  'xp_total, level, current_streak, longest_streak, total_points, tasks_completed, claimable_points, wallet_pubkey';
const XP_EVENT_COLUMNS =
  'id, user_id, event_type, source_type, source_id, xp_amount, metadata, created_at';
const ACHIEVEMENT_COLUMNS =
  'id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id, created_at';

function parseRewardsConfig(value: unknown): RewardsConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_REWARDS_CONFIG;
  }

  const config = value as Partial<RewardsConfig>;
  return {
    enabled:
      typeof config.enabled === 'boolean'
        ? config.enabled
        : DEFAULT_REWARDS_CONFIG.enabled,
    points_to_token_rate:
      typeof config.points_to_token_rate === 'number' && config.points_to_token_rate > 0
        ? config.points_to_token_rate
        : DEFAULT_REWARDS_CONFIG.points_to_token_rate,
    min_claim_threshold:
      typeof config.min_claim_threshold === 'number' && config.min_claim_threshold >= 0
        ? config.min_claim_threshold
        : DEFAULT_REWARDS_CONFIG.min_claim_threshold,
    default_epoch_pool:
      typeof config.default_epoch_pool === 'number' && config.default_epoch_pool >= 0
        ? config.default_epoch_pool
        : DEFAULT_REWARDS_CONFIG.default_epoch_pool,
    claim_requires_wallet:
      typeof config.claim_requires_wallet === 'boolean'
        ? config.claim_requires_wallet
        : DEFAULT_REWARDS_CONFIG.claim_requires_wallet,
  };
}

type AchievementShape = z.infer<typeof gamificationAchievementSchema>;

// Achievements are global static data — fetch once and cache for 5 minutes
// across all users instead of re-querying on every overview call. The
// `achievements` table has an `Anyone can read achievements` RLS policy
// (`USING (true)`), so an anon client suffices and we avoid bypassing RLS.
const getCachedAchievementDefs = unstable_cache(
  async () => {
    const anon = createAnonClient();
    const { data, error } = await anon
      .from('achievements')
      .select('*')
      .order('category', { ascending: true })
      .order('condition_threshold', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  ['gamification-achievement-defs'],
  { revalidate: 300, tags: ['gamification-achievements'] },
);

// Org rewards config rarely changes — cache globally for 5 minutes. The
// `orgs` table has an `Orgs are viewable by everyone` SELECT policy, so an
// anon client can read it without service-role bypass.
const getCachedRewardsConfig = unstable_cache(
  async () => {
    const anon = createAnonClient();
    const { data } = await anon
      .from('orgs')
      .select('rewards_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.rewards_config ?? null;
  },
  ['gamification-rewards-config'],
  { revalidate: 300, tags: ['rewards-config'] },
);

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // NOTE: removed per-request `check_achievements` RPC. Achievements are now
    // synced via write-path triggers / event handlers, not on every read.

    const [
      profileResult,
      xpEventsResult,
      achievementDefs,
      userAchievementsResult,
      rewardsConfigRaw,
      pendingClaimsResult,
      questProgressResult,
    ] = await Promise.all([
      supabase.from('user_profiles').select(USER_PROFILE_COLUMNS).eq('id', user.id).maybeSingle(),
      supabase
        .from('xp_events')
        .select(XP_EVENT_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      getCachedAchievementDefs().catch((error) => {
        logger.warn('Gamification overview achievement defs fallback', error);
        return [];
      }),
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id),
      getCachedRewardsConfig().catch(() => null),
      supabase
        .from('reward_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending'),
      getQuestProgress(supabase, user.id).catch((error) => {
        logger.warn('Gamification overview quest summary fallback', error);
        return null;
      }),
    ]);

    if (profileResult.error) {
      logger.error('Gamification overview profile fetch error', profileResult.error);
      return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 });
    }

    const profile = profileResult.data;
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const unlockedMap = new Map<string, string | null>(
      (userAchievementsResult.data ?? []).map((entry) => [entry.achievement_id, entry.unlocked_at])
    );

    const achievements: AchievementShape[] = achievementDefs.map((achievement) => {
      const row = achievement as Record<string, unknown>;
      return {
        ...achievement,
        category: achievement.category as AchievementShape['category'],
        rarity: ((row.rarity as string) ?? 'bronze') as AchievementShape['rarity'],
        set_id: (row.set_id as string | null) ?? null,
        chain_id: (row.chain_id as string | null) ?? null,
        chain_order: (row.chain_order as number) ?? 0,
        is_hidden: (row.is_hidden as boolean) ?? false,
        prerequisite_achievement_id: (row.prerequisite_achievement_id as string | null) ?? null,
        unlocked: unlockedMap.has(achievement.id),
        unlocked_at: unlockedMap.get(achievement.id) ?? null,
      };
    });
    const achievementCount = achievements.filter((achievement) => achievement.unlocked).length;

    const level = profile.level ?? 1;
    const xpTotal = profile.xp_total ?? 0;
    const levelInfo = getLevelInfo(level);
    const xpToNextLevel = getXpRemaining(xpTotal, level);
    const progressPercent = getXpProgress(xpTotal, level);

    const xpForNextLevel = level >= 11 ? 0 : getLevelInfo(level + 1).xpRequired - levelInfo.xpRequired;
    const xpInLevel = Math.max(0, xpTotal - levelInfo.xpRequired);

    const rewardsConfig = parseRewardsConfig(rewardsConfigRaw);

    const overview = gamificationOverviewSchema.parse({
      xp_total: xpTotal,
      level,
      current_streak: profile.current_streak ?? 0,
      longest_streak: profile.longest_streak ?? 0,
      total_points: profile.total_points ?? 0,
      tasks_completed: profile.tasks_completed ?? 0,
      achievement_count: achievementCount,
      level_progress: {
        level,
        level_name: levelInfo.name,
        xp_total: xpTotal,
        progress_percent: progressPercent,
        xp_to_next_level: xpToNextLevel,
        xp_in_level: xpInLevel,
        xp_for_next_level: xpForNextLevel,
        is_max_level: level >= 11,
      },
      rewards: {
        claimable_points: profile.claimable_points ?? 0,
        pending_claims: pendingClaimsResult.count ?? 0,
        conversion_rate: rewardsConfig.points_to_token_rate,
        min_threshold: rewardsConfig.min_claim_threshold,
        rewards_enabled: rewardsConfig.enabled,
        claim_requires_wallet: rewardsConfig.claim_requires_wallet,
        wallet_address: profile.wallet_pubkey,
      },
      recent_xp_events: xpEventsResult.data ?? [],
      achievements,
      quest_summary:
        questProgressResult?.summary ??
        ({
          completed: 0,
          total: 0,
          items: [],
          note: null,
        } as const),
    });

    return NextResponse.json(overview, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error('Gamification overview API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
