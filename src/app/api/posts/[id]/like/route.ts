import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { awardXp } from '@/features/gamification/xp-service';

type RouteParams = { params: Promise<{ id: string }> };

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

    const rateLimited = await applyUserRateLimit(user.id, 'posts:like', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    // Check post exists and is published
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, author_id, status')
      .eq('id', postId)
      .eq('status', 'published')
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // No self-liking
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'Cannot like your own post' }, { status: 400 });
    }

    // Toggle like
    const { data: existingLike } = await (supabase as any)
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await (supabase as any).from('post_likes').delete().eq('id', existingLike.id);
      liked = false;
    } else {
      // Like
      const { error: likeError } = await (supabase as any)
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (likeError) {
        // Duplicate — already liked
        if (likeError.code === '23505') {
          return NextResponse.json({ liked: true, likes_count: 0 });
        }
        throw likeError;
      }
      liked = true;

      // Award XP to post author (non-blocking)
      const service = createServiceClient();
      await Promise.allSettled([
        awardXp(service, {
          userId: post.author_id,
          eventType: 'post_liked',
          xpAmount: 2,
          sourceType: 'post_like',
          sourceId: `${postId}:${user.id}`,
          metadata: { post_id: postId, liker_id: user.id },
        }),
      ]);
    }

    // Get updated count
    const { data: updated } = await (supabase as any)
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    return NextResponse.json({
      liked,
      likes_count: updated?.likes_count ?? 0,
    });
  } catch (error) {
    logger.error('Post like route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
