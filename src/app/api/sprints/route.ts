import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';

const SPRINT_COLUMNS =
  'id, org_id, name, start_at, end_at, status, capacity_points, goal, created_at, updated_at';

// GET - Fetch sprints with pagination
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;

    const { data: sprints, error, count } = await supabase
      .from('sprints')
      .select(SPRINT_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 });
    }

    return NextResponse.json({
      sprints,
      pagination: { page, limit, total: count ?? 0, hasMore: offset + limit < (count ?? 0) },
    });
  } catch (error) {
    logger.error('Sprints GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new sprint
export async function POST(request: Request) {
  try {
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
        { error: 'Only council and admin members can create sprints' },
        { status: 403 }
      );
    }

    const parsedBody = await parseJsonBody<{
      name?: string;
      start_at?: string;
      end_at?: string;
      status?: Database['public']['Enums']['sprint_status'];
      capacity_points?: number | null;
      goal?: string | null;
    }>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }
    const { name, start_at, end_at, status, capacity_points, goal } = parsedBody.data;

    if (!name || !start_at || !end_at) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert({
        name,
        start_at,
        end_at,
        status: status || 'planning',
        capacity_points: capacity_points ?? null,
        goal: goal || null,
      })
      .select(SPRINT_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint });
  } catch (error) {
    logger.error('Sprints POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
