import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeProposalSchema } from '@/features/proposals/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/proposals/[id]/execute
 * Admin/council marks a finalized, passed proposal as executed.
 * Records execution notes and timestamp.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check — admin/council only
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin or council role required' },
        { status: 403 }
      );
    }

    // Parse body
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const parseResult = executeProposalSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Fetch proposal and validate state
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, status, result, execution_status')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.status !== 'finalized' || proposal.result !== 'passed') {
      return NextResponse.json(
        { error: 'Only finalized proposals that passed can be marked as executed' },
        { status: 400 }
      );
    }

    if (proposal.execution_status === 'executed') {
      return NextResponse.json(
        { error: 'Proposal has already been executed' },
        { status: 409 }
      );
    }

    if (proposal.execution_status === 'expired') {
      return NextResponse.json(
        { error: 'Execution window has expired for this proposal' },
        { status: 410 }
      );
    }

    // Best-effort: expire any overdue proposals while we're here
    try { await supabase.rpc('expire_pending_executions'); } catch { /* non-fatal */ }

    // Mark as executed
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('proposals')
      .update({
        execution_status: 'executed',
        executed_at: now,
        execution_notes: parseResult.data.notes,
        updated_at: now,
      })
      .eq('id', proposalId)
      .eq('execution_status', 'pending_execution') // Guard against race conditions
      .select()
      .single();

    if (error || !data) {
      // If no rows matched, execution_status may have changed concurrently
      return NextResponse.json(
        { error: 'Failed to mark proposal as executed. It may have expired or already been executed.' },
        { status: 409 }
      );
    }

    // Log stage event (non-fatal if table structure differs)
    await supabase
      .from('proposal_stage_events')
      .insert({
        proposal_id: proposalId,
        from_status: 'finalized',
        to_status: 'finalized',
        triggered_by: user.id,
        reason: `Executed: ${parseResult.data.notes.slice(0, 200)}`,
      });

    return NextResponse.json({
      message: 'Proposal marked as executed',
      proposal: {
        id: data.id,
        status: data.status,
        result: data.result,
        execution_status: data.execution_status,
        executed_at: data.executed_at,
      },
    });
  } catch (error) {
    logger.error('Proposal execute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
