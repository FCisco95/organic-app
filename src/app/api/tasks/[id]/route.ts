import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { updateTaskSchema } from '@/features/tasks/schemas';
import { logger } from '@/lib/logger';

// GET - Fetch a single task with details
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:user_profiles!tasks_assignee_id_fkey(
          id,
          name,
          email,
          organic_id,
          avatar_url
        ),
        sprint:sprints(
          id,
          name,
          status
        ),
        proposal:proposals(
          id,
          title,
          status
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Run independent queries in parallel instead of sequentially (was 3 serial roundtrips)
    const [assigneesResult, submissionsResult, twitterTaskResult] = await Promise.all([
      // Team task assignees
      (task as Record<string, unknown>).is_team_task
        ? supabase
            .from('task_assignees')
            .select('*, user:user_profiles(id, name, email, organic_id, avatar_url)')
            .eq('task_id', id)
        : Promise.resolve({ data: [] }),
      // Submissions with user/reviewer joins
      supabase
        .from('task_submissions')
        .select(
          `
          *,
          user:user_profiles!task_submissions_user_id_fkey(
            id, name, email, organic_id, avatar_url
          ),
          reviewer:user_profiles!task_submissions_reviewer_id_fkey(
            id, name, email, organic_id
          )
        `
        )
        .eq('task_id', id)
        .order('submitted_at', { ascending: false }),
      // Twitter engagement task config
      supabase
        .from('twitter_engagement_tasks')
        .select('*')
        .eq('task_id', id)
        .maybeSingle(),
    ]);

    const assignees = assigneesResult.data || [];
    const submissions = submissionsResult.data || [];
    const twitterEngagementTask = twitterTaskResult.data || null;

    // Enrich twitter submissions if any exist
    const twitterSubmissionIds = submissions
      .filter((submission) => submission.submission_type === 'twitter')
      .map((submission) => submission.id);

    let enrichedSubmissions = submissions;

    if (twitterSubmissionIds.length > 0) {
      const { data: twitterSubmissions } = await supabase
        .from('twitter_engagement_submissions')
        .select('*')
        .in('submission_id', twitterSubmissionIds);

      const twitterSubmissionMap = new Map(
        (twitterSubmissions ?? []).map((submission) => [submission.submission_id, submission])
      );

      enrichedSubmissions = submissions.map((submission) => ({
        ...submission,
        twitter_engagement_submission: twitterSubmissionMap.get(submission.id) ?? null,
      }));
    }

    return NextResponse.json({
      task: {
        ...task,
        assignees,
        submissions: enrichedSubmissions,
        twitter_engagement_task: twitterEngagementTask,
      },
    });
  } catch (error) {
    logger.error('Task GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a task
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const validationResult = updateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid task data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) {
      updates.status = input.status;
      updates.completed_at = input.status === 'done' ? new Date().toISOString() : null;
    }
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.points !== undefined) updates.points = input.points;
    if (input.base_points !== undefined) updates.base_points = input.base_points;
    if (input.assignee_id !== undefined) updates.assignee_id = input.assignee_id;
    if (input.sprint_id !== undefined) updates.sprint_id = input.sprint_id;
    if (input.task_type !== undefined) updates.task_type = input.task_type;
    if (input.is_team_task !== undefined) updates.is_team_task = input.is_team_task;
    if (input.max_assignees !== undefined) updates.max_assignees = input.max_assignees;
    if (input.due_date !== undefined) updates.due_date = input.due_date;
    if (input.labels !== undefined) updates.labels = input.labels;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        assignee:user_profiles!tasks_assignee_id_fkey(
          id,
          name,
          email,
          organic_id,
          avatar_url
        ),
        sprint:sprints(
          id,
          name,
          status
        )
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    logger.error('Task PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a task
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin or council
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    if (role !== 'council' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only council and admin members can delete tasks' },
        { status: 403 }
      );
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Task DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
