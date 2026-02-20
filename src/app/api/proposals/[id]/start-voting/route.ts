import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllTokenHolders } from '@/lib/solana';
import { startVotingSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

const START_VOTING_PROPOSAL_COLUMNS =
  'id, title, status, voting_starts_at, server_voting_started_at, voting_ends_at, snapshot_taken_at, total_circulating_supply, quorum_required, approval_threshold, result';

type StartVotingRpcResult = {
  ok: boolean;
  code: string;
  message: string;
  proposal_id?: string;
  voting_starts_at?: string;
  voting_ends_at?: string;
  snapshot?: {
    holders_count: number;
    voters_count: number;
    total_supply: number;
    quorum_required: number;
    approval_threshold: number;
  };
};

function mapStartVotingErrorStatus(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'SNAPSHOT_EXISTS':
      return 409;
    case 'INVALID_STATUS':
    case 'INVALID_SNAPSHOT':
    case 'INVALID_DURATION':
    case 'EMPTY_SNAPSHOT':
      return 400;
    default:
      return 500;
  }
}

/**
 * POST /api/proposals/[id]/start-voting
 * Admin/council endpoint.
 * Captures deterministic voting snapshot and flips proposal to voting in one DB transaction.
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

    const input = parseResult.data;
    const holders = input.snapshot_holders ?? (await getAllTokenHolders());

    const { data: rpcData, error: rpcError } = await supabase.rpc('start_proposal_voting_integrity', {
      p_proposal_id: proposalId,
      p_voting_duration_days: input.voting_duration_days || undefined,
      p_snapshot_holders: holders,
    });

    if (rpcError) {
      logger.error('start_proposal_voting_integrity RPC error', rpcError);
      return NextResponse.json({ error: 'Failed to start voting' }, { status: 500 });
    }

    const result = rpcData as StartVotingRpcResult | null;

    if (!result || !result.ok) {
      const code = result?.code ?? 'UNKNOWN';
      return NextResponse.json(
        {
          error: result?.message ?? 'Failed to start voting',
          code,
        },
        { status: mapStartVotingErrorStatus(code) }
      );
    }

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(START_VOTING_PROPOSAL_COLUMNS)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        {
          message: result.message,
          snapshot: result.snapshot ?? null,
          voting_ends_at: result.voting_ends_at ?? null,
          integrity: {
            server_voting_started_at: result.voting_starts_at ?? null,
            snapshot_source: input.snapshot_holders ? 'request' : 'chain',
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: result.message,
      proposal,
      snapshot: result.snapshot ?? null,
      voting_ends_at: proposal.voting_ends_at,
      integrity: {
        server_voting_started_at: proposal.server_voting_started_at,
        snapshot_source: input.snapshot_holders ? 'request' : 'chain',
      },
    });
  } catch (error) {
    logger.error('Start voting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
