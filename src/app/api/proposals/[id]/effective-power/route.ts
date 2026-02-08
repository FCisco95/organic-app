import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    let delegationQuery = supabase
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

    const { data: delegations, error: delError } = await delegationQuery;

    if (delError) {
      console.error('Error fetching delegations:', delError);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    let delegatedWeight = 0;
    let delegatorCount = 0;

    for (const del of delegations ?? []) {
      // Check if delegation applies: global (null category) or matching category
      if (del.category !== null && del.category !== proposalCategory) {
        continue;
      }

      // Check if delegator voted directly (override delegation)
      const { data: directVote } = await supabase
        .from('votes')
        .select('id')
        .eq('proposal_id', proposalId)
        .eq('voter_id', del.delegator_id)
        .maybeSingle();

      if (directVote) {
        continue; // Delegator voted directly, skip their weight
      }

      // Get delegator's snapshot weight
      const delegator = del.delegator as unknown as { id: string; wallet_pubkey: string | null };
      if (delegator?.wallet_pubkey) {
        const { data: delegatorSnapshot } = await supabase
          .from('holder_snapshots')
          .select('balance_ui')
          .eq('proposal_id', proposalId)
          .eq('wallet_pubkey', delegator.wallet_pubkey)
          .maybeSingle();

        if (delegatorSnapshot?.balance_ui) {
          delegatedWeight += delegatorSnapshot.balance_ui;
          delegatorCount++;
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
