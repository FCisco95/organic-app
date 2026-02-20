import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { castVoteSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type WeightSource = 'voter_snapshot' | 'holder_snapshot' | 'none';

async function getVotingWeight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
  userId: string,
  walletPubkey: string | null | undefined
): Promise<{ weight: number; source: WeightSource }> {
  const { data: voterSnapshot } = await supabase
    .from('proposal_voter_snapshots')
    .select('total_weight')
    .eq('proposal_id', proposalId)
    .eq('voter_id', userId)
    .maybeSingle();

  const snapshotWeight = Number(voterSnapshot?.total_weight ?? 0);
  if (snapshotWeight > 0) {
    return { weight: snapshotWeight, source: 'voter_snapshot' };
  }

  if (!walletPubkey) {
    return { weight: 0, source: 'none' };
  }

  const { data: holderSnapshot } = await supabase
    .from('holder_snapshots')
    .select('balance_ui')
    .eq('proposal_id', proposalId)
    .eq('wallet_pubkey', walletPubkey)
    .maybeSingle();

  const holderWeight = Number(holderSnapshot?.balance_ui ?? 0);
  if (holderWeight > 0) {
    return { weight: holderWeight, source: 'holder_snapshot' };
  }

  return { weight: 0, source: 'none' };
}

/**
 * POST /api/proposals/[id]/vote
 * Cast or update a vote on a proposal.
 * Vote weight is determined by the frozen voting snapshot.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.role || !['member', 'council', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        {
          error: 'Only members can vote. Link your wallet and hold $ORG tokens to become a member.',
        },
        { status: 403 }
      );
    }

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

    const now = new Date();
    if (proposal.voting_ends_at && new Date(proposal.voting_ends_at) < now) {
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    const { weight, source } = await getVotingWeight(
      supabase,
      proposalId,
      user.id,
      profile.wallet_pubkey
    );

    if (weight <= 0) {
      return NextResponse.json(
        {
          error:
            'You are not eligible in this voting snapshot and cannot vote on this proposal.',
        },
        { status: 403 }
      );
    }

    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, value')
      .eq('proposal_id', proposalId)
      .eq('voter_id', user.id)
      .maybeSingle();

    let vote;

    if (existingVote) {
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
      weight_source: source,
    });
  } catch (error) {
    logger.error('Vote POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/proposals/[id]/vote
 * Get the current user's vote and frozen voting weight for a proposal.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('id, value, weight, created_at')
      .eq('proposal_id', proposalId)
      .eq('voter_id', user.id)
      .maybeSingle();

    if (voteError) {
      return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_pubkey')
      .eq('id', user.id)
      .single();

    const { weight, source } = await getVotingWeight(
      supabase,
      proposalId,
      user.id,
      profile?.wallet_pubkey
    );

    return NextResponse.json({
      vote: vote || null,
      voting_weight: weight,
      can_vote: weight > 0,
      weight_source: source,
    });
  } catch (error) {
    logger.error('Vote GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
