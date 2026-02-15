import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const QUALITY_MULTIPLIERS: Record<number, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
};

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
    const serviceClient = createServiceClient();

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
    const multiplier = QUALITY_MULTIPLIERS[quality_score] ?? 0;
    const earnedPoints = Math.floor(basePoints * multiplier);

    // Update submission with review
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('task_submissions')
      .update({
        quality_score,
        reviewer_id: user.id,
        reviewer_notes: reviewer_notes || null,
        review_status: action === 'approve' ? 'approved' : 'rejected',
        rejection_reason: action === 'reject' ? rejection_reason : null,
        earned_points: action === 'approve' ? earnedPoints : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json({ error: 'Failed to review submission' }, { status: 500 });
    }

    if (action === 'approve') {
      // 1. Update submitter's user_profiles: points + tasks_completed
      const { data: submitterProfile, error: profileError } = await serviceClient
        .from('user_profiles')
        .select('total_points, claimable_points, tasks_completed')
        .eq('id', submission.user_id)
        .single();

      if (profileError || !submitterProfile) {
        console.error('Error loading submitter profile:', profileError);
        return NextResponse.json({ error: 'Failed to update submitter profile' }, { status: 500 });
      }

      const { error: profileUpdateError } = await serviceClient
        .from('user_profiles')
        .update({
          total_points: (submitterProfile.total_points ?? 0) + earnedPoints,
          claimable_points: (submitterProfile.claimable_points ?? 0) + earnedPoints,
          tasks_completed: (submitterProfile.tasks_completed ?? 0) + 1,
        })
        .eq('id', submission.user_id);

      if (profileUpdateError) {
        console.error('Error updating submitter profile:', profileUpdateError);
        return NextResponse.json({ error: 'Failed to update submitter profile' }, { status: 500 });
      }

      // 2. Log task_completed activity (triggers XP via award_xp DB trigger)
      const { error: taskCompletedLogError } = await serviceClient.from('activity_log').insert({
        event_type: 'task_completed',
        actor_id: submission.user_id,
        subject_type: 'task',
        subject_id: submission.task_id,
        metadata: {
          submission_id: submissionId,
          points: earnedPoints,
          quality_score,
          reviewer_id: user.id,
        },
      });

      if (taskCompletedLogError) {
        console.error('Error logging task_completed activity:', taskCompletedLogError);
        return NextResponse.json({ error: 'Failed to log task completion' }, { status: 500 });
      }

      // 3. Run achievement checks after counters/XP updates from DB triggers.
      const { error: achievementError } = await serviceClient.rpc('check_achievements', {
        p_user_id: submission.user_id,
      });

      if (achievementError) {
        console.error('Error checking achievements:', achievementError);
        return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
      }

      // 4. For solo tasks, mark as done
      if (task && !task.is_team_task) {
        const { error: markDoneError } = await serviceClient
          .from('tasks')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', submission.task_id);

        if (markDoneError) {
          console.error('Error marking task as done:', markDoneError);
          return NextResponse.json({ error: 'Failed to mark task as done' }, { status: 500 });
        }
      }
    }
    // submission_reviewed activity is logged by DB trigger on task_submissions update.

    return NextResponse.json({
      submission: updatedSubmission,
    });
  } catch (error: unknown) {
    console.error('Error reviewing submission:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
