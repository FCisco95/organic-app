import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeSprintSchema } from '@/features/sprints/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if user is council or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    if (role !== 'council' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only council and admin members can complete sprints' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = completeSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { incomplete_action, next_sprint_id } = parsed.data;

    // Verify sprint exists and is active
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', id)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (sprint.status !== 'active') {
      return NextResponse.json({ error: 'Only active sprints can be completed' }, { status: 400 });
    }

    // If moving to next sprint, validate it exists and is in planning
    if (incomplete_action === 'next_sprint') {
      if (!next_sprint_id) {
        return NextResponse.json(
          { error: 'next_sprint_id is required when incomplete_action is next_sprint' },
          { status: 400 }
        );
      }
      const { data: nextSprint } = await supabase
        .from('sprints')
        .select('id, status')
        .eq('id', next_sprint_id)
        .single();

      if (!nextSprint) {
        return NextResponse.json({ error: 'Next sprint not found' }, { status: 404 });
      }
      if (nextSprint.status !== 'planning') {
        return NextResponse.json(
          { error: 'Next sprint must be in planning status' },
          { status: 400 }
        );
      }
    }

    // Fetch all sprint tasks with assignee info
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id, title, status, points, assignee_id,
        assignee:user_profiles!tasks_assignee_id_fkey(name)
      `
      )
      .eq('sprint_id', id);

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch sprint tasks' }, { status: 500 });
    }

    const allTasks = tasks ?? [];
    const completedTasks = allTasks.filter((t) => t.status === 'done');
    const incompleteTasks = allTasks.filter((t) => t.status !== 'done');

    const totalPoints = allTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const completionRate =
      allTasks.length > 0
        ? Number(((completedTasks.length / allTasks.length) * 100).toFixed(2))
        : 0;

    // Build task summary JSONB
    const taskSummary = allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      points: t.points,
      assignee_name: (t.assignee as { name: string | null } | null)?.name ?? null,
    }));

    // Insert snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('sprint_snapshots')
      .insert({
        sprint_id: id,
        completed_by: user.id,
        total_tasks: allTasks.length,
        completed_tasks: completedTasks.length,
        incomplete_tasks: incompleteTasks.length,
        total_points: totalPoints,
        completed_points: completedPoints,
        completion_rate: completionRate,
        task_summary: taskSummary,
        incomplete_action: incomplete_action,
      })
      .select()
      .single();

    if (snapError) {
      console.error('Error creating sprint snapshot:', snapError);
      return NextResponse.json({ error: 'Failed to create sprint snapshot' }, { status: 500 });
    }

    // Handle incomplete tasks
    if (incompleteTasks.length > 0) {
      const incompleteIds = incompleteTasks.map((t) => t.id);

      if (incomplete_action === 'backlog') {
        const { error: backlogError } = await supabase
          .from('tasks')
          .update({ sprint_id: null, status: 'backlog' })
          .in('id', incompleteIds);

        if (backlogError) {
          console.error('Error moving tasks to backlog:', backlogError);
        }
      } else if (incomplete_action === 'next_sprint' && next_sprint_id) {
        const { error: moveError } = await supabase
          .from('tasks')
          .update({ sprint_id: next_sprint_id })
          .in('id', incompleteIds);

        if (moveError) {
          console.error('Error moving tasks to next sprint:', moveError);
        }
      }
    }

    // Update sprint to completed
    const { data: updatedSprint, error: updateError } = await supabase
      .from('sprints')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to complete sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint: updatedSprint, snapshot });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
