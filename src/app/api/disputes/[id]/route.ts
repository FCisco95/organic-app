import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DISPUTE_DETAIL_SELECT = `
  *,
  disputant:user_profiles!disputes_disputant_id_fkey(
    id, name, email, organic_id, avatar_url
  ),
  reviewer:user_profiles!disputes_reviewer_id_fkey(
    id, name, email, organic_id, avatar_url
  ),
  arbitrator:user_profiles!disputes_arbitrator_id_fkey(
    id, name, email, organic_id, avatar_url
  ),
  task:tasks!disputes_task_id_fkey(
    id, title, status, base_points
  ),
  submission:task_submissions!disputes_submission_id_fkey(
    id, review_status, quality_score, earned_points, reviewer_notes, rejection_reason
  )
`;

/**
 * GET /api/disputes/[id]
 * Get dispute detail. Parties + arbitrator see full evidence;
 * other authenticated users see limited fields only.
 */
export async function GET(
  _request: NextRequest,
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

    const { data: dispute, error } = await supabase
      .from('disputes')
      .select(DISPUTE_DETAIL_SELECT)
      .eq('id', id)
      .single();

    if (error || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Check if user is a party or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isParty =
      user.id === dispute.disputant_id ||
      user.id === dispute.reviewer_id ||
      user.id === dispute.arbitrator_id;
    const isAdmin = profile?.role === 'admin';
    const isCouncil = profile?.role === 'council';

    // Semi-public: non-parties see limited data
    if (!isParty && !isAdmin && !isCouncil) {
      const limited = {
        id: dispute.id,
        task_id: dispute.task_id,
        submission_id: dispute.submission_id,
        status: dispute.status,
        tier: dispute.tier,
        reason: dispute.reason,
        resolution: dispute.resolution,
        created_at: dispute.created_at,
        resolved_at: dispute.resolved_at,
        task: dispute.task,
      };
      return NextResponse.json({ data: limited });
    }

    return NextResponse.json({ data: dispute });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    return NextResponse.json({ error: 'Failed to fetch dispute' }, { status: 500 });
  }
}

/**
 * PATCH /api/disputes/[id]
 * Update dispute: withdraw or escalate.
 */
export async function PATCH(
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

    const body = await request.json();
    const { action } = body;

    // Load dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (action === 'withdraw') {
      // Only disputant can withdraw
      if (dispute.disputant_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the disputant can withdraw' },
          { status: 403 }
        );
      }

      // Cannot withdraw if already resolved
      const terminalStatuses = ['resolved', 'dismissed', 'withdrawn', 'mediated'];
      if (terminalStatuses.includes(dispute.status)) {
        return NextResponse.json(
          { error: 'Dispute is already in a terminal state' },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('disputes')
        .update({ status: 'withdrawn' })
        .eq('id', id)
        .select(DISPUTE_DETAIL_SELECT)
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating dispute:', error);
    return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
  }
}
