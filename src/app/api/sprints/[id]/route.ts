import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch a single sprint with its tasks
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

    // Fetch sprint details
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', id as any)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Fetch tasks associated with this sprint
    const { data: tasks, error: tasksError } = await supabase
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
        )
      `
      )
      .eq('sprint_id', id as any)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      // Continue without tasks rather than fail completely
    }

    return NextResponse.json({
      sprint,
      tasks: tasks || [],
    });
  } catch (error: any) {
    console.error('Error in sprint detail route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a sprint
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

    // Check if user is council or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id as any)
      .single();

    if (!profile || !['council', 'admin'].includes((profile as any).role)) {
      return NextResponse.json(
        { error: 'Only council and admin members can update sprints' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, start_at, end_at, status, capacity_points } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (start_at !== undefined) updates.start_at = start_at;
    if (end_at !== undefined) updates.end_at = end_at;
    if (status !== undefined) updates.status = status;
    if (capacity_points !== undefined) updates.capacity_points = capacity_points;

    const { data: sprint, error } = await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id as any)
      .select()
      .single();

    if (error) {
      console.error('Error updating sprint:', error);
      return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint });
  } catch (error: any) {
    console.error('Error in update sprint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a sprint
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id as any)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Only admin members can delete sprints' }, { status: 403 });
    }

    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', id as any);

    if (error) {
      console.error('Error deleting sprint:', error);
      return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete sprint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
