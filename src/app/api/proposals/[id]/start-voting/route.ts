import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllTokenHolders } from '@/lib/solana';
import { startVotingSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

const START_VOTING_CONFIG_COLUMNS = 'quorum_percentage, approval_threshold, voting_duration_days';
const START_VOTING_PROPOSAL_COLUMNS = 'id, title, status';
const START_VOTING_UPDATE_COLUMNS =
  'id, title, status, voting_starts_at, voting_ends_at, snapshot_taken_at, total_circulating_supply, quorum_required, approval_threshold, result';

/**
 * POST /api/proposals/[id]/start-voting
 * Admin-only endpoint to start voting on a proposal.
 * Captures token holder snapshot and sets voting period.
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
        { error: 'Only admin or council members can start voting' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError, code: 'INVALID_JSON' }, { status: 400 });
    }

    const parseResult = startVotingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'INVALID_REQUEST', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get voting config
    const { data: config, error: configError } = await supabase
      .from('voting_config')
      .select(START_VOTING_CONFIG_COLUMNS)
      .limit(1)
      .single();

    if (configError) {
      return NextResponse.json({ error: 'Failed to fetch voting config' }, { status: 500 });
    }

    const votingDurationDays = parseResult.data.voting_duration_days || config.voting_duration_days;

    // Check if proposal exists and is in 'submitted' status
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(START_VOTING_PROPOSAL_COLUMNS)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.status !== 'submitted') {
      return NextResponse.json(
        { error: `Cannot start voting on a proposal with status '${proposal.status}'` },
        { status: 400 }
      );
    }

    // Check if snapshot already exists
    const { count: existingSnapshotCount } = await supabase
      .from('holder_snapshots')
      .select('id', { head: true, count: 'exact' })
      .eq('proposal_id', proposalId)
      .limit(1);

    if ((existingSnapshotCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Snapshot already taken for this proposal' },
        { status: 400 }
      );
    }

    // Capture token holder snapshot
    const holders = await getAllTokenHolders();

    if (holders.length === 0) {
      return NextResponse.json(
        { error: 'No token holders found. Cannot start voting.' },
        { status: 400 }
      );
    }

    // Calculate total circulating supply
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    const quorumRequired = (totalSupply * config.quorum_percentage) / 100;

    // Calculate voting period
    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + votingDurationDays * 24 * 60 * 60 * 1000);

    // Insert holder snapshots
    const snapshotInserts = holders.map((holder) => ({
      proposal_id: proposalId,
      wallet_pubkey: holder.address,
      balance_ui: holder.balance,
      taken_at: now.toISOString(),
    }));

    const { error: snapshotError } = await supabase
      .from('holder_snapshots')
      .insert(snapshotInserts);

    if (snapshotError) {
      return NextResponse.json({ error: 'Failed to capture snapshot' }, { status: 500 });
    }

    // Update proposal with voting info
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'voting',
        voting_starts_at: now.toISOString(),
        voting_ends_at: votingEndsAt.toISOString(),
        snapshot_taken_at: now.toISOString(),
        total_circulating_supply: totalSupply,
        quorum_required: quorumRequired,
        approval_threshold: config.approval_threshold,
      })
      .eq('id', proposalId)
      .select(START_VOTING_UPDATE_COLUMNS)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Voting started successfully',
      proposal: updatedProposal,
      snapshot: {
        holders_count: holders.length,
        total_supply: totalSupply,
        quorum_required: quorumRequired,
      },
      voting_ends_at: votingEndsAt.toISOString(),
    });
  } catch (error) {
    logger.error('Start voting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
