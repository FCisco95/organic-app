import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { SprintStatus } from '@/types/database';

const EXECUTION_STATUSES: SprintStatus[] = ['active', 'review', 'dispute_window', 'settlement'];
const SPRINT_COLUMNS =
  'id, name, status, active_started_at, review_started_at, dispute_window_started_at, dispute_window_ends_at, settlement_started_at, settlement_integrity_flags, settlement_blocked_reason, completed_at';

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
      .select(SPRINT_COLUMNS)
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
      .in('status', EXECUTION_STATUSES)
      .neq('id', id)
      .limit(1);

    if (activeSprints && activeSprints.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot start sprint — "${activeSprints[0].name}" is already in progress`,
          active_sprint: activeSprints[0],
        },
        { status: 409 }
      );
    }

    // Update sprint to active
    const { data: updatedSprint, error: updateError } = await supabase
      .from('sprints')
      .update({
        status: 'active',
        active_started_at: new Date().toISOString(),
        settlement_blocked_reason: null,
      })
      .eq('id', id)
      .select(SPRINT_COLUMNS)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to start sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint: updatedSprint });
  } catch (error) {
    logger.error('Sprint start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
