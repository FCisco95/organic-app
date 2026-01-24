import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VoteTally, VoteResults } from '@/features/voting/types';

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

    // Get vote tallies
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('value, weight')
      .eq('proposal_id', proposalId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Calculate tallies
    const tally: VoteTally = {
      yes_votes: 0,
      no_votes: 0,
      abstain_votes: 0,
      total_votes: 0,
      yes_count: 0,
      no_count: 0,
      abstain_count: 0,
      total_count: 0,
    };

    for (const vote of votes || []) {
      tally.total_votes += vote.weight;
      tally.total_count += 1;

      switch (vote.value) {
        case 'yes':
          tally.yes_votes += vote.weight;
          tally.yes_count += 1;
          break;
        case 'no':
          tally.no_votes += vote.weight;
          tally.no_count += 1;
          break;
        case 'abstain':
          tally.abstain_votes += vote.weight;
          tally.abstain_count += 1;
          break;
      }
    }

    // Get voting config to check if abstain counts toward quorum
    const { data: config } = await supabase
      .from('voting_config')
      .select('abstain_counts_toward_quorum')
      .limit(1)
      .single();

    const abstainCountsTowardQuorum = config?.abstain_counts_toward_quorum ?? true;

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
    const abstainPercentage = tally.total_votes > 0 ? (tally.abstain_votes / tally.total_votes) * 100 : 0;

    // Participation percentage
    const participationPercentage = totalSupply > 0 ? (tally.total_votes / totalSupply) * 100 : 0;

    // Check if voting is still open
    const now = new Date();
    const votingEndsAt = proposal.voting_ends_at ? new Date(proposal.voting_ends_at) : null;
    const isVotingOpen = proposal.status === 'voting' && votingEndsAt !== null && now < votingEndsAt;

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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
