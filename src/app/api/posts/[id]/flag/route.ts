import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { deductPoints } from '@/features/gamification/points-service';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST — Flag a post as "not organic-related"
 * DELETE — Admin: restore organic bonus (penalizes false flaggers)
 */

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

    const rateLimited = await applyUserRateLimit(user.id, 'posts:flag', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    // Check post exists and is organic
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, author_id, is_organic, organic_bonus_revoked')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.is_organic) {
      return NextResponse.json({ error: 'Post is not marked as organic' }, { status: 400 });
    }

    // Can't flag your own post
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'Cannot flag your own post' }, { status: 400 });
    }

    // Already revoked — no need to pile on
    if (post.organic_bonus_revoked) {
      return NextResponse.json({ error: 'Organic bonus already revoked' }, { status: 400 });
    }

    // Insert flag (unique constraint handles duplicates)
    const { error: flagError } = await (supabase as any)
      .from('post_flags')
      .insert({ post_id: postId, user_id: user.id });

    if (flagError) {
      if (flagError.code === '23505') {
        return NextResponse.json({ error: 'You already flagged this post' }, { status: 400 });
      }
      throw flagError;
    }

    // Log activity
    const service = createServiceClient();
    await service.from('activity_log').insert({
      actor_id: user.id,
      event_type: 'post_flagged' as any,
      subject_type: 'post',
      subject_id: postId,
      metadata: {},
    });

    // Get updated flag count (trigger already updated it)
    const { data: updated } = await (supabase as any)
      .from('posts')
      .select('flag_count, organic_bonus_revoked')
      .eq('id', postId)
      .single();

    return NextResponse.json({
      flagged: true,
      flag_count: updated?.flag_count ?? 1,
      bonus_revoked: updated?.organic_bonus_revoked ?? false,
    });
  } catch (error) {
    logger.error('Post flag route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE — Admin: restore organic bonus and penalize false flaggers (-5 pts each)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Admin check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get the post
    const { data: post } = await (supabase as any)
      .from('posts')
      .select('id, is_organic, organic_bonus_revoked')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.organic_bonus_revoked) {
      return NextResponse.json({ error: 'Organic bonus is not revoked' }, { status: 400 });
    }

    // Get all flaggers
    const service = createServiceClient();
    const { data: flags } = await (service as any)
      .from('post_flags')
      .select('user_id')
      .eq('post_id', postId);

    // Penalize false flaggers: -5 pts each
    if (flags && flags.length > 0) {
      await Promise.allSettled(
        flags.map((flag: { user_id: string }) =>
          deductPoints(
            service,
            flag.user_id,
            5,
            'False flag penalty',
            'flag_penalty',
            postId
          )
        )
      );
    }

    // Delete all flags and restore bonus
    await (service as any).from('post_flags').delete().eq('post_id', postId);

    await (service as any)
      .from('posts')
      .update({
        organic_bonus_revoked: false,
        flag_count: 0,
      })
      .eq('id', postId);

    return NextResponse.json({
      restored: true,
      flaggers_penalized: flags?.length ?? 0,
    });
  } catch (error) {
    logger.error('Post flag DELETE route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
