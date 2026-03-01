import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { promoteIdeaSchema } from '@/features/ideas/schemas';
import { IDEA_PROPOSAL_CATEGORY_FALLBACK } from '@/features/ideas/types';
import { getCurrentWeekWindow, isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

type RouteParams = { params: Promise<{ id: string }> };

function makeSummary(body: string): string {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 300) return normalized;
  return `${normalized.slice(0, 297)}...`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: ideaId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:promote', RATE_LIMITS.sensitive);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !isAdminOrCouncil(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = promoteIdeaSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: idea } = await supabase
      .from('ideas')
      .select('id, author_id, title, body, status, removed_at, promoted_to_proposal_id')
      .eq('id', ideaId)
      .single();

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (idea.removed_at) {
      return NextResponse.json({ error: 'Idea has been removed' }, { status: 400 });
    }

    if (idea.promoted_to_proposal_id) {
      return NextResponse.json(
        { error: 'Idea is already promoted', proposal_id: idea.promoted_to_proposal_id },
        { status: 409 }
      );
    }

    const category = parsed.data.category ?? IDEA_PROPOSAL_CATEGORY_FALLBACK;
    const summary = makeSummary(idea.body);
    const bodyText = [
      summary,
      '',
      '## Problem / Motivation',
      idea.body,
      '',
      '## Proposed Solution',
      'Promote this community idea into a full proposal with implementation scope and owner commitments.',
    ].join('\n');

    const service = createServiceClient();

    const { data: proposal, error: proposalError } = await service
      .from('proposals')
      .insert({
        title: idea.title,
        body: bodyText,
        category,
        summary,
        motivation: idea.body,
        source_idea_id: ideaId,
        solution:
          'Promoted from Ideas Incubator. Refine milestones, budget, and implementation owners in proposal discussion.',
        status: 'draft',
        created_by: idea.author_id,
      })
      .select('id')
      .single();

    if (proposalError || !proposal) {
      logger.error('Failed to create proposal from idea', proposalError);
      return NextResponse.json({ error: 'Failed to create linked proposal' }, { status: 500 });
    }

    const week = getCurrentWeekWindow();

    const [updateIdeaResult, cycleResult] = await Promise.all([
      service
        .from('ideas')
        .update({
          status: 'promoted',
          promoted_to_proposal_id: proposal.id,
          promoted_at: new Date().toISOString(),
          promotion_cycle_start: week.startDate,
        })
        .eq('id', ideaId),
      service
        .from('idea_promotion_cycles')
        .upsert(
          {
            cycle_start: week.startDate,
            cycle_end: week.endIso.slice(0, 10),
            winner_idea_id: ideaId,
            winner_selected_by: user.id,
            winner_selected_at: new Date().toISOString(),
            promoted_proposal_id: proposal.id,
            status: 'promoted',
          },
          { onConflict: 'cycle_start' }
        ),
    ]);

    if (updateIdeaResult.error || cycleResult.error) {
      logger.error('Failed to finalize idea promotion', {
        updateIdeaError: updateIdeaResult.error,
        cycleError: cycleResult.error,
      });
      return NextResponse.json(
        { error: 'Proposal created but idea linkage update failed', proposal_id: proposal.id },
        { status: 500 }
      );
    }

    await Promise.allSettled([
      service.from('idea_events').insert({
        idea_id: ideaId,
        actor_id: user.id,
        event_type: 'promoted',
        metadata: { proposal_id: proposal.id },
      }),
      service.from('activity_log').insert({
        actor_id: idea.author_id,
        event_type: 'proposal_created',
        subject_type: 'proposal',
        subject_id: proposal.id,
        metadata: { source_idea_id: ideaId, promoted_by: user.id },
      }),
    ]);

    return NextResponse.json({ proposal_id: proposal.id });
  } catch (error) {
    logger.error('Idea promote route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
