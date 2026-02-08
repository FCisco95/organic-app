import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addDependencySchema } from '@/features/tasks/schemas';

// GET - Fetch dependencies for a task
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

    // Fetch tasks that block this task (this task depends on them)
    const { data: blockers, error: blockersError } = await supabase
      .from('task_dependencies')
      .select(
        `
        id,
        task_id,
        depends_on_task_id,
        created_at,
        created_by,
        blocking_task:tasks!task_dependencies_depends_on_task_id_fkey(
          id, title, status
        )
      `
      )
      .eq('task_id', id);

    if (blockersError) {
      console.error('Error fetching blockers:', blockersError);
      return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
    }

    // Fetch tasks blocked by this task (they depend on this task)
    const { data: blocking, error: blockingError } = await supabase
      .from('task_dependencies')
      .select(
        `
        id,
        task_id,
        depends_on_task_id,
        created_at,
        created_by,
        blocked_task:tasks!task_dependencies_task_id_fkey(
          id, title, status
        )
      `
      )
      .eq('depends_on_task_id', id);

    if (blockingError) {
      console.error('Error fetching blocking:', blockingError);
      return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
    }

    return NextResponse.json({
      dependencies: blockers ?? [],
      blocked_by_this: blocking ?? [],
    });
  } catch (error) {
    console.error('Dependencies GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a dependency to a task
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

    // Check user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      // Check if user is the task creator
      const { data: task } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!task || task.created_by !== user.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = addDependencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Prevent self-dependency
    if (parsed.data.depends_on_task_id === id) {
      return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 });
    }

    // Verify target task exists
    const { data: targetTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', parsed.data.depends_on_task_id)
      .single();

    if (!targetTask) {
      return NextResponse.json({ error: 'Target task not found' }, { status: 404 });
    }

    const { data: dependency, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: id,
        depends_on_task_id: parsed.data.depends_on_task_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
      }
      if (error.message?.includes('circular')) {
        return NextResponse.json(
          { error: 'This would create a circular dependency' },
          { status: 400 }
        );
      }
      console.error('Error adding dependency:', error);
      return NextResponse.json({ error: 'Failed to add dependency' }, { status: 500 });
    }

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    console.error('Dependencies POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a dependency
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const url = new URL(request.url);
    const dependencyId = url.searchParams.get('id');

    if (!dependencyId) {
      return NextResponse.json({ error: 'Dependency ID required' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check user role or task ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      const { data: task } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!task || task.created_by !== user.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId)
      .eq('task_id', id);

    if (error) {
      console.error('Error removing dependency:', error);
      return NextResponse.json({ error: 'Failed to remove dependency' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dependencies DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
