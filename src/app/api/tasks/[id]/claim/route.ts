import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Join a task (universal self-join: always uses task_assignees)
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
      return NextResponse.json({ error: 'You need an Organic ID to join tasks' }, { status: 403 });
    }

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assignee_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is joinable (allow additional participants while in progress)
    if (!task.status || !['backlog', 'todo', 'in_progress'].includes(task.status)) {
      return NextResponse.json(
        { error: 'This task is not available for joining' },
        { status: 400 }
      );
    }

    // Check if user already joined
    const { data: existing } = await supabase
      .from('task_assignees')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already joined this task' }, { status: 400 });
    }

    // Add user to task_assignees (unlimited joins)
    const { error: insertError } = await supabase.from('task_assignees').insert({
      task_id: taskId,
      user_id: user.id,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to join task' }, { status: 500 });
    }

    // Atomically set as primary assignee if no one claimed yet (prevents race condition)
    await supabase
      .from('tasks')
      .update({ assignee_id: user.id, claimed_at: new Date().toISOString() })
      .eq('id', taskId)
      .is('assignee_id', null); // only succeeds if still unclaimed

    // Atomically move task to in_progress if still in backlog/todo
    await supabase
      .from('tasks')
      .update({ status: 'in_progress', completed_at: null })
      .eq('id', taskId)
      .in('status', ['backlog', 'todo']);

    return NextResponse.json({ success: true, message: 'Task joined successfully' });
  } catch (error) {
    console.error('Task claim POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Leave a task
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
      .select('id, assignee_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Don't allow leaving tasks that are in review or done
    if (task.status && ['review', 'done'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Cannot leave a task in review or already completed' },
        { status: 400 }
      );
    }

    // Don't allow leaving if user has already submitted work for this task
    const { data: existingSubmission } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Cannot leave a task after submitting work' },
        { status: 400 }
      );
    }

    // Remove user from task_assignees
    const { error: deleteError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to leave task' }, { status: 500 });
    }

    // Check remaining assignees
    const { count } = await supabase
      .from('task_assignees')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId);

    if (count === 0) {
      // No assignees left — move back to todo and clear primary assignee
      await supabase
        .from('tasks')
        .update({ status: 'todo', assignee_id: null, claimed_at: null, completed_at: null })
        .eq('id', taskId);
    } else if (task.assignee_id === user.id) {
      // If leaving user was the primary assignee, reassign to first remaining
      const { data: nextAssignee } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId)
        .order('claimed_at', { ascending: true })
        .limit(1)
        .single();

      if (nextAssignee) {
        await supabase
          .from('tasks')
          .update({ assignee_id: nextAssignee.user_id })
          .eq('id', taskId);
      }
    }

    return NextResponse.json({ success: true, message: 'Left task successfully' });
  } catch (error) {
    console.error('Task claim DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
