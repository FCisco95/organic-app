import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { addPostCommentSchema } from '@/features/posts/schemas';
import { awardXp } from '@/features/gamification/xp-service';
import { getPromotionMultiplier, type PromotionTier } from '@/features/gamification/points-service';
import { checkUserRestriction } from '@/lib/moderation';

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

    const rateLimited = await applyUserRateLimit(user.id, 'posts:comment', RATE_LIMITS.comment);
    if (rateLimited) return rateLimited;

    const restricted = await checkUserRestriction(supabase, user.id);
    if (restricted) return restricted;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to comment' },
        { status: 403 }
      );
    }

    // Check post exists and is not locked/removed
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, author_id, status, removed_at, is_organic, organic_bonus_revoked, is_promoted, promotion_tier, promotion_expires_at')
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
    const isOrganicActive = post.is_organic && !post.organic_bonus_revoked;
    const promoMultiplier = getPromotionMultiplier(
      post.is_promoted,
      post.promotion_tier as PromotionTier | null,
      post.promotion_expires_at
    );

    // Commenter XP: 5 (normal) or 8 (organic)
    const commenterXp = isOrganicActive ? 8 : 5;

    // Author XP: 3 (normal) or 5 (organic), with promotion multiplier
    const authorBaseXp = isOrganicActive ? 5 : 3;
    const authorXp = Math.round(authorBaseXp * promoMultiplier);

    const rewards: PromiseLike<unknown>[] = [
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'post_commented' as any,
        subject_type: 'post',
        subject_id: postId,
        metadata: { comment_id: comment.id, is_organic: isOrganicActive },
      }) as any,
      awardXp(service, {
        userId: user.id,
        eventType: 'post_comment_created',
        xpAmount: commenterXp,
        sourceType: 'post_comment',
        sourceId: comment.id as string,
        metadata: { post_id: postId, is_organic: isOrganicActive },
      }),
    ];

    // Author XP for receiving a comment
    if (post.author_id !== user.id) {
      rewards.push(
        awardXp(service, {
          userId: post.author_id,
          eventType: 'post_comment_received',
          xpAmount: authorXp,
          sourceType: 'post_comment',
          sourceId: comment.id as string,
          metadata: { post_id: postId, commenter_id: user.id, is_organic: isOrganicActive, promo_multiplier: promoMultiplier },
        })
      );

      // Engagement no longer awards points. Points are only earned from
      // sprint task completion (settled at sprint close, weighted by score).
      // XP continues to reward engagement.
    }

    await Promise.allSettled(rewards);

    // Sync count from comments as fallback (trigger should handle this,
    // but may not exist or may be blocked by RLS on some environments)
    const { count: freshCount } = await (service as any)
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('subject_type', 'post')
      .eq('subject_id', postId);

    await (service as any)
      .from('posts')
      .update({ comments_count: freshCount ?? 0 })
      .eq('id', postId);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    logger.error('Post comments POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
