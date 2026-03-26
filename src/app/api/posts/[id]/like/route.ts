import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { awardXp } from '@/features/gamification/xp-service';
import { awardPoints, getPromotionMultiplier, type PromotionTier } from '@/features/gamification/points-service';

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

    // Check post exists and is published — include organic/promotion fields
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, author_id, status, is_organic, organic_bonus_revoked, is_promoted, promotion_tier, promotion_expires_at')
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
        if (likeError.code === '23505') {
          return NextResponse.json({ liked: true, likes_count: 0 });
        }
        throw likeError;
      }
      liked = true;

      // Determine organic bonus (organic + not revoked)
      const isOrganicActive = post.is_organic && !post.organic_bonus_revoked;

      // Promotion multiplier
      const promoMultiplier = getPromotionMultiplier(
        post.is_promoted,
        post.promotion_tier as PromotionTier | null,
        post.promotion_expires_at
      );

      // Award XP + points (non-blocking)
      const service = createServiceClient();
      const rewards: Promise<unknown>[] = [];

      // Liker XP: 1 (normal) or 2 (organic)
      const likerXp = isOrganicActive ? 2 : 1;
      rewards.push(
        awardXp(service, {
          userId: user.id,
          eventType: 'post_liked',
          xpAmount: likerXp,
          sourceType: 'post_like',
          sourceId: `${postId}:${user.id}`,
          metadata: { post_id: postId, is_organic: isOrganicActive },
        })
      );

      // Author XP: 2 (normal) or 3 (organic), with promotion multiplier
      const authorBaseXp = isOrganicActive ? 3 : 2;
      const authorXp = Math.round(authorBaseXp * promoMultiplier);
      rewards.push(
        awardXp(service, {
          userId: post.author_id,
          eventType: 'post_like_received',
          xpAmount: authorXp,
          sourceType: 'post_like',
          sourceId: `${postId}:${user.id}`,
          metadata: { post_id: postId, liker_id: user.id, is_organic: isOrganicActive, promo_multiplier: promoMultiplier },
        })
      );

      // Author points: 1 pt for organic post likes (with promotion multiplier)
      if (isOrganicActive) {
        const authorPts = Math.round(1 * promoMultiplier);
        rewards.push(
          awardPoints(
            service,
            post.author_id,
            authorPts,
            'Like received on organic post',
            'engagement',
            `like:${postId}:${user.id}`
          )
        );
      }

      await Promise.allSettled(rewards);
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
