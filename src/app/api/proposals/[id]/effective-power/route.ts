import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type DelegationRow = {
  delegator_id: string;
  category: string | null;
  delegator: {
    id: string;
    wallet_pubkey: string | null;
  } | null;
};

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

    // Get user's wallet
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

      ownWeight = snapshot?.balance_ui ?? 0;
    }

    // Get proposal category for category-scoped delegations
    const { data: proposal } = await supabase
      .from('proposals')
      .select('category')
      .eq('id', proposalId)
      .single();

    const proposalCategory = proposal?.category || null;

    // Find delegators who delegated to this user
    const { data: delegations, error: delError } = await supabase
      .from('vote_delegations')
      .select(
        `
        id,
        delegator_id,
        category,
        delegator:user_profiles!vote_delegations_delegator_id_fkey(
          id, wallet_pubkey
        )
      `
      )
      .eq('delegate_id', targetUserId);

    if (delError) {
      console.error('Error fetching delegations:', delError);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    let delegatedWeight = 0;
    let delegatorCount = 0;

    const applicableDelegations = ((delegations ?? []) as unknown as DelegationRow[]).filter(
      (delegation) => delegation.category === null || delegation.category === proposalCategory
    );

    if (applicableDelegations.length > 0) {
      const delegatorIds = applicableDelegations.map((delegation) => delegation.delegator_id);
      const { data: directVotes, error: directVotesError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('proposal_id', proposalId)
        .in('voter_id', delegatorIds);

      if (directVotesError) {
        console.error('Error fetching direct votes:', directVotesError);
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
            .map((delegation) => delegation.delegator?.wallet_pubkey)
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
          console.error('Error fetching delegator snapshots:', snapshotError);
          return NextResponse.json(
            { error: 'Failed to fetch snapshot balances for delegators' },
            { status: 500 }
          );
        }

        const walletBalances = new Map(
          (snapshotRows ?? []).map((row) => [row.wallet_pubkey, row.balance_ui ?? 0])
        );

        for (const delegation of applicableDelegations) {
          if (directVoterIds.has(delegation.delegator_id)) continue;
          const wallet = delegation.delegator?.wallet_pubkey;
          if (!wallet) continue;
          const balance = walletBalances.get(wallet) ?? 0;
          if (balance > 0) {
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
    });
  } catch (error) {
    console.error('Effective power error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
