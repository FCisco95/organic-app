import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { updateIdeaSchema } from '@/features/ideas/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

type RouteParams = { params: Promise<{ id: string }> };

const IDEA_SELECT =
  '*, author:user_profiles!ideas_author_id_fkey(id,name,email,organic_id,avatar_url), linked_proposal:proposals!ideas_promoted_to_proposal_id_fkey(id,title,status)';

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: idea, error } = await supabase.from('ideas').select(IDEA_SELECT).eq('id', id).single();

    if (error || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ...idea, user_vote: 0 });
    }

    const { data: vote } = await supabase
      .from('idea_votes')
      .select('value')
      .eq('idea_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    const rawVote = Number(vote?.value ?? 0);
    const userVote: -1 | 0 | 1 = rawVote > 0 ? 1 : rawVote < 0 ? -1 : 0;

    return NextResponse.json({ ...idea, user_vote: userVote });
  } catch (error) {
    logger.error('Idea GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:update', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, author_id, status, removed_at')
      .eq('id', id)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const canModerate = isAdminOrCouncil(profile.role);
    const isAuthor = idea.author_id === user.id;

    if (!canModerate && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canModerate && (idea.status !== 'open' || idea.removed_at)) {
      return NextResponse.json({ error: 'Locked ideas cannot be edited' }, { status: 400 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = updateIdeaSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('ideas')
      .update({
        ...parsed.data,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(IDEA_SELECT)
      .single();

    if (updateError || !updated) {
      logger.error('Idea update failed', updateError);
      return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
    }

    const service = createServiceClient();
    await service.from('idea_events').insert({
      idea_id: id,
      actor_id: user.id,
      event_type: 'updated',
      metadata: { keys: Object.keys(parsed.data) },
    });

    const { data: vote } = await supabase
      .from('idea_votes')
      .select('value')
      .eq('idea_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    const rawVote = Number(vote?.value ?? 0);
    const userVote: -1 | 0 | 1 = rawVote > 0 ? 1 : rawVote < 0 ? -1 : 0;

    return NextResponse.json({ ...updated, user_vote: userVote });
  } catch (error) {
    logger.error('Idea PATCH route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
