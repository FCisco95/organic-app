import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reviewSchema = z
  .object({
    quality_score: z.number().int().min(1).max(5),
    reviewer_notes: z.string().max(2000).optional(),
    action: z.enum(['approve', 'reject']),
    rejection_reason: z.string().max(1000).optional(),
  })
  .refine((data) => data.action !== 'reject' || data.rejection_reason, {
    message: 'Rejection reason is required when rejecting',
    path: ['rejection_reason'],
  });

// POST - Review a submission
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: submissionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has permission to review (admin or council)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admin and council members can review submissions' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = reviewSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid review data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { quality_score, reviewer_notes, action, rejection_reason } = validationResult.data;

    // Get the submission
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select('id, task_id, user_id, review_status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check if submission is pending
    if (submission.review_status !== 'pending') {
      return NextResponse.json(
        { error: 'This submission has already been reviewed' },
        { status: 400 }
      );
    }

    // Get task details for points calculation
    const { data: task } = await supabase
      .from('tasks')
      .select('id, is_team_task, base_points, points')
      .eq('id', submission.task_id)
      .single();

    const basePoints = task?.base_points || task?.points || 0;

    // Calculate earned points (using quality multiplier)
    const qualityMultipliers: Record<number, number> = {
      1: 0.2,
      2: 0.4,
      3: 0.6,
      4: 0.8,
      5: 1.0,
    };
    const earnedPoints =
      action === 'approve' ? Math.floor(basePoints * (qualityMultipliers[quality_score] || 0)) : 0;

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('task_submissions')
      .update({
        quality_score,
        reviewer_id: user.id,
        reviewer_notes: reviewer_notes || null,
        review_status: action === 'approve' ? 'approved' : 'rejected',
        rejection_reason: action === 'reject' ? rejection_reason : null,
        earned_points: earnedPoints,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json({ error: 'Failed to review submission' }, { status: 500 });
    }

    // If approved, update user points and task status
    if (action === 'approve') {
      // Update user points manually
      if (earnedPoints > 0) {
        // Get current points
        const { data: currentProfile } = await supabase
          .from('user_profiles')
          .select('total_points, tasks_completed')
          .eq('id', submission.user_id)
          .single();

        const currentPoints = currentProfile?.total_points || 0;
        const currentTasksCompleted = currentProfile?.tasks_completed || 0;

        await supabase
          .from('user_profiles')
          .update({
            total_points: currentPoints + earnedPoints,
            tasks_completed: currentTasksCompleted + 1,
          })
          .eq('id', submission.user_id);
      }

      // For solo tasks, mark as done
      if (task && !task.is_team_task) {
        await supabase.from('tasks').update({ status: 'done' }).eq('id', submission.task_id);
      }
    }

    return NextResponse.json({
      submission: updatedSubmission,
      earned_points: earnedPoints,
    });
  } catch (error: unknown) {
    console.error('Error reviewing submission:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
