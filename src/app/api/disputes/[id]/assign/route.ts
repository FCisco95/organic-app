import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/disputes/[id]/assign
 * Assign self as arbitrator (council/admin only).
 */
export async function POST(
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

    // Verify council/admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'council')) {
      return NextResponse.json(
        { error: 'Only council or admin members can be arbitrators' },
        { status: 403 }
      );
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

    // Conflict of interest check
    if (dispute.reviewer_id === user.id) {
      return NextResponse.json(
        { error: 'The original reviewer cannot arbitrate this dispute' },
        { status: 403 }
      );
    }

    // Check dispute is assignable
    const assignableStatuses = ['open', 'awaiting_response', 'under_review', 'appealed', 'appeal_review'];
    if (!assignableStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Dispute is not in an assignable state' },
        { status: 400 }
      );
    }

    // Admin-tier disputes can only be assigned to admins
    if (dispute.tier === 'admin' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin-tier disputes can only be assigned to admins' },
        { status: 403 }
      );
    }

    // Determine new status based on tier
    let newStatus = dispute.status;
    if (dispute.status === 'open' || dispute.status === 'awaiting_response') {
      newStatus = 'under_review';
    } else if (dispute.status === 'appealed') {
      newStatus = 'appeal_review';
    }

    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        arbitrator_id: user.id,
        status: newStatus,
        tier: dispute.tier === 'mediation' ? 'council' : dispute.tier,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not authorized to assign this dispute' },
          { status: 403 }
        );
      }
      throw updateError;
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error assigning arbitrator:', error);
    return NextResponse.json(
      { error: 'Failed to assign arbitrator' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/disputes/[id]/assign
 * Recuse self as arbitrator.
 */
export async function DELETE(
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

    // Load dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Only current arbitrator can recuse
    if (dispute.arbitrator_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not the assigned arbitrator' },
        { status: 403 }
      );
    }

    // Cannot recuse from terminal states
    const terminalStatuses = ['resolved', 'dismissed', 'withdrawn', 'mediated'];
    if (terminalStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Cannot recuse from a completed dispute' },
        { status: 400 }
      );
    }

    // Revert to previous state
    let newStatus = dispute.status;
    if (dispute.status === 'under_review') {
      newStatus = dispute.response_submitted_at ? 'under_review' : 'open';
    } else if (dispute.status === 'appeal_review') {
      newStatus = 'appealed';
    }

    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        arbitrator_id: null,
        status: newStatus,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not authorized to recuse from this dispute' },
          { status: 403 }
        );
      }
      throw updateError;
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error recusing arbitrator:', error);
    return NextResponse.json(
      { error: 'Failed to recuse arbitrator' },
      { status: 500 }
    );
  }
}
