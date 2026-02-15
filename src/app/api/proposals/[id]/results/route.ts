import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VoteTally, VoteResults } from '@/features/voting/types';

const RESPONSE_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=30';
const VOTING_CONFIG_TTL_MS = 5 * 60 * 1000;

let cachedAbstainCountsTowardQuorum: { value: boolean; timestamp: number } | null = null;
type VoteTallyRow = {
  yes_votes: number | string | null;
  no_votes: number | string | null;
  abstain_votes: number | string | null;
  total_votes: number | string | null;
  yes_count: number | string | null;
  no_count: number | string | null;
  abstain_count: number | string | null;
  total_count: number | string | null;
};

/**
 * GET /api/proposals/[id]/results
 * Get vote tallies and participation stats for a proposal.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Get proposal with voting info
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(
        'id, status, voting_starts_at, voting_ends_at, total_circulating_supply, quorum_required, approval_threshold, result'
      )
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Get vote tallies via aggregate RPC (avoids transferring all vote rows).
    // Cast to `never` until generated Supabase types include this new RPC.
    const { data: tallyRows, error: tallyError } = await supabase.rpc(
      'get_proposal_vote_tally' as never,
      { p_proposal_id: proposalId } as never
    );

    if (tallyError) {
      console.error('Error fetching vote tally:', tallyError);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    const rawTallyRows = (tallyRows ?? []) as unknown as VoteTallyRow[];
    const tallyRow = rawTallyRows[0];

    const tally: VoteTally = {
      yes_votes: Number(tallyRow?.yes_votes ?? 0),
      no_votes: Number(tallyRow?.no_votes ?? 0),
      abstain_votes: Number(tallyRow?.abstain_votes ?? 0),
      total_votes: Number(tallyRow?.total_votes ?? 0),
      yes_count: Number(tallyRow?.yes_count ?? 0),
      no_count: Number(tallyRow?.no_count ?? 0),
      abstain_count: Number(tallyRow?.abstain_count ?? 0),
      total_count: Number(tallyRow?.total_count ?? 0),
    };

    // Cache voting config for a short TTL to reduce query load during polling.
    const nowMs = Date.now();
    let abstainCountsTowardQuorum = true;
    if (
      cachedAbstainCountsTowardQuorum &&
      nowMs - cachedAbstainCountsTowardQuorum.timestamp < VOTING_CONFIG_TTL_MS
    ) {
      abstainCountsTowardQuorum = cachedAbstainCountsTowardQuorum.value;
    } else {
      const { data: config } = await supabase
        .from('voting_config')
        .select('abstain_counts_toward_quorum')
        .limit(1)
        .single();

      abstainCountsTowardQuorum = config?.abstain_counts_toward_quorum ?? true;
      cachedAbstainCountsTowardQuorum = {
        value: abstainCountsTowardQuorum,
        timestamp: nowMs,
      };
    }

    // Calculate quorum-relevant votes
    const quorumVotes = abstainCountsTowardQuorum
      ? tally.total_votes
      : tally.yes_votes + tally.no_votes;

    // Calculate percentages
    const totalSupply = proposal.total_circulating_supply || 0;
    const quorumRequired = proposal.quorum_required || 0;

    const quorumMet = quorumVotes >= quorumRequired;
    const quorumPercentage = totalSupply > 0 ? (quorumVotes / totalSupply) * 100 : 0;

    // Yes/No percentages (of yes + no only, abstain doesn't affect outcome)
    const yesNoTotal = tally.yes_votes + tally.no_votes;
    const yesPercentage = yesNoTotal > 0 ? (tally.yes_votes / yesNoTotal) * 100 : 0;
    const noPercentage = yesNoTotal > 0 ? (tally.no_votes / yesNoTotal) * 100 : 0;

    // Abstain percentage of total votes
    const abstainPercentage =
      tally.total_votes > 0 ? (tally.abstain_votes / tally.total_votes) * 100 : 0;

    // Participation percentage
    const participationPercentage = totalSupply > 0 ? (tally.total_votes / totalSupply) * 100 : 0;

    // Check if voting is still open
    const now = new Date();
    const votingEndsAt = proposal.voting_ends_at ? new Date(proposal.voting_ends_at) : null;
    const isVotingOpen =
      proposal.status === 'voting' && votingEndsAt !== null && now < votingEndsAt;

    // Calculate time remaining
    const timeRemainingMs =
      isVotingOpen && votingEndsAt ? votingEndsAt.getTime() - now.getTime() : null;

    const results: VoteResults = {
      tally,
      quorum_met: quorumMet,
      quorum_percentage: quorumPercentage,
      yes_percentage: yesPercentage,
      no_percentage: noPercentage,
      abstain_percentage: abstainPercentage,
      participation_percentage: participationPercentage,
      result: proposal.result as VoteResults['result'],
      is_voting_open: isVotingOpen,
      time_remaining_ms: timeRemainingMs,
    };

    return NextResponse.json(results, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
