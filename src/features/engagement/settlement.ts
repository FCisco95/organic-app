import type { SupabaseClient } from '@supabase/supabase-js';
import { asEngDb } from '@/features/engagement/db';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import { awardXp } from '@/features/gamification/xp-service';
import { distributeSprintBonus } from './payout-math';
import { ENGAGEMENT_DEFAULTS, readEngagementConfig } from './types';

type DbClient = SupabaseClient<Database>;

export interface SettlementResult {
  ok: boolean;
  postsProcessed: number;
  usersAwarded: number;
  totalXp: number;
  error?: string;
}

/**
 * Distributes sprint-end Top-Engagers bonus pools.
 *
 * For each engagement_post assigned to the given sprint, aggregates per-user
 * earned XP and allocates `pool_size` to the top-N engagers proportionally.
 *
 * Idempotent via awardXp sourceId = "engagement_bonus:{sprintId}:{postId}:{userId}".
 *
 * Appealed-but-open submissions are excluded from the score aggregation — so
 * contested engagement cannot skew the bonus distribution until resolved.
 */
export async function settleSprintEngagementBonuses(
  supabase: DbClient,
  sprintId: string
): Promise<SettlementResult> {
  try {
    const { data: orgRow } = await asEngDb(supabase)
      .from('orgs')
      .select('gamification_config')
      .limit(1)
      .single();
    const engagementConfig = readEngagementConfig(orgRow?.gamification_config);
    const topN = engagementConfig.sprint_bonus_top_n ?? ENGAGEMENT_DEFAULTS.sprint_bonus_top_n;

    const { data: posts } = await asEngDb(supabase)
      .from('engagement_posts')
      .select('id, pool_size')
      .eq('sprint_id', sprintId)
      .eq('is_excluded', false);

    if (!posts || posts.length === 0) {
      return { ok: true, postsProcessed: 0, usersAwarded: 0, totalXp: 0 };
    }

    let usersAwarded = 0;
    let totalXp = 0;

    for (const post of posts) {
      const postId = post.id as string;
      const poolSize = (post.pool_size as number) ?? 0;
      if (poolSize <= 0) continue;

      const { data: subs } = await asEngDb(supabase)
        .from('engagement_submissions')
        .select('user_id, xp_awarded, id, engagement_appeals!left(status)')
        .eq('post_id', postId);

      const scoresByUser: Record<string, number> = {};
      for (const s of subs ?? []) {
        const appealRel = (s as { engagement_appeals?: { status?: string }[] }).engagement_appeals;
        const hasOpenAppeal =
          Array.isArray(appealRel) && appealRel.some((a) => a?.status === 'open');
        if (hasOpenAppeal) continue;
        const uid = s.user_id as string;
        scoresByUser[uid] = (scoresByUser[uid] ?? 0) + ((s.xp_awarded as number) ?? 0);
      }

      const distribution = distributeSprintBonus(poolSize, scoresByUser, topN);
      for (const [userId, bonusXp] of Object.entries(distribution)) {
        if (bonusXp <= 0) continue;
        const sourceId = `engagement_bonus:${sprintId}:${postId}:${userId}`;
        const result = await awardXp(supabase, {
          userId,
          eventType: 'x_engagement_sprint_bonus',
          xpAmount: bonusXp,
          sourceType: 'engagement_post',
          sourceId,
          metadata: {
            sprint_id: sprintId,
            post_id: postId,
            pool_size: poolSize,
            earned_xp_on_post: scoresByUser[userId],
          },
        });
        if (result.awarded) {
          usersAwarded++;
          totalXp += result.xpAwarded;
        }
      }
    }

    return { ok: true, postsProcessed: posts.length, usersAwarded, totalXp };
  } catch (err) {
    logger.error('[engagement.settlement] failed', err);
    return {
      ok: false,
      postsProcessed: 0,
      usersAwarded: 0,
      totalXp: 0,
      error: String(err),
    };
  }
}
