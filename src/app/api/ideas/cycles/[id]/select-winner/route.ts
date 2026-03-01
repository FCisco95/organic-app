import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { selectIdeaWinnerSchema } from '@/features/ideas/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: cycleId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:select-winner', RATE_LIMITS.sensitive);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !isAdminOrCouncil(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: cycle } = await supabase
      .from('idea_promotion_cycles')
      .select('id, cycle_start, cycle_end, status')
      .eq('id', cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = selectIdeaWinnerSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let winnerId = parsed.data.idea_id ?? null;

    if (!winnerId) {
      const { data: winner } = await supabase
        .from('ideas')
        .select('id')
        .is('removed_at', null)
        .in('status', ['open', 'promoted'])
        .gte('created_at', `${cycle.cycle_start}T00:00:00.000Z`)
        .lt('created_at', `${cycle.cycle_end}T00:00:00.000Z`)
        .order('score', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      winnerId = winner?.id ?? null;
    }

    if (!winnerId) {
      return NextResponse.json({ error: 'No eligible winner found for cycle' }, { status: 404 });
    }

    const service = createServiceClient();

    const [cycleUpdate, ideaUpdate, eventInsert] = await Promise.all([
      service
        .from('idea_promotion_cycles')
        .update({
          winner_idea_id: winnerId,
          winner_selected_by: user.id,
          winner_selected_at: new Date().toISOString(),
          status: 'selected',
        })
        .eq('id', cycleId),
      service
        .from('ideas')
        .update({ promotion_cycle_start: cycle.cycle_start })
        .eq('id', winnerId),
      service.from('idea_events').insert({
        idea_id: winnerId,
        actor_id: user.id,
        event_type: 'winner_selected',
        metadata: { cycle_id: cycleId },
      }),
    ]);

    if (cycleUpdate.error || ideaUpdate.error || eventInsert.error) {
      logger.error('Failed to select idea winner', {
        cycleUpdateError: cycleUpdate.error,
        ideaUpdateError: ideaUpdate.error,
        eventError: eventInsert.error,
      });

      return NextResponse.json({ error: 'Failed to select winner' }, { status: 500 });
    }

    return NextResponse.json({ cycle_id: cycleId, winner_idea_id: winnerId, status: 'selected' });
  } catch (error) {
    logger.error('Idea cycle winner route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
