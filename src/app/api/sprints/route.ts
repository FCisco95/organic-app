import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch all sprints
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sprints:', error);
      return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 });
    }

    return NextResponse.json({ sprints });
  } catch (error: any) {
    console.error('Error in sprints route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
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
      .eq('id', user.id as any)
      .single();

    if (!profile || !['council', 'admin'].includes((profile as any).role)) {
      return NextResponse.json(
        { error: 'Only council and admin members can create sprints' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, start_at, end_at, status, capacity_points } = body;

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
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating sprint:', error);
      return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint });
  } catch (error: any) {
    console.error('Error in create sprint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
