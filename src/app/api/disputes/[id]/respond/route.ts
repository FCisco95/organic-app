import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondToDisputeSchema } from '@/features/disputes/schemas';
import { isDeadlinePast, isDisputeWindowClosed } from '@/features/disputes/sla';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

/**
 * POST /api/disputes/[id]/respond
 * Reviewer submits counter-argument.
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

    // Only the reviewer can respond
    if (dispute.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the original reviewer can respond' },
        { status: 403 }
      );
    }

    // Check if response already submitted
    if (dispute.response_submitted_at) {
      return NextResponse.json(
        { error: 'Response already submitted' },
        { status: 409 }
      );
    }

    // Check if dispute is in a state that accepts responses
    const respondableStatuses = ['open', 'mediation', 'awaiting_response'];
    if (!respondableStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Dispute is not in a state that accepts responses' },
        { status: 400 }
      );
    }

    if (isDeadlinePast(dispute.response_deadline)) {
      return NextResponse.json(
        { error: 'Reviewer response deadline has passed' },
        { status: 409 }
      );
    }

    if (dispute.sprint_id) {
      const { data: sprint } = await supabase
        .from('sprints')
        .select('dispute_window_ends_at')
        .eq('id', dispute.sprint_id)
        .maybeSingle();

      if (isDisputeWindowClosed(sprint?.dispute_window_ends_at)) {
        return NextResponse.json(
          {
            error: 'Dispute window is closed for this sprint',
            dispute_window_ends_at: sprint?.dispute_window_ends_at ?? null,
          },
          { status: 409 }
        );
      }
    }

    // Parse input
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parseResult = respondToDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Update dispute with response and move to awaiting_response or under_review
    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        response_text: input.response_text,
        response_links: input.response_links,
        response_submitted_at: new Date().toISOString(),
        status: 'under_review',
        tier: dispute.tier === 'mediation' ? 'council' : dispute.tier,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('Error responding to dispute:', error);
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}
