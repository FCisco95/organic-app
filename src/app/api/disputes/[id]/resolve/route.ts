import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveDisputeSchema } from '@/features/disputes/schemas';

/**
 * POST /api/disputes/[id]/resolve
 * Arbitrator resolves the dispute.
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

    // Verify council/admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'council')) {
      return NextResponse.json(
        { error: 'Only council or admin members can resolve disputes' },
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

    // Verify the user is the assigned arbitrator (or admin for appeal_review)
    if (dispute.arbitrator_id !== user.id && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'You are not the assigned arbitrator for this dispute' },
        { status: 403 }
      );
    }

    // Conflict of interest check
    if (dispute.reviewer_id === user.id) {
      return NextResponse.json(
        { error: 'The original reviewer cannot arbitrate this dispute' },
        { status: 403 }
      );
    }

    // Check dispute is in a resolvable state
    const resolvableStatuses = ['under_review', 'appeal_review'];
    if (!resolvableStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Dispute is not in a resolvable state' },
        { status: 400 }
      );
    }

    // Parse input
    const body = await request.json();
    const parseResult = resolveDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const now = new Date().toISOString();

    // Determine terminal status
    const terminalStatus = input.resolution === 'dismissed' ? 'dismissed' : 'resolved';

    // Update dispute
    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        status: terminalStatus,
        resolution: input.resolution,
        resolution_notes: input.resolution_notes,
        new_quality_score: input.new_quality_score,
        resolved_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If overturned: approve the submission and award points
    if (input.resolution === 'overturned') {
      const { data: submission } = await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('id', dispute.submission_id)
        .single();

      // Get task base points
      const { data: task } = await supabase
        .from('tasks')
        .select('base_points')
        .eq('id', dispute.task_id)
        .single();

      const basePoints = task?.base_points ?? 0;
      // Full quality (5/5) on overturn
      const earnedPoints = basePoints;

      await supabase
        .from('task_submissions')
        .update({
          review_status: 'approved',
          quality_score: 5,
          earned_points: earnedPoints,
          reviewed_at: now,
        })
        .eq('id', dispute.submission_id);

      // Increment disputant total points
      if (earnedPoints > 0 && submission) {
        const { data: disputantProfile } = await supabase
          .from('user_profiles')
          .select('total_points')
          .eq('id', dispute.disputant_id)
          .single();

        await supabase
          .from('user_profiles')
          .update({
            total_points: (disputantProfile?.total_points ?? 0) + earnedPoints,
          })
          .eq('id', dispute.disputant_id);
      }
    }

    // If compromise: update submission with new quality score
    if (input.resolution === 'compromise' && input.new_quality_score) {
      const { data: task } = await supabase
        .from('tasks')
        .select('base_points')
        .eq('id', dispute.task_id)
        .single();

      const basePoints = task?.base_points ?? 0;
      const multipliers: Record<number, number> = {
        1: 0.2,
        2: 0.4,
        3: 0.6,
        4: 0.8,
        5: 1.0,
      };
      const earnedPoints = Math.round(
        basePoints * (multipliers[input.new_quality_score] ?? 0.6)
      );

      await supabase
        .from('task_submissions')
        .update({
          review_status: 'approved',
          quality_score: input.new_quality_score,
          earned_points: earnedPoints,
          reviewed_at: now,
        })
        .eq('id', dispute.submission_id);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { error: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}
