import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { castVoteSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';

/**
 * POST /api/proposals/[id]/vote
 * Cast or update a vote on a proposal.
 * Vote weight is determined by token balance at snapshot time.
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

    // Parse and validate request body
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parseResult = castVoteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { value } = parseResult.data;

    // Get user profile with wallet
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user is a member
    if (!profile.role || !['member', 'council', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        {
          error: 'Only members can vote. Link your wallet and hold $ORG tokens to become a member.',
        },
        { status: 403 }
      );
    }

    // Check if user has linked wallet
    if (!profile.wallet_pubkey) {
      return NextResponse.json({ error: 'You must link a wallet to vote' }, { status: 400 });
    }

    // Check if proposal is in voting status
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, status, voting_starts_at, voting_ends_at')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.status !== 'voting') {
      return NextResponse.json({ error: 'Voting is not open for this proposal' }, { status: 400 });
    }

    // Check if voting period is still open
    const now = new Date();
    if (proposal.voting_ends_at && new Date(proposal.voting_ends_at) < now) {
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    // Get user's voting weight from snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('holder_snapshots')
      .select('balance_ui')
      .eq('proposal_id', proposalId)
      .eq('wallet_pubkey', profile.wallet_pubkey)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'You did not hold $ORG tokens at the time of the snapshot and cannot vote' },
        { status: 403 }
      );
    }

    const weight = snapshot.balance_ui;

    if (weight <= 0) {
      return NextResponse.json({ error: 'You must hold $ORG tokens to vote' }, { status: 403 });
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, value')
      .eq('proposal_id', proposalId)
      .eq('voter_id', user.id)
      .maybeSingle();

    let vote;

    if (existingVote) {
      // Update existing vote
      const { data: updatedVote, error: updateError } = await supabase
        .from('votes')
        .update({ value, weight })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
      }

      vote = updatedVote;
    } else {
      // Create new vote
      const { data: newVote, error: insertError } = await supabase
        .from('votes')
        .insert({
          proposal_id: proposalId,
          voter_id: user.id,
          value,
          weight,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
      }

      vote = newVote;
    }

    return NextResponse.json({
      message: existingVote ? 'Vote updated successfully' : 'Vote cast successfully',
      vote: {
        id: vote.id,
        value: vote.value,
        weight: vote.weight,
        created_at: vote.created_at,
      },
    });
  } catch (error) {
    console.error('Vote POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/proposals/[id]/vote
 * Get the current user's vote for a proposal.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get user's vote
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('id, value, weight, created_at')
      .eq('proposal_id', proposalId)
      .eq('voter_id', user.id)
      .maybeSingle();

    if (voteError) {
      return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
    }

    // Get user's voting weight from snapshot (even if they haven't voted)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_pubkey')
      .eq('id', user.id)
      .single();

    let votingWeight = 0;
    if (profile?.wallet_pubkey) {
      const { data: snapshot } = await supabase
        .from('holder_snapshots')
        .select('balance_ui')
        .eq('proposal_id', proposalId)
        .eq('wallet_pubkey', profile.wallet_pubkey)
        .maybeSingle();

      votingWeight = snapshot?.balance_ui || 0;
    }

    return NextResponse.json({
      vote: vote || null,
      voting_weight: votingWeight,
      can_vote: votingWeight > 0,
    });
  } catch (error) {
    console.error('Vote GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
