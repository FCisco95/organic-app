import type { SupabaseClient } from '@supabase/supabase-js';
import { asEngDb } from '@/features/engagement/db';
import type { Database } from '@/types/database';
import { TwitterClient } from '@/lib/twitter/client';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { awardXp } from '@/features/gamification/xp-service';
import {
  DEFAULT_PAYOUT_CONFIG,
  computePayout,
  resolvePayoutConfig,
  type EngagementPayoutConfig,
} from './payout-math';
import { scoreComment, type RubricExample } from './comment-scorer';
import { ENGAGEMENT_DEFAULTS, readEngagementConfig } from './types';
import type { EngagementType } from './payout-math';

type DbClient = SupabaseClient<Database>;

interface CrawlerToken {
  accountId: string;
  accessToken: string;
}

/**
 * Loads a "crawler" Twitter token for read-only public API calls. Prefers
 * an admin/council linked account. Refreshes the token if it's expired.
 */
async function loadCrawlerToken(supabase: DbClient, twitter: TwitterClient): Promise<CrawlerToken | null> {
  const encryptionKey = process.env.TWITTER_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    logger.error('[engagement.processor] TWITTER_TOKEN_ENCRYPTION_KEY not set');
    return null;
  }

  const { data } = await asEngDb(supabase)
    .from('twitter_accounts')
    .select('id, user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    logger.warn('[engagement.processor] no active twitter_accounts available for crawling');
    return null;
  }

  let accessToken = '';
  try {
    accessToken = decryptToken(data.access_token_encrypted as string, encryptionKey);
  } catch (err) {
    logger.error('[engagement.processor] failed to decrypt crawler access token', err);
    return null;
  }

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at as string).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() < 60_000 && data.refresh_token_encrypted) {
    try {
      const refreshToken = decryptToken(data.refresh_token_encrypted as string, encryptionKey);
      const refreshed = await twitter.refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await asEngDb(supabase)
        .from('twitter_accounts')
        .update({
          access_token_encrypted: encryptToken(refreshed.access_token, encryptionKey),
          refresh_token_encrypted: refreshed.refresh_token
            ? encryptToken(refreshed.refresh_token, encryptionKey)
            : (data.refresh_token_encrypted as string),
          token_expires_at: newExpiresAt,
        } as never)
        .eq('id', data.id as string);
    } catch (err) {
      logger.error('[engagement.processor] token refresh failed', err);
      return null;
    }
  }

  return { accountId: data.id as string, accessToken };
}

/**
 * Resolves the active sprint whose execution window currently includes `now`.
 * Returns null if no active sprint is running.
 */
async function findActiveSprintId(supabase: DbClient, now: Date = new Date()): Promise<string | null> {
  const { data } = await asEngDb(supabase)
    .from('sprints')
    .select('id, start_date, end_date, status')
    .in('status', ['active', 'review', 'dispute_window', 'settlement'])
    .lte('start_date', now.toISOString())
    .gte('end_date', now.toISOString())
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ─── Phase 1: discover new posts from allowlisted handles ──────────────

async function discoverNewPosts(
  supabase: DbClient,
  twitter: TwitterClient,
  crawler: CrawlerToken,
  config: ReturnType<typeof readEngagementConfig>
): Promise<number> {
  const { data: handles } = await asEngDb(supabase)
    .from('engagement_handles')
    .select('id, handle, last_seen_tweet_id')
    .eq('is_active', true);

  if (!handles || handles.length === 0) return 0;

  const windowDays = config.engagement_window_days ?? ENGAGEMENT_DEFAULTS.engagement_window_days;
  const poolDefault = config.post_pool_default ?? ENGAGEMENT_DEFAULTS.post_pool_default;
  const activeSprintId = await findActiveSprintId(supabase);

  let discovered = 0;

  for (const h of handles) {
    try {
      const { tweets } = await twitter.fetchPostsByHandle(crawler.accessToken, h.handle as string, {
        sinceId: (h.last_seen_tweet_id as string | null) ?? undefined,
        maxResults: 20,
      });

      let maxSeenId: string | null = (h.last_seen_tweet_id as string | null) ?? null;

      for (const tw of tweets) {
        const postedAt = tw.created_at;
        const windowEndsAt = new Date(
          new Date(postedAt).getTime() + windowDays * 24 * 60 * 60 * 1000
        ).toISOString();

        const { error } = await asEngDb(supabase).from('engagement_posts').upsert(
          {
            handle_id: h.id as string,
            tweet_id: tw.id,
            posted_at: postedAt,
            sprint_id: activeSprintId,
            pool_size: poolDefault,
            engagement_window_ends_at: windowEndsAt,
          } as never,
          { onConflict: 'tweet_id' }
        );

        if (!error) discovered++;
        if (!maxSeenId || BigInt(tw.id) > BigInt(maxSeenId)) maxSeenId = tw.id;
      }

      await asEngDb(supabase)
        .from('engagement_handles')
        .update({ last_polled_at: new Date().toISOString(), last_seen_tweet_id: maxSeenId } as never)
        .eq('id', h.id as string);
    } catch (err) {
      logger.error(`[engagement.processor] discover failed for @${h.handle}`, err);
    }
  }

  return discovered;
}

// ─── Phase 2: process engagement on open posts ─────────────────────────

interface LinkedAccount {
  user_id: string;
  twitter_account_id: string;
  twitter_user_id: string;
}

async function loadEligibleLinkedAccounts(supabase: DbClient): Promise<LinkedAccount[]> {
  const { data } = await asEngDb(supabase)
    .from('twitter_accounts')
    .select('id, user_id, twitter_user_id, user_profiles!inner(organic_id)')
    .eq('is_active', true)
    .not('user_profiles.organic_id', 'is', null);

  return (data ?? []).map((r) => ({
    user_id: r.user_id as string,
    twitter_account_id: r.id as string,
    twitter_user_id: r.twitter_user_id as string,
  }));
}

async function loadRubricExamples(supabase: DbClient): Promise<RubricExample[]> {
  const { data } = await asEngDb(supabase)
    .from('engagement_rubric_examples')
    .select('comment, ideal_score, rationale')
    .eq('is_active', true)
    .limit(20);
  return (data ?? []).map((r) => ({
    comment: r.comment as string,
    ideal_score: r.ideal_score as number,
    rationale: (r.rationale as string | null) ?? null,
  }));
}

async function computeNextRank(
  supabase: DbClient,
  postId: string,
  engagementType: EngagementType
): Promise<number> {
  const { count } = await asEngDb(supabase)
    .from('engagement_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('engagement_type', engagementType);
  return (count ?? 0) + 1;
}

async function hasSubmission(
  supabase: DbClient,
  postId: string,
  userId: string,
  engagementType: EngagementType
): Promise<boolean> {
  const { count } = await asEngDb(supabase)
    .from('engagement_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('engagement_type', engagementType);
  return (count ?? 0) > 0;
}

async function processPostEngagements(
  supabase: DbClient,
  twitter: TwitterClient,
  crawler: CrawlerToken,
  post: { id: string; tweet_id: string; posted_at: string; reply_pagination_token: string | null },
  linked: LinkedAccount[],
  rubricExamples: RubricExample[],
  payoutConfig: EngagementPayoutConfig,
  calibrationRate: number,
  now: Date = new Date()
): Promise<{ processed: number }> {
  let processed = 0;

  // Likes & retweets — per-user verify endpoints.
  for (const acc of linked) {
    // Like
    try {
      if (!(await hasSubmission(supabase, post.id, acc.user_id, 'like'))) {
        const res = await twitter.verifyLike(crawler.accessToken, acc.twitter_user_id, post.tweet_id);
        if (res.verified) {
          await recordEngagement(
            supabase,
            post,
            acc,
            'like',
            now.toISOString(),
            payoutConfig,
            calibrationRate,
            null
          );
          processed++;
        }
      }
    } catch (err) {
      logger.error(`[engagement.processor] verifyLike failed for user ${acc.user_id}`, err);
    }

    // Retweet
    try {
      if (!(await hasSubmission(supabase, post.id, acc.user_id, 'retweet'))) {
        const res = await twitter.verifyRetweet(crawler.accessToken, post.tweet_id, acc.twitter_user_id);
        if (res.verified) {
          await recordEngagement(
            supabase,
            post,
            acc,
            'retweet',
            now.toISOString(),
            payoutConfig,
            calibrationRate,
            null
          );
          processed++;
        }
      }
    } catch (err) {
      logger.error(`[engagement.processor] verifyRetweet failed for user ${acc.user_id}`, err);
    }
  }

  // Comments — fetch replies once, then match author_id → linked user.
  try {
    const { replies, nextToken } = await twitter.fetchReplies(crawler.accessToken, post.tweet_id, {
      paginationToken: post.reply_pagination_token ?? undefined,
    });
    const byAuthor = new Map(linked.map((a) => [a.twitter_user_id, a]));

    for (const reply of replies) {
      const acc = byAuthor.get(reply.author_id);
      if (!acc) continue;
      if (await hasSubmission(supabase, post.id, acc.user_id, 'comment')) continue;

      const scoreResult = await scoreComment({
        postText: '', // post text not stored on engagement_posts; keep minimal
        commentText: reply.text,
        examples: rubricExamples,
      });
      const score = scoreResult.score!;

      await recordEngagement(
        supabase,
        post,
        acc,
        'comment',
        reply.created_at,
        payoutConfig,
        calibrationRate,
        {
          commentTweetId: reply.id,
          commentText: reply.text,
          score,
          model: scoreResult.model,
          promptVersion: scoreResult.promptVersion,
        }
      );
      processed++;
    }

    await asEngDb(supabase)
      .from('engagement_posts')
      .update({
        last_polled_at: now.toISOString(),
        reply_pagination_token: nextToken,
      } as never)
      .eq('id', post.id);
  } catch (err) {
    logger.error(`[engagement.processor] fetchReplies failed for tweet ${post.tweet_id}`, err);
  }

  return { processed };
}

interface CommentPayload {
  commentTweetId: string;
  commentText: string;
  score: Awaited<ReturnType<typeof scoreComment>>['score'];
  model: string;
  promptVersion: string;
}

async function recordEngagement(
  supabase: DbClient,
  post: { id: string; tweet_id: string; posted_at: string },
  acc: LinkedAccount,
  engagementType: EngagementType,
  engagedAt: string,
  payoutConfig: EngagementPayoutConfig,
  calibrationRate: number,
  comment: CommentPayload | null
): Promise<void> {
  const rank = await computeNextRank(supabase, post.id, engagementType);
  const breakdown = computePayout(
    {
      engagementType,
      rank,
      postedAt: post.posted_at,
      engagedAt,
      commentScore: comment?.score?.score ?? null,
    },
    payoutConfig
  );

  const sourceId = `engagement:${post.id}:${acc.user_id}:${engagementType}`;

  const { data: inserted, error: insertError } = await asEngDb(supabase)
    .from('engagement_submissions')
    .insert(
      {
        post_id: post.id,
        user_id: acc.user_id,
        twitter_account_id: acc.twitter_account_id,
        twitter_user_id: acc.twitter_user_id,
        engagement_type: engagementType,
        engaged_at: engagedAt,
        rank,
        wave_multiplier: breakdown.waveMultiplier,
        comment_tweet_id: comment?.commentTweetId ?? null,
        comment_text: comment?.commentText ?? null,
        comment_score: comment?.score?.score ?? null,
        comment_score_axes: comment?.score?.axes ?? null,
        comment_score_reasoning: comment?.score?.reasoning ?? null,
        comment_score_model: comment?.model ?? null,
        comment_score_version: comment?.promptVersion ?? null,
        xp_awarded: breakdown.xpAwarded,
        awarded_at: new Date().toISOString(),
      } as never
    )
    .select('id')
    .single();

  if (insertError) {
    // 23505 = unique violation = we already recorded this; safe to skip.
    if ((insertError as { code?: string }).code === '23505') return;
    logger.error('[engagement.processor] submission insert failed', insertError);
    return;
  }

  if (breakdown.xpAwarded > 0) {
    await awardXp(supabase, {
      userId: acc.user_id,
      eventType: `x_engagement_${engagementType}`,
      xpAmount: breakdown.xpAwarded,
      sourceType: 'engagement_submission',
      sourceId,
      metadata: {
        post_id: post.id,
        tweet_id: post.tweet_id,
        rank,
        wave_multiplier: breakdown.waveMultiplier,
        comment_score: comment?.score?.score ?? null,
      },
    });
  }

  // 5% calibration sample for comments only.
  if (comment && Math.random() < calibrationRate) {
    await asEngDb(supabase).from('engagement_calibration_samples').insert(
      {
        submission_id: (inserted as { id: string }).id,
        ai_score: comment.score!.score,
      } as never
    );
  }

  // Fan-out activity_log notification.
  await supabase.from('activity_log').insert(
    {
      event_type: `x_engagement_${engagementType}`,
      actor_id: acc.user_id,
      subject_type: 'engagement_submission',
      subject_id: (inserted as { id: string }).id,
      metadata: {
        xp_awarded: breakdown.xpAwarded,
        rank,
        post_id: post.id,
        tweet_id: post.tweet_id,
      },
    } as never
  );
}

// ─── Public entry point ────────────────────────────────────────────────

export interface ProcessTickResult {
  ok: boolean;
  discoveredPosts: number;
  processedEngagements: number;
  error?: string;
}

/**
 * Full per-tick orchestration. Idempotent: rerunning with no X-side changes
 * is a no-op thanks to (post_id, user_id, engagement_type) unique constraint
 * and xp_events deduplication on sourceId.
 */
export async function processEngagementTick(supabase: DbClient): Promise<ProcessTickResult> {
  try {
    const twitter = new TwitterClient();
    const crawler = await loadCrawlerToken(supabase, twitter);
    if (!crawler) {
      return { ok: false, discoveredPosts: 0, processedEngagements: 0, error: 'no_crawler_token' };
    }

    const { data: orgRow } = await asEngDb(supabase)
      .from('orgs')
      .select('gamification_config')
      .limit(1)
      .single();
    const engagementConfig = readEngagementConfig(orgRow?.gamification_config);
    const payoutConfig = resolvePayoutConfig({ ...engagementConfig });
    const calibrationRate =
      engagementConfig.calibration_sample_rate ?? ENGAGEMENT_DEFAULTS.calibration_sample_rate;

    const discoveredPosts = await discoverNewPosts(supabase, twitter, crawler, engagementConfig);

    // Load open posts (window not expired, not excluded).
    const nowIso = new Date().toISOString();
    const { data: openPosts } = await asEngDb(supabase)
      .from('engagement_posts')
      .select('id, tweet_id, posted_at, reply_pagination_token')
      .eq('is_excluded', false)
      .gt('engagement_window_ends_at', nowIso)
      .order('posted_at', { ascending: true });

    if (!openPosts || openPosts.length === 0) {
      return { ok: true, discoveredPosts, processedEngagements: 0 };
    }

    const linked = await loadEligibleLinkedAccounts(supabase);
    const rubricExamples = await loadRubricExamples(supabase);

    let processed = 0;
    for (const post of openPosts) {
      const result = await processPostEngagements(
        supabase,
        twitter,
        crawler,
        {
          id: post.id as string,
          tweet_id: post.tweet_id as string,
          posted_at: post.posted_at as string,
          reply_pagination_token: (post.reply_pagination_token as string | null) ?? null,
        },
        linked,
        rubricExamples,
        payoutConfig,
        calibrationRate
      );
      processed += result.processed;
    }

    return { ok: true, discoveredPosts, processedEngagements: processed };
  } catch (err) {
    logger.error('[engagement.processor] tick failed', err);
    return {
      ok: false,
      discoveredPosts: 0,
      processedEngagements: 0,
      error: String(err),
    };
  }
}

// Silence unused warning when DEFAULT_PAYOUT_CONFIG is only referenced via resolvePayoutConfig
void DEFAULT_PAYOUT_CONFIG;
