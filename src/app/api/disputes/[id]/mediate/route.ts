import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mediateDisputeSchema } from '@/features/disputes/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

const MEDIATION_PROPOSAL_PREFIX = 'Mediation proposal (pending): ';

/**
 * POST /api/disputes/[id]/mediate
 * Both parties agree to a mediated resolution.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Only disputant or reviewer can propose mediation
    if (dispute.disputant_id !== user.id && dispute.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only dispute parties can mediate' },
        { status: 403 }
      );
    }

    // Check dispute is in a mediatable state
    const mediatableStatuses = ['open', 'mediation', 'awaiting_response'];
    if (!mediatableStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Dispute is not in a state that allows mediation' },
        { status: 400 }
      );
    }

    // Check mediation deadline if applicable
    if (dispute.mediation_deadline && new Date() > new Date(dispute.mediation_deadline)) {
      return NextResponse.json(
        { error: 'Mediation window has expired' },
        { status: 400 }
      );
    }

    // Parse input
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const parseResult = mediateDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const agreedOutcome = parseResult.data.agreed_outcome.trim();

    // Check latest pending mediation proposal
    const { data: latestProposal } = await supabase
      .from('dispute_comments')
      .select('id, user_id, content, created_at')
      .eq('dispute_id', id)
      .like('content', `${MEDIATION_PROPOSAL_PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const proposedOutcome = latestProposal?.content?.startsWith(MEDIATION_PROPOSAL_PREFIX)
      ? latestProposal.content.slice(MEDIATION_PROPOSAL_PREFIX.length).trim()
      : null;

    // Two-party confirmation rule:
    // 1) first party submits proposal
    // 2) other party confirms the same proposal text
    const waitingForOtherParty =
      !latestProposal ||
      latestProposal.user_id === user.id ||
      proposedOutcome !== agreedOutcome;

    if (waitingForOtherParty) {
      const { data: updated, error: updateError } = await supabase
        .from('disputes')
        .update({
          status: 'mediation',
          tier: 'mediation',
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error: commentError } = await supabase.from('dispute_comments').insert({
        dispute_id: id,
        user_id: user.id,
        content: `${MEDIATION_PROPOSAL_PREFIX}${agreedOutcome}`,
        visibility: 'parties_only',
      });

      if (commentError) {
        // Revert dispute status since the proposal comment is required for the mediation flow
        logger.error('Mediation proposal comment failed, reverting dispute status:', id, commentError);
        await supabase
          .from('disputes')
          .update({ status: dispute.status, tier: dispute.tier })
          .eq('id', id);
        return NextResponse.json({ error: 'Failed to record mediation proposal' }, { status: 500 });
      }

      return NextResponse.json(
        {
          data: updated,
          pending_confirmation: true,
          message: 'Mediation proposal submitted. Waiting for other party confirmation.',
        },
        { status: 202 }
      );
    }

    // Other party confirmed the same proposal text -> mark as mediated
    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        status: 'mediated',
        resolution_notes: agreedOutcome,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record the mediation agreement as a comment (non-critical — status is source of truth)
    const { error: confirmCommentError } = await supabase.from('dispute_comments').insert({
      dispute_id: id,
      user_id: user.id,
      content: `Mediation agreement confirmed by both parties: ${agreedOutcome}`,
      visibility: 'parties_only',
    });

    if (confirmCommentError) {
      logger.error('Non-critical: Failed to insert mediation confirmation comment:', id, confirmCommentError);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('Error mediating dispute:', error);
    return NextResponse.json(
      { error: 'Failed to mediate dispute' },
      { status: 500 }
    );
  }
}
