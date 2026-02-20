import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProposalStatus } from '@/features/proposals/types';
import { logger } from '@/lib/logger';

// GET - Calculate effective voting power for a user on a proposal
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const targetUserId = userId || user.id;

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('status, category')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const normalizedStatus = normalizeProposalStatus(proposal.status);

    // Once voting starts, use immutable user-level snapshot power.
    if (normalizedStatus === 'voting' || normalizedStatus === 'finalized') {
      const { data: snapshot } = await supabase
        .from('proposal_voter_snapshots')
        .select('own_weight, delegated_weight, total_weight, delegator_count')
        .eq('proposal_id', proposalId)
        .eq('voter_id', targetUserId)
        .maybeSingle();

      return NextResponse.json({
        own_weight: Number(snapshot?.own_weight ?? 0),
        delegated_weight: Number(snapshot?.delegated_weight ?? 0),
        total_weight: Number(snapshot?.total_weight ?? 0),
        delegator_count: Number(snapshot?.delegator_count ?? 0),
        source: 'snapshot',
      });
    }

    // Pre-voting compatibility path (live delegation estimate).
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_pubkey')
      .eq('id', targetUserId)
      .single();

    let ownWeight = 0;

    if (profile?.wallet_pubkey) {
      const { data: snapshot } = await supabase
        .from('holder_snapshots')
        .select('balance_ui')
        .eq('proposal_id', proposalId)
        .eq('wallet_pubkey', profile.wallet_pubkey)
        .maybeSingle();

      ownWeight = Number(snapshot?.balance_ui ?? 0);
      if (ownWeight < 1) ownWeight = 0;
    }

    const proposalCategory = proposal.category || null;

    const { data: delegations, error: delError } = await supabase
      .from('vote_delegations')
      .select('delegator_id, category')
      .eq('delegate_id', targetUserId);

    if (delError) {
      logger.error('Error fetching delegations:', delError);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    let delegatedWeight = 0;
    let delegatorCount = 0;

    const applicableDelegations = (delegations ?? []).filter(
      (delegation) => delegation.category === null || delegation.category === proposalCategory
    );

    if (applicableDelegations.length > 0) {
      const delegatorIds = applicableDelegations.map((delegation) => delegation.delegator_id);
      const { data: delegatorProfiles, error: delegatorProfilesError } = await supabase
        .from('user_profiles')
        .select('id, wallet_pubkey')
        .in('id', delegatorIds);

      if (delegatorProfilesError) {
        logger.error('Error fetching delegator profiles:', delegatorProfilesError);
        return NextResponse.json({ error: 'Failed to fetch delegator profiles' }, { status: 500 });
      }

      const delegatorWalletById = new Map(
        (delegatorProfiles ?? []).map((delegatorProfile) => [
          delegatorProfile.id,
          delegatorProfile.wallet_pubkey,
        ])
      );

      const { data: directVotes, error: directVotesError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('proposal_id', proposalId)
        .in('voter_id', delegatorIds);

      if (directVotesError) {
        logger.error('Error fetching direct votes:', directVotesError);
        return NextResponse.json(
          { error: 'Failed to fetch direct votes for delegators' },
          { status: 500 }
        );
      }

      const directVoterIds = new Set((directVotes ?? []).map((vote) => vote.voter_id));
      const walletPubkeys = [
        ...new Set(
          applicableDelegations
            .filter((delegation) => !directVoterIds.has(delegation.delegator_id))
            .map((delegation) => delegatorWalletById.get(delegation.delegator_id))
            .filter((wallet): wallet is string => !!wallet)
        ),
      ];

      if (walletPubkeys.length > 0) {
        const { data: snapshotRows, error: snapshotError } = await supabase
          .from('holder_snapshots')
          .select('wallet_pubkey, balance_ui')
          .eq('proposal_id', proposalId)
          .in('wallet_pubkey', walletPubkeys);

        if (snapshotError) {
          logger.error('Error fetching delegator snapshots:', snapshotError);
          return NextResponse.json(
            { error: 'Failed to fetch snapshot balances for delegators' },
            { status: 500 }
          );
        }

        const walletBalances = new Map(
          (snapshotRows ?? []).map((row) => [row.wallet_pubkey, Number(row.balance_ui ?? 0)])
        );

        for (const delegation of applicableDelegations) {
          if (directVoterIds.has(delegation.delegator_id)) continue;

          const wallet = delegatorWalletById.get(delegation.delegator_id);
          if (!wallet) continue;

          const balance = walletBalances.get(wallet) ?? 0;
          if (balance >= 1) {
            delegatedWeight += balance;
            delegatorCount++;
          }
        }
      }
    }

    return NextResponse.json({
      own_weight: ownWeight,
      delegated_weight: delegatedWeight,
      total_weight: ownWeight + delegatedWeight,
      delegator_count: delegatorCount,
      source: 'live_estimate',
    });
  } catch (error) {
    logger.error('Effective power error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
