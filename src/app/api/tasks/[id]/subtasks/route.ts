import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSubtaskSchema } from '@/features/tasks/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';

// GET - Fetch subtasks for a parent task
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

    const { data: subtasks, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:user_profiles!tasks_assignee_id_fkey(
          id, name, email, organic_id, avatar_url
        )
      `
      )
      .eq('parent_task_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subtasks:', error);
      return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
    }

    // Calculate progress
    const total = subtasks?.length ?? 0;
    const completed = subtasks?.filter((t) => t.status === 'done').length ?? 0;

    return NextResponse.json({
      subtasks: subtasks ?? [],
      progress: {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Subtasks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a subtask under a parent task
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: parentTaskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has organic_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organic_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      // Non-admin must be task creator
      const { data: parentTask } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', parentTaskId)
        .single();

      if (!parentTask || parentTask.created_by !== user.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Verify parent task exists and is not itself a subtask
    const { data: parentTask, error: parentError } = await supabase
      .from('tasks')
      .select('id, parent_task_id, sprint_id')
      .eq('id', parentTaskId)
      .single();

    if (parentError || !parentTask) {
      return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
    }

    if (parentTask.parent_task_id) {
      return NextResponse.json(
        { error: 'Cannot create subtasks under a subtask (max 1 level)' },
        { status: 400 }
      );
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = createSubtaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: subtask, error } = await supabase
      .from('tasks')
      .insert({
        ...parsed.data,
        parent_task_id: parentTaskId,
        sprint_id: parentTask.sprint_id,
        points: parsed.data.base_points,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subtask:', error);
      return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
    }

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    console.error('Subtasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
