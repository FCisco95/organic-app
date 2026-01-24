import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeVotingSchema } from '@/features/voting/schemas';
import { ProposalResult } from '@/types/database';

/**
 * POST /api/proposals/[id]/finalize
 * Admin-only endpoint to finalize voting on a proposal.
 * Calculates result and updates proposal status.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or council
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admin or council members can finalize voting' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parseResult = finalizeVotingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { force } = parseResult.data;

    // Get proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Check if proposal is in voting status
    if (proposal.status !== 'voting') {
      return NextResponse.json(
        { error: `Cannot finalize a proposal with status '${proposal.status}'` },
        { status: 400 }
      );
    }

    // Check if already finalized
    if (proposal.result) {
      return NextResponse.json({ error: 'Voting has already been finalized' }, { status: 400 });
    }

    // Check if voting period has ended (unless force is true)
    const now = new Date();
    const votingEndsAt = proposal.voting_ends_at ? new Date(proposal.voting_ends_at) : null;

    if (!force && votingEndsAt && now < votingEndsAt) {
      return NextResponse.json(
        {
          error: 'Voting period has not ended yet. Set force=true to finalize early.',
          voting_ends_at: votingEndsAt.toISOString(),
        },
        { status: 400 }
      );
    }

    // Get votes for calculation
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('value, weight')
      .eq('proposal_id', proposalId);

    if (votesError) {
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Get voting config
    const { data: config } = await supabase
      .from('voting_config')
      .select('abstain_counts_toward_quorum')
      .limit(1)
      .single();

    const abstainCountsTowardQuorum = config?.abstain_counts_toward_quorum ?? true;

    // Calculate vote totals
    let yesVotes = 0;
    let noVotes = 0;
    let abstainVotes = 0;
    let totalVotes = 0;

    for (const vote of votes || []) {
      totalVotes += vote.weight;

      switch (vote.value) {
        case 'yes':
          yesVotes += vote.weight;
          break;
        case 'no':
          noVotes += vote.weight;
          break;
        case 'abstain':
          abstainVotes += vote.weight;
          break;
      }
    }

    // Calculate quorum-relevant votes
    const quorumVotes = abstainCountsTowardQuorum ? totalVotes : yesVotes + noVotes;

    // Check quorum
    const quorumRequired = proposal.quorum_required || 0;
    const quorumMet = quorumVotes >= quorumRequired;

    let result: ProposalResult;
    let newStatus: 'approved' | 'rejected';

    if (!quorumMet) {
      result = 'quorum_not_met';
      newStatus = 'rejected'; // Proposals that don't meet quorum are rejected
    } else {
      // Calculate approval (yes vs yes+no, abstain doesn't affect outcome)
      const yesNoTotal = yesVotes + noVotes;
      const approvalThreshold = proposal.approval_threshold || 50;

      if (yesNoTotal === 0) {
        // All votes were abstain - treat as quorum not met
        result = 'quorum_not_met';
        newStatus = 'rejected';
      } else {
        const yesPercentage = (yesVotes / yesNoTotal) * 100;

        if (yesPercentage >= approvalThreshold) {
          result = 'passed';
          newStatus = 'approved';
        } else {
          result = 'failed';
          newStatus = 'rejected';
        }
      }
    }

    // Update proposal with result
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        result,
        status: newStatus,
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to finalize voting' }, { status: 500 });
    }

    // Calculate final stats for response
    const totalSupply = proposal.total_circulating_supply || 0;
    const yesNoTotal = yesVotes + noVotes;

    return NextResponse.json({
      message: 'Voting finalized successfully',
      proposal: {
        id: updatedProposal.id,
        title: updatedProposal.title,
        status: updatedProposal.status,
        result: updatedProposal.result,
      },
      summary: {
        yes_votes: yesVotes,
        no_votes: noVotes,
        abstain_votes: abstainVotes,
        total_votes: totalVotes,
        quorum_required: quorumRequired,
        quorum_met: quorumMet,
        quorum_percentage: totalSupply > 0 ? (quorumVotes / totalSupply) * 100 : 0,
        yes_percentage: yesNoTotal > 0 ? (yesVotes / yesNoTotal) * 100 : 0,
        approval_threshold: proposal.approval_threshold || 50,
        participation_percentage: totalSupply > 0 ? (totalVotes / totalSupply) * 100 : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
