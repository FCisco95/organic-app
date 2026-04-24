import type { SupabaseClient } from '@supabase/supabase-js';
import { asEngDb } from '@/features/engagement/db';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import { awardXp } from '@/features/gamification/xp-service';
import { ENGAGEMENT_DEFAULTS, readEngagementConfig } from './types';
import { commentScoreToXp, resolvePayoutConfig } from './payout-math';

type DbClient = SupabaseClient<Database>;

// ─── Pure tally logic (unit-testable, no DB) ───────────────────────────

export interface AppealTally {
  upholdVotes: number;
  overturnVotes: number;
  upholdWeight: number;
  overturnWeight: number;
}

export type AppealOutcome =
  | { kind: 'resolved_uphold' }
  | { kind: 'resolved_overturn' }
  | { kind: 'expired_no_quorum' }
  | { kind: 'escalated_to_arbitrator' };

/**
 * Decides the final status of an appeal based on its vote tally and the
 * configured quorum. Escalation vs expiry: if no quorum is met by the
 * window end, route to the arbitrator flow (never just drop the appeal).
 */
export function resolveAppealOutcome(tally: AppealTally, quorum: number): AppealOutcome {
  const totalVotes = tally.upholdVotes + tally.overturnVotes;
  if (totalVotes < quorum) {
    return { kind: 'escalated_to_arbitrator' };
  }

  // Weighted-majority decision. Ties (equal weight) → uphold (default to
  // keeping the existing AI score so the community has to actively overturn).
  if (tally.overturnWeight > tally.upholdWeight) {
    return { kind: 'resolved_overturn' };
  }
  return { kind: 'resolved_uphold' };
}

// ─── File an appeal ────────────────────────────────────────────────────

export interface FileAppealInput {
  submissionId: string;
  appellantId: string;
  reason: string;
  proposedScore?: number | null;
}

export interface FileAppealResult {
  ok: boolean;
  appealId?: string;
  error?: string;
}

export async function fileAppeal(supabase: DbClient, input: FileAppealInput): Promise<FileAppealResult> {
  const { data: orgRow } = await asEngDb(supabase)
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();
  const cfg = readEngagementConfig(orgRow?.gamification_config);
  const windowHours = cfg.appeal_window_hours ?? ENGAGEMENT_DEFAULTS.appeal_window_hours;

  // Enforce: only the submission's author may file.
  const { data: sub } = await asEngDb(supabase)
    .from('engagement_submissions')
    .select('id, user_id, engagement_type')
    .eq('id', input.submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: 'submission_not_found' };
  if ((sub.user_id as string) !== input.appellantId) {
    return { ok: false, error: 'forbidden_not_author' };
  }
  // Only comment-type submissions can be appealed (likes/retweets are binary-verifiable).
  if ((sub.engagement_type as string) !== 'comment') {
    return { ok: false, error: 'only_comments_appealable' };
  }

  const votingEndsAt = new Date(Date.now() + windowHours * 60 * 60 * 1000).toISOString();
  const { data: inserted, error } = await asEngDb(supabase)
    .from('engagement_appeals')
    .insert(
      {
        submission_id: input.submissionId,
        appellant_id: input.appellantId,
        reason: input.reason,
        proposed_score: input.proposedScore ?? null,
        voting_ends_at: votingEndsAt,
      } as never
    )
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { ok: false, error: 'appeal_already_exists' };
    }
    logger.error('[engagement.dao-vote] fileAppeal failed', error);
    return { ok: false, error: 'insert_failed' };
  }

  await supabase.from('activity_log').insert(
    {
      event_type: 'x_engagement_appeal_opened',
      actor_id: input.appellantId,
      subject_type: 'engagement_appeal',
      subject_id: (inserted as { id: string }).id,
      metadata: {
        submission_id: input.submissionId,
        proposed_score: input.proposedScore ?? null,
      },
    } as never
  );

  return { ok: true, appealId: (inserted as { id: string }).id };
}

// ─── Cast an appeal vote ───────────────────────────────────────────────

export interface CastVoteInput {
  appealId: string;
  voterId: string;
  vote: 'uphold' | 'overturn';
}

export interface CastVoteResult {
  ok: boolean;
  error?: string;
}

export async function castAppealVote(supabase: DbClient, input: CastVoteInput): Promise<CastVoteResult> {
  // Load appeal + voter profile in parallel.
  const [appealRes, profileRes] = await Promise.all([
    asEngDb(supabase)
      .from('engagement_appeals')
      .select('id, appellant_id, status, voting_ends_at')
      .eq('id', input.appealId)
      .maybeSingle(),
    supabase.from('user_profiles').select('id, xp_total, organic_id').eq('id', input.voterId).maybeSingle(),
  ]);
  const appeal = appealRes.data;
  const profile = profileRes.data;
  if (!appeal) return { ok: false, error: 'appeal_not_found' };
  if (!profile) return { ok: false, error: 'voter_not_found' };
  if (profile.organic_id == null) return { ok: false, error: 'organic_id_required' };

  if ((appeal.appellant_id as string) === input.voterId) {
    return { ok: false, error: 'cannot_vote_own_appeal' };
  }
  if ((appeal.status as string) !== 'open') {
    return { ok: false, error: 'appeal_not_open' };
  }
  if (new Date(appeal.voting_ends_at as string).getTime() <= Date.now()) {
    return { ok: false, error: 'appeal_window_closed' };
  }

  const weight = Math.max(0, (profile.xp_total as number) ?? 0);

  // Insert vote. Unique (appeal_id, voter_id) prevents double-voting.
  const { error: voteErr } = await asEngDb(supabase).from('engagement_appeal_votes').insert(
    {
      appeal_id: input.appealId,
      voter_id: input.voterId,
      vote: input.vote,
      vote_weight: weight,
    } as never
  );
  if (voteErr) {
    if ((voteErr as { code?: string }).code === '23505') {
      return { ok: false, error: 'already_voted' };
    }
    logger.error('[engagement.dao-vote] vote insert failed', voteErr);
    return { ok: false, error: 'insert_failed' };
  }

  // Update denormalized counters on the appeal.
  const countCol = input.vote === 'uphold' ? 'vote_count_uphold' : 'vote_count_overturn';
  const weightCol = input.vote === 'uphold' ? 'vote_weight_uphold' : 'vote_weight_overturn';

  const { data: current } = await asEngDb(supabase)
    .from('engagement_appeals')
    .select(`${countCol}, ${weightCol}`)
    .eq('id', input.appealId)
    .single();
  const currentCount = ((current as Record<string, number> | null)?.[countCol] as number | undefined) ?? 0;
  const currentWeight = ((current as Record<string, number> | null)?.[weightCol] as number | undefined) ?? 0;

  await asEngDb(supabase)
    .from('engagement_appeals')
    .update({
      [countCol]: currentCount + 1,
      [weightCol]: currentWeight + weight,
    } as never)
    .eq('id', input.appealId);

  return { ok: true };
}

// ─── Resolve an appeal (called by the appeals-sweep cron) ──────────────

export interface ResolveAppealResult {
  ok: boolean;
  outcome?: AppealOutcome['kind'];
  xpDelta?: number;
  error?: string;
}

export async function resolveAppeal(supabase: DbClient, appealId: string): Promise<ResolveAppealResult> {
  const { data: appeal } = await asEngDb(supabase)
    .from('engagement_appeals')
    .select(
      `
      id, submission_id, appellant_id, status, voting_ends_at, proposed_score,
      vote_count_uphold, vote_count_overturn, vote_weight_uphold, vote_weight_overturn
    `
    )
    .eq('id', appealId)
    .maybeSingle();

  if (!appeal) return { ok: false, error: 'not_found' };
  if ((appeal.status as string) !== 'open') return { ok: false, error: 'not_open' };
  if (new Date(appeal.voting_ends_at as string).getTime() > Date.now()) {
    return { ok: false, error: 'window_not_closed' };
  }

  const { data: orgRow } = await asEngDb(supabase)
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();
  const cfg = readEngagementConfig(orgRow?.gamification_config);
  const quorum = cfg.appeal_quorum ?? ENGAGEMENT_DEFAULTS.appeal_quorum;
  const payoutConfig = resolvePayoutConfig(cfg);

  const tally: AppealTally = {
    upholdVotes: (appeal.vote_count_uphold as number) ?? 0,
    overturnVotes: (appeal.vote_count_overturn as number) ?? 0,
    upholdWeight: (appeal.vote_weight_uphold as number) ?? 0,
    overturnWeight: (appeal.vote_weight_overturn as number) ?? 0,
  };
  const outcome = resolveAppealOutcome(tally, quorum);

  let xpDelta = 0;
  let newStatus: string;

  if (outcome.kind === 'resolved_overturn') {
    newStatus = 'resolved_overturn';
    // Recompute XP from proposed_score; if proposed_score is null, treat it
    // as +1 above the original (community implicitly bumped it).
    const { data: sub } = await asEngDb(supabase)
      .from('engagement_submissions')
      .select('id, user_id, comment_score, xp_awarded, wave_multiplier, rank')
      .eq('id', appeal.submission_id as string)
      .single();

    if (sub) {
      const originalScore = (sub.comment_score as number | null) ?? 1;
      const newScore = (appeal.proposed_score as number | null) ?? Math.min(originalScore + 1, 5);
      const newBaseXp = commentScoreToXp(newScore, payoutConfig);
      const rank = (sub.rank as number) ?? 1;
      const rankMultiplier =
        rank - 1 < payoutConfig.rankDecay.length
          ? payoutConfig.rankDecay[rank - 1]!
          : payoutConfig.defaultMultiplierBeyondRank;
      const newXp = Math.max(
        0,
        Math.round(newBaseXp * rankMultiplier * ((sub.wave_multiplier as number) ?? 1))
      );
      xpDelta = newXp - ((sub.xp_awarded as number) ?? 0);

      await asEngDb(supabase)
        .from('engagement_submissions')
        .update(
          {
            comment_score: newScore,
            xp_awarded: newXp,
          } as never
        )
        .eq('id', sub.id as string);

      // Apply delta via awardXp so it goes through xp_events ledger with a
      // distinct source_id (one per resolution, replay-safe).
      if (xpDelta > 0) {
        await awardXp(supabase, {
          userId: sub.user_id as string,
          eventType: 'x_engagement_appeal_resolved',
          xpAmount: xpDelta,
          sourceType: 'engagement_appeal',
          sourceId: `appeal_overturn:${appealId}`,
          metadata: {
            submission_id: sub.id,
            original_score: originalScore,
            new_score: newScore,
          },
        });
      }
      // NB: we don't claw back XP on downward overturn — intentional
      // to keep the UX non-punitive; admin tooling can adjust via
      // points_ledger if truly needed.
    }
  } else if (outcome.kind === 'resolved_uphold') {
    newStatus = 'resolved_uphold';
  } else if (outcome.kind === 'expired_no_quorum') {
    newStatus = 'expired_no_quorum';
  } else {
    newStatus = 'escalated_to_arbitrator';
  }

  await asEngDb(supabase)
    .from('engagement_appeals')
    .update(
      {
        status: newStatus,
        resolution_xp_delta: xpDelta,
        resolved_at: new Date().toISOString(),
      } as never
    )
    .eq('id', appealId);

  await supabase.from('activity_log').insert(
    {
      event_type: 'x_engagement_appeal_resolved',
      actor_id: appeal.appellant_id as string,
      subject_type: 'engagement_appeal',
      subject_id: appealId,
      metadata: {
        outcome: newStatus,
        xp_delta: xpDelta,
        vote_count_uphold: tally.upholdVotes,
        vote_count_overturn: tally.overturnVotes,
      },
    } as never
  );

  return { ok: true, outcome: outcome.kind, xpDelta };
}

/**
 * Cron sweep: resolve every open appeal whose voting_ends_at has passed.
 */
export async function sweepExpiredAppeals(supabase: DbClient): Promise<{ resolved: number }> {
  const { data: expired } = await asEngDb(supabase)
    .from('engagement_appeals')
    .select('id')
    .eq('status', 'open')
    .lte('voting_ends_at', new Date().toISOString())
    .limit(100);

  if (!expired || expired.length === 0) return { resolved: 0 };

  let resolved = 0;
  for (const row of expired) {
    const result = await resolveAppeal(supabase, row.id as string);
    if (result.ok) resolved++;
  }
  return { resolved };
}
