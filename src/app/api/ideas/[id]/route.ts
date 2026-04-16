import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { updateIdeaSchema, moderateIdeaSchema } from '@/features/ideas/schemas';
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
      .maybeSingle();

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

    // Parse content updates (author or admin)
    const contentParsed = updateIdeaSchema.safeParse(parsedBody.data);
    // Parse moderation fields (admin only)
    const modParsed = moderateIdeaSchema.safeParse(parsedBody.data);

    const contentUpdates = contentParsed.success ? contentParsed.data : {};
    const modUpdates = modParsed.success && canModerate ? modParsed.data : {};

    if (Object.keys(contentUpdates).length === 0 && Object.keys(modUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Non-moderators cannot send moderation fields
    if (!canModerate && modParsed.success && Object.keys(modParsed.data).length > 0) {
      return NextResponse.json({ error: 'Forbidden: moderation fields require admin/council role' }, { status: 403 });
    }

    // Build the DB update payload
    const dbUpdate: Record<string, unknown> = {
      ...contentUpdates,
      last_activity_at: new Date().toISOString(),
    };

    // Apply moderation fields
    if (modUpdates.is_pinned !== undefined) {
      dbUpdate.is_pinned = modUpdates.is_pinned;
      dbUpdate.pinned_at = modUpdates.is_pinned ? new Date().toISOString() : null;
    }
    if (modUpdates.status === 'locked') {
      dbUpdate.status = 'locked';
      dbUpdate.locked_at = new Date().toISOString();
    } else if (modUpdates.status === 'removed') {
      dbUpdate.status = 'removed';
      dbUpdate.removed_at = new Date().toISOString();
      dbUpdate.removed_reason = modUpdates.removed_reason ?? null;
    } else if (modUpdates.status === 'open') {
      // Re-open: clear lock/remove state
      dbUpdate.status = 'open';
      dbUpdate.locked_at = null;
      dbUpdate.removed_at = null;
      dbUpdate.removed_reason = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('ideas')
      .update(dbUpdate as never)
      .eq('id', id)
      .select(IDEA_SELECT)
      .single();

    if (updateError || !updated) {
      logger.error('Idea update failed', updateError);
      return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
    }

    // Invalidate cached translations when translated fields change.
    if (contentUpdates.title !== undefined || contentUpdates.body !== undefined) {
      const serviceClient = createServiceClient();
      await (serviceClient as any)
        .from('content_translations')
        .delete()
        .eq('content_type', 'idea')
        .eq('content_id', id);
    }

    // Log events
    const service = createServiceClient();
    const allKeys = [...Object.keys(contentUpdates), ...Object.keys(modUpdates)];
    const isModAction = Object.keys(modUpdates).length > 0;

    await service.from('idea_events').insert({
      idea_id: id,
      actor_id: user.id,
      event_type: isModAction ? 'moderated' : 'updated',
      metadata: {
        keys: allKeys,
        ...(modUpdates.status ? { action: modUpdates.status } : {}),
        ...(modUpdates.is_pinned !== undefined ? { pinned: modUpdates.is_pinned } : {}),
        ...(modUpdates.removed_reason ? { removed_reason: modUpdates.removed_reason } : {}),
      },
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
