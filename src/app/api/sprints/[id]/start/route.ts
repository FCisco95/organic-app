import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        { error: 'Only council and admin members can start sprints' },
        { status: 403 }
      );
    }

    // Verify sprint exists and is in planning status
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (sprint.status !== 'planning') {
      return NextResponse.json(
        { error: 'Only sprints in planning status can be started' },
        { status: 400 }
      );
    }

    // Check no other sprint is active
    const { data: activeSprints } = await supabase
      .from('sprints')
      .select('id, name')
      .eq('status', 'active')
      .limit(1);

    if (activeSprints && activeSprints.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot start sprint — "${activeSprints[0].name}" is already active`,
          active_sprint: activeSprints[0],
        },
        { status: 409 }
      );
    }

    // Update sprint to active
    const { data: updatedSprint, error: updateError } = await supabase
      .from('sprints')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to start sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint: updatedSprint });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
