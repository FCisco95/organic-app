import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Claim a task
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has an Organic ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organic_id) {
      return NextResponse.json({ error: 'You need an Organic ID to claim tasks' }, { status: 403 });
    }

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, is_team_task, assignee_id, max_assignees, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is claimable
    if (!['backlog', 'todo'].includes(task.status)) {
      return NextResponse.json(
        { error: 'This task is not available for claiming' },
        { status: 400 }
      );
    }

    if (task.is_team_task) {
      // Team task: check assignee count
      const { count } = await supabase
        .from('task_assignees')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      if ((count || 0) >= task.max_assignees) {
        return NextResponse.json(
          { error: 'This task has reached maximum assignees' },
          { status: 400 }
        );
      }

      // Check if user already claimed
      const { data: existing } = await supabase
        .from('task_assignees')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'You have already claimed this task' }, { status: 400 });
      }

      // Add user to task assignees
      const { error: insertError } = await supabase.from('task_assignees').insert({
        task_id: taskId,
        user_id: user.id,
      });

      if (insertError) {
        return NextResponse.json({ error: 'Failed to claim task' }, { status: 500 });
      }

      // Update task status to in_progress if still in backlog/todo
      await supabase
        .from('tasks')
        .update({ status: 'in_progress', completed_at: null })
        .eq('id', taskId)
        .in('status', ['backlog', 'todo']);
    } else {
      // Solo task: check if already claimed
      if (task.assignee_id) {
        return NextResponse.json({ error: 'This task is already claimed' }, { status: 400 });
      }

      // Assign task to user
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          assignee_id: user.id,
          claimed_at: new Date().toISOString(),
          status: 'in_progress',
          completed_at: null,
        })
        .eq('id', taskId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to claim task' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Task claimed successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unclaim a task
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, is_team_task, assignee_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Don't allow unclaiming tasks that are already in review or done
    if (['review', 'done'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Cannot unclaim a task in review or already completed' },
        { status: 400 }
      );
    }

    if (task.is_team_task) {
      // Remove user from task assignees
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to unclaim task' }, { status: 500 });
      }

      // Check if there are any assignees left
      const { count } = await supabase
        .from('task_assignees')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      // If no assignees left, set status back to todo
      if (count === 0) {
        await supabase.from('tasks').update({ status: 'todo', completed_at: null }).eq('id', taskId);
      }
    } else {
      // Solo task: clear assignee
      if (task.assignee_id !== user.id) {
        return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          assignee_id: null,
          claimed_at: null,
          status: 'todo',
          completed_at: null,
        })
        .eq('id', taskId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to unclaim task' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Task unclaimed' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
