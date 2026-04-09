import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { addIdeaCommentSchema } from '@/features/ideas/schemas';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { awardXp } from '@/features/gamification/xp-service';
import { checkUserRestriction } from '@/lib/moderation';

type RouteParams = { params: Promise<{ id: string }> };

const COMMENT_SELECT = `
  id,
  body,
  user_id,
  created_at,
  updated_at,
  user_profiles!comments_user_id_fkey(
    name,
    email,
    organic_id,
    avatar_url
  )
`;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: ideaId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const before = searchParams.get('before');

    let query = supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('subject_type', 'idea')
      .eq('subject_id', ideaId)
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: comments, error } = await query;

    if (error) {
      logger.error('Failed to fetch idea comments', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const hasMore = (comments?.length ?? 0) > limit;
    const results = hasMore ? comments!.slice(0, limit) : (comments ?? []);

    return NextResponse.json({
      comments: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]?.created_at : null,
    });
  } catch (error) {
    logger.error('Idea comments GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:comment', RATE_LIMITS.comment);
    if (rateLimited) return rateLimited;

    const restricted = await checkUserRestriction(supabase, user.id);
    if (restricted) return restricted;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to comment on ideas' },
        { status: 403 }
      );
    }

    const { data: idea } = await supabase
      .from('ideas')
      .select('id, status, removed_at')
      .eq('id', ideaId)
      .single();

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (idea.removed_at) {
      return NextResponse.json({ error: 'Idea has been removed' }, { status: 400 });
    }

    if (idea.status === 'locked') {
      return NextResponse.json({ error: 'Comments are locked for this idea' }, { status: 400 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = addIdeaCommentSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        subject_type: 'idea',
        subject_id: ideaId,
        user_id: user.id,
        body: parsed.data.body,
      })
      .select(COMMENT_SELECT)
      .single();

    if (insertError || !comment) {
      logger.error('Idea comment insert failed', insertError);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    const service = createServiceClient();
    await Promise.allSettled([
      service.from('idea_events').insert({
        idea_id: ideaId,
        actor_id: user.id,
        event_type: 'comment_created',
        metadata: { comment_id: comment.id },
      }),
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'comment_created',
        subject_type: 'idea',
        subject_id: ideaId,
        metadata: { comment_id: comment.id },
      }),
      // Uses existing comment_created event — 5 XP via DB trigger
      // Additional idea-specific XP via centralized service
      awardXp(service, {
        userId: user.id,
        eventType: 'idea_comment_created',
        xpAmount: 5,
        sourceType: 'idea_comment',
        sourceId: comment.id,
        metadata: { idea_id: ideaId },
      }),
    ]);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    logger.error('Idea comments POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
