import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import { calculateMarketCap } from '@/config/token';
import { logger } from '@/lib/logger';
import {
  buildMarketDataHeaders,
  getMarketPriceSnapshot,
} from '@/features/market-data/server/service';

export const dynamic = 'force-dynamic';

const RESPONSE_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=300';
const TRUST_WINDOW_DAYS = 30;
const TERMINAL_DISPUTE_STATUSES = new Set(['resolved', 'dismissed', 'withdrawn', 'mediated']);

function countDistinct<T>(rows: T[], key: (row: T) => string | null | undefined): number {
  return new Set(
    rows
      .map(key)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  ).size;
}

// Cache analytics data for 120s — survives cold starts unlike in-memory cache
const getCachedAnalytics = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    const now = Date.now();
    const windowStartIso = new Date(now - TRUST_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [
      usersResult,
      holdersResult,
      tasksResult,
      proposalsResult,
      orgPriceSnapshot,
      activityTrends,
      memberGrowth,
      taskCompletions,
      proposalsByCategory,
      votingParticipation,
      proposalTrustRows,
      disputeTrustRows,
      voteTrustRows,
      submissionTrustRows,
      commentTrustRows,
      activityTrustRows,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .not('wallet_pubkey', 'is', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['voting', 'submitted', 'approved']),
      getMarketPriceSnapshot('org_price'),
      supabase.rpc('get_activity_trends', { days: 30 }),
      supabase.rpc('get_member_growth', { months: 12 }),
      supabase.rpc('get_task_completions', { weeks: 12 }),
      supabase.rpc('get_proposals_by_category'),
      supabase.rpc('get_voting_participation', { result_limit: 10 }),
      supabase
        .from('proposals')
        .select('id, status, result, created_at, updated_at')
        .or(`created_at.gte.${windowStartIso},updated_at.gte.${windowStartIso}`),
      supabase
        .from('disputes')
        .select('id, status, created_at, updated_at')
        .or(`created_at.gte.${windowStartIso},updated_at.gte.${windowStartIso}`),
      supabase.from('votes').select('voter_id').gte('created_at', windowStartIso),
      supabase.from('task_submissions').select('user_id').gte('created_at', windowStartIso),
      supabase.from('comments').select('user_id').gte('created_at', windowStartIso),
      supabase.from('activity_log').select('actor_id').gte('created_at', windowStartIso),
    ]);

    const proposals = proposalTrustRows.data ?? [];
    const disputes = disputeTrustRows.data ?? [];
    const votes = voteTrustRows.data ?? [];
    const submissions = submissionTrustRows.data ?? [];
    const comments = commentTrustRows.data ?? [];
    const activityRows = activityTrustRows.data ?? [];

    const proposalThroughput = {
      created: proposals.filter((row) => row.created_at && row.created_at >= windowStartIso).length,
      finalized: proposals.filter((row) => row.status === 'finalized').length,
      passed: proposals.filter((row) => row.status === 'finalized' && row.result === 'passed').length,
    };

    const disputeAggregate = {
      opened: disputes.filter((row) => row.created_at && row.created_at >= windowStartIso).length,
      resolved: disputes.filter((row) => TERMINAL_DISPUTE_STATUSES.has(String(row.status))).length,
      unresolved: disputes.filter((row) => !TERMINAL_DISPUTE_STATUSES.has(String(row.status))).length,
    };

    const votersCast = countDistinct(votes, (row) => row.voter_id);
    const eligibleVoters = holdersResult.count ?? 0;
    const participationRate =
      eligibleVoters > 0 ? Number(((votersCast / eligibleVoters) * 100).toFixed(1)) : 0;

    const contributorSignals = {
      active_members: countDistinct(activityRows, (row) => row.actor_id),
      task_submitters: countDistinct(submissions, (row) => row.user_id),
      commenters: countDistinct(comments, (row) => row.user_id),
      voters: votersCast,
    };

    return {
      data: {
        kpis: {
          total_users: usersResult.count ?? 0,
          org_holders: holdersResult.count ?? 0,
          tasks_completed: tasksResult.count ?? 0,
          active_proposals: proposalsResult.count ?? 0,
          org_price: orgPriceSnapshot.value,
          market_cap: calculateMarketCap(orgPriceSnapshot.value),
        },
        activity_trends: activityTrends.data ?? [],
        member_growth: memberGrowth.data ?? [],
        task_completions: taskCompletions.data ?? [],
        proposals_by_category: proposalsByCategory.data ?? [],
        voting_participation: votingParticipation.data ?? [],
        trust: {
          proposal_throughput_30d: proposalThroughput,
          dispute_aggregate_30d: disputeAggregate,
          vote_participation_30d: {
            eligible_voters: eligibleVoters,
            voters_cast: votersCast,
            participation_rate: participationRate,
          },
          active_contributor_signals_30d: contributorSignals,
          updated_at: new Date(now).toISOString(),
          refresh_interval_seconds: 120,
        },
      },
      marketSnapshot: orgPriceSnapshot,
    };
  },
  ['analytics-data'],
  { revalidate: 120 }
);

export async function GET() {
  try {
    const response = await getCachedAnalytics();

    return NextResponse.json(
      { data: response.data },
      {
        headers: {
          'Cache-Control': RESPONSE_CACHE_CONTROL,
          ...buildMarketDataHeaders([response.marketSnapshot]),
        },
      }
    );
  } catch (error) {
    logger.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
