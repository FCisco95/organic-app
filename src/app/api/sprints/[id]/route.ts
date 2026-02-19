import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { updateSprintSchema } from '@/features/sprints/schemas';
import { logger } from '@/lib/logger';

const SPRINT_COLUMNS =
  'id, org_id, name, start_at, end_at, status, capacity_points, goal, created_at, updated_at';
const SPRINT_SNAPSHOT_COLUMNS =
  'id, sprint_id, completed_by, completed_at, total_tasks, completed_tasks, incomplete_tasks, total_points, completed_points, completion_rate, task_summary, incomplete_action, created_at';

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
      .select(SPRINT_COLUMNS)
      .eq('id', id)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Fetch tasks associated with this sprint
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        description,
        status,
        priority,
        points,
        sprint_id,
        assignee_id,
        created_by,
        created_at,
        updated_at,
        completed_at,
        assignee:user_profiles!tasks_assignee_id_fkey(
          id,
          name,
          email,
          organic_id,
          avatar_url
        )
      `
      )
      .eq('sprint_id', id)
      .order('created_at', { ascending: false });

    // For completed sprints, also return the snapshot
    let snapshot = null;
    if (sprint.status === 'completed') {
      const { data: snapshotData } = await supabase
        .from('sprint_snapshots')
        .select(SPRINT_SNAPSHOT_COLUMNS)
        .eq('sprint_id', id)
        .single();
      snapshot = snapshotData;
    }

    return NextResponse.json({
      sprint,
      tasks: tasks || [],
      snapshot,
    });
  } catch (error) {
    logger.error('Sprint GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    if (role !== 'council' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only council and admin members can update sprints' },
        { status: 403 }
      );
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const validationResult = updateSprintSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid sprint data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    const updates: Database['public']['Tables']['sprints']['Update'] = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.start_at !== undefined) updates.start_at = input.start_at;
    if (input.end_at !== undefined) updates.end_at = input.end_at;
    if (input.capacity_points !== undefined) updates.capacity_points = input.capacity_points;
    if (input.goal !== undefined) updates.goal = input.goal;

    const { data: sprint, error } = await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id)
      .select(SPRINT_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint });
  } catch (error) {
    logger.error('Sprint PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin members can delete sprints' }, { status: 403 });
    }

    const { error } = await supabase.from('sprints').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Sprint DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
