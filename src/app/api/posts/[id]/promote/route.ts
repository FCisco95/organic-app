import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  deductPoints,
  PROMOTION_CONFIG,
  type PromotionTier,
} from '@/features/gamification/points-service';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const promoteSchema = z.object({
  tier: z.enum(['spotlight', 'feature', 'mega']),
});

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

    const rateLimited = await applyUserRateLimit(user.id, 'posts:promote', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = promoteSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tier } = parsed.data;
    const config = PROMOTION_CONFIG[tier as PromotionTier];

    // Check post exists, is published, owned by user
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, author_id, status, is_promoted, promotion_expires_at')
      .eq('id', postId)
      .eq('status', 'published')
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only promote your own posts' }, { status: 403 });
    }

    // Check if already actively promoted
    if (post.is_promoted && post.promotion_expires_at && new Date(post.promotion_expires_at) > new Date()) {
      return NextResponse.json(
        { error: 'This post is already promoted' },
        { status: 400 }
      );
    }

    // Check user doesn't have another active promotion
    const { count: activePromos } = await (supabase as any)
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .eq('is_promoted', true)
      .gt('promotion_expires_at', new Date().toISOString());

    if ((activePromos ?? 0) > 0) {
      return NextResponse.json(
        { error: 'You already have an active promoted post. Only one promotion at a time.' },
        { status: 400 }
      );
    }

    // Deduct points
    const service = createServiceClient();
    const deduction = await deductPoints(
      service,
      user.id,
      config.cost,
      `Promote post (${config.label})`,
      'promotion',
      postId
    );

    if (!deduction.success) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          required: config.cost,
          balance: deduction.newBalance,
        },
        { status: 400 }
      );
    }

    // Set promotion fields
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.durationHours);

    const { error: updateError } = await (supabase as any)
      .from('posts')
      .update({
        is_promoted: true,
        promotion_tier: tier,
        promotion_points: config.cost,
        promotion_expires_at: expiresAt.toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      logger.error('Failed to promote post', updateError);
      return NextResponse.json({ error: 'Failed to promote post' }, { status: 500 });
    }

    // Log activity
    await service.from('activity_log').insert({
      actor_id: user.id,
      event_type: 'post_promoted' as any,
      subject_type: 'post',
      subject_id: postId,
      metadata: { tier, cost: config.cost, expires_at: expiresAt.toISOString() },
    });

    return NextResponse.json({
      promoted: true,
      tier,
      cost: config.cost,
      expires_at: expiresAt.toISOString(),
      new_balance: deduction.newBalance,
    });
  } catch (error) {
    logger.error('Post promote route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
