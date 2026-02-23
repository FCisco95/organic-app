import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeVotingSchema } from '@/features/voting/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type FinalizeRpcSummary = {
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  total_votes: number;
  quorum_required: number;
  quorum_met: boolean;
  quorum_percentage: number;
  yes_percentage: number;
  approval_threshold: number;
  participation_percentage: number;
};

type FinalizeRpcResult = {
  ok: boolean;
  code: string;
  message?: string;
  already_finalized?: boolean;
  proposal_id?: string;
  status?: string;
  result?: string;
  dedupe_key?: string;
  attempt_count?: number;
  summary?: FinalizeRpcSummary;
};

function mapFinalizeErrorStatus(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VOTING_NOT_ENDED':
    case 'INVALID_STATUS':
    case 'DEDUPE_KEY_MISMATCH':
    case 'INVALID_TEST_FAIL_MODE':
      return 400;
    case 'FINALIZATION_FROZEN':
      return 423;
    default:
      return 500;
  }
}

/**
 * POST /api/proposals/[id]/finalize
 * Admin-only endpoint to finalize voting on a proposal with idempotent lock semantics.
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
        { error: 'Only admin or council members can finalize voting' },
        { status: 403 }
      );
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError, code: 'INVALID_JSON' }, { status: 400 });
    }

    const parseResult = finalizeVotingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'INVALID_REQUEST', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const testFailMode =
      process.env.NODE_ENV === 'production' ? 'none' : (input.test_fail_mode ?? 'none');

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'finalize_proposal_voting_integrity',
      {
        p_proposal_id: proposalId,
        p_force: input.force,
        p_dedupe_key: input.dedupe_key || undefined,
        p_test_fail_mode: testFailMode,
      }
    );

    if (rpcError) {
      logger.error('finalize_proposal_voting_integrity RPC error', rpcError);
      return NextResponse.json({ error: 'Failed to finalize voting' }, { status: 500 });
    }

    const result = rpcData as FinalizeRpcResult | null;

    if (!result || !result.ok) {
      const code = result?.code ?? 'UNKNOWN';
      return NextResponse.json(
        {
          error: result?.message ?? 'Failed to finalize voting',
          code,
          dedupe_key: result?.dedupe_key ?? null,
          attempt_count: result?.attempt_count ?? null,
        },
        { status: mapFinalizeErrorStatus(code) }
      );
    }

    if (result.already_finalized) {
      return NextResponse.json({
        message: 'Voting already finalized',
        proposal: {
          id: result.proposal_id,
          status: result.status,
          result: result.result,
        },
        idempotency: {
          already_finalized: true,
          dedupe_key: result.dedupe_key ?? null,
          attempt_count: result.attempt_count ?? null,
        },
      });
    }

    // ── Set execution window for passed proposals ────────────────────
    if (result.result === 'passed') {
      const { data: config } = await supabase
        .from('voting_config')
        .select('execution_window_days')
        .limit(1)
        .single();

      const windowDays = config?.execution_window_days ?? 7;
      const deadline = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: execError } = await supabase
        .from('proposals')
        .update({
          execution_status: 'pending_execution',
          execution_deadline: deadline,
        })
        .eq('id', proposalId);

      if (execError) {
        logger.error('Failed to set execution window on passed proposal', execError);
        // Non-fatal: finalization already succeeded, log and continue
      }
    }
    // ── End execution window ─────────────────────────────────────────

    return NextResponse.json({
      message: 'Voting finalized successfully',
      proposal: {
        id: result.proposal_id,
        status: result.status,
        result: result.result,
      },
      summary: result.summary ?? null,
      idempotency: {
        already_finalized: false,
        dedupe_key: result.dedupe_key ?? null,
        attempt_count: result.attempt_count ?? null,
      },
    });
  } catch (error) {
    logger.error('Proposal finalize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
