import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        created_by_user:user_profiles!tasks_created_by_fkey(
          id,
          name,
          email,
          organic_id
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

    // For team tasks, fetch assignees
    let assignees: unknown[] = [];
    if ((task as Record<string, unknown>).is_team_task) {
      const { data: assigneesData } = await supabase
        .from('task_assignees')
        .select(
          `
          *,
          user:user_profiles(id, name, email, organic_id, avatar_url)
        `
        )
        .eq('task_id', id);
      assignees = assigneesData || [];
    }

    // Fetch submissions
    const { data: submissions } = await supabase
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
      .order('submitted_at', { ascending: false });

    return NextResponse.json({
      task: {
        ...task,
        assignees,
        submissions: submissions || [],
      },
    });
  } catch {
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

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      points,
      base_points,
      assignee_id,
      sprint_id,
      task_type,
      is_team_task,
      max_assignees,
      due_date,
      labels,
    } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      updates.status = status;
      updates.completed_at = status === 'done' ? new Date().toISOString() : null;
    }
    if (priority !== undefined) updates.priority = priority;
    if (points !== undefined) updates.points = points;
    if (base_points !== undefined) updates.base_points = base_points;
    if (assignee_id !== undefined) updates.assignee_id = assignee_id;
    if (sprint_id !== undefined) updates.sprint_id = sprint_id;
    if (task_type !== undefined) updates.task_type = task_type;
    if (is_team_task !== undefined) updates.is_team_task = is_team_task;
    if (max_assignees !== undefined) updates.max_assignees = max_assignees;
    if (due_date !== undefined) updates.due_date = due_date;
    if (labels !== undefined) updates.labels = labels;

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
        created_by_user:user_profiles!tasks_created_by_fkey(
          id,
          name,
          email,
          organic_id
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
  } catch {
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

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
