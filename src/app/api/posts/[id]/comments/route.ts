import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { addPostCommentSchema } from '@/features/posts/schemas';
import { awardXp } from '@/features/gamification/xp-service';

type RouteParams = { params: Promise<{ id: string }> };

const COMMENT_SELECT = `
  id,
  body,
  user_id,
  created_at,
  updated_at,
  user_profiles!comments_user_id_fkey(
    id,
    name,
    email,
    organic_id,
    avatar_url
  )
`;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const before = searchParams.get('before');

    let query = supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('subject_type', 'post')
      .eq('subject_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: comments, error } = await query;

    if (error) {
      logger.error('Failed to fetch post comments', error);
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
    logger.error('Post comments GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'posts:comment', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to comment' },
        { status: 403 }
      );
    }

    // Check post exists and is not locked/removed
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, status, removed_at')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.removed_at) {
      return NextResponse.json({ error: 'Post has been removed' }, { status: 400 });
    }

    if (post.status === 'removed') {
      return NextResponse.json({ error: 'Post has been removed' }, { status: 400 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = addPostCommentSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        subject_type: 'post',
        subject_id: postId,
        user_id: user.id,
        body: parsed.data.body,
      })
      .select(COMMENT_SELECT)
      .single();

    if (insertError || !comment) {
      logger.error('Post comment insert failed', insertError);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    const service = createServiceClient();
    await Promise.allSettled([
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'post_commented' as any,
        subject_type: 'post',
        subject_id: postId,
        metadata: { comment_id: comment.id },
      }),
      awardXp(service, {
        userId: user.id,
        eventType: 'comment_created',
        xpAmount: 5,
        sourceType: 'post_comment',
        sourceId: comment.id as string,
        metadata: { post_id: postId },
      }),
    ]);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    logger.error('Post comments POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
