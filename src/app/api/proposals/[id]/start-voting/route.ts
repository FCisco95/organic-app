import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSolanaRpc } from '@/lib/solana';
import { startVotingSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

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

const START_VOTING_RETRYABLE_RPC_CODES = new Set(['42P07']);
const START_VOTING_MAX_RPC_ATTEMPTS = 3;

type RpcErrorLike = { code?: string; message?: string; details?: string | null };

async function startVotingWithRetry(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  proposalId: string;
  votingDurationDays?: number;
  holders: Json;
}): Promise<{ data: StartVotingRpcResult | null; error: RpcErrorLike | null }> {
  const { supabase, proposalId, votingDurationDays, holders } = input;

  for (let attempt = 1; attempt <= START_VOTING_MAX_RPC_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc('start_proposal_voting_integrity', {
      p_proposal_id: proposalId,
      p_voting_duration_days: votingDurationDays,
      p_snapshot_holders: holders,
    });

    if (!error) {
      return { data: (data as StartVotingRpcResult | null) ?? null, error: null };
    }

    const code = error.code ?? '';
    const canRetry =
      START_VOTING_RETRYABLE_RPC_CODES.has(code) && attempt < START_VOTING_MAX_RPC_ATTEMPTS;

    if (!canRetry) {
      return { data: null, error };
    }

    logger.warn('Retrying start_proposal_voting_integrity after transient RPC error', {
      code,
      attempt,
      proposalId,
    });

    await new Promise((resolve) => setTimeout(resolve, attempt * 150));
  }

  return {
    data: null,
    error: {
      code: 'UNKNOWN',
      message: 'Unknown error while starting proposal voting',
    },
  };
}

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
      .maybeSingle();

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

    // SECURITY: Always fetch token holders from on-chain data.
    // Never trust client-provided snapshot_holders — an admin could
    // submit manipulated balances to skew voting power.
    if (input.snapshot_holders) {
      logger.warn('Client-provided snapshot_holders ignored — using on-chain data', {
        proposal_id: proposalId,
        client_holders_count: input.snapshot_holders.length,
        actor_id: user.id,
      });
    }

    const holders = await getSolanaRpc().getAllTokenHolders();

    if (!holders.length) {
      logger.error('On-chain snapshot returned zero holders', { proposal_id: proposalId });
      return NextResponse.json(
        { error: 'Failed to fetch token holders from blockchain', code: 'CHAIN_FETCH_FAILED' },
        { status: 502 }
      );
    }

    // Sanity check: total supply should not exceed expected maximum.
    // Catches RPC data corruption or unexpected token minting.
    const totalSnapshotSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    const expectedMaxSupply = Number(process.env.NEXT_PUBLIC_TOKEN_TOTAL_SUPPLY || 1_000_000_000);
    if (totalSnapshotSupply > expectedMaxSupply * 1.01) {
      logger.error('Snapshot total exceeds expected supply — possible data corruption', {
        proposal_id: proposalId,
        total_snapshot_supply: totalSnapshotSupply,
        expected_max_supply: expectedMaxSupply,
      });
      return NextResponse.json(
        { error: 'Snapshot integrity check failed', code: 'SUPPLY_EXCEEDS_EXPECTED' },
        { status: 500 }
      );
    }

    // Audit trail for snapshot provenance
    logger.info('Voting snapshot sourced from on-chain data', {
      proposal_id: proposalId,
      holder_count: holders.length,
      total_supply: totalSnapshotSupply,
      actor_id: user.id,
      timestamp: new Date().toISOString(),
    });

    const { data: rpcData, error: rpcError } = await startVotingWithRetry({
      supabase,
      proposalId,
      votingDurationDays: input.voting_duration_days || undefined,
      holders: holders as unknown as Json,
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
            snapshot_source: 'chain',
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
        snapshot_source: 'chain',
      },
    });
  } catch (error) {
    logger.error('Start voting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
