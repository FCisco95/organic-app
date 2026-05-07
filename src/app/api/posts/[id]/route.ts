import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { updatePostSchema, moderatePostSchema } from '@/features/posts/schemas';

type RouteParams = { params: Promise<{ id: string }> };

const POST_SELECT =
  '*, author:user_profiles!posts_author_id_fkey(id,name,email,organic_id,avatar_url,easter_2026_eggs_found)';

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();

    const { data: post, error } = await (supabase as any)
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if removed (non-authors can't see)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const postData = post as Record<string, unknown>;

    if (postData.removed_at && postData.author_id !== user?.id) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check user like
    let userLiked = false;
    if (user) {
      const { data: like } = await (supabase as any)
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      userLiked = !!like;
    }

    // Fetch thread parts if applicable
    let threadParts: unknown[] = [];
    if (postData.post_type === 'thread') {
      const { data: parts } = await (supabase as any)
        .from('post_thread_parts')
        .select('*')
        .eq('post_id', postId)
        .order('part_order');
      threadParts = parts ?? [];
    }

    return NextResponse.json({
      ...postData,
      user_liked: userLiked,
      thread_parts: threadParts,
    });
  } catch (error) {
    logger.error('Post GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const rateLimited = await applyUserRateLimit(user.id, 'posts:update', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    // Fetch existing post
    const { data: existingPost } = await (supabase as any)
      .from('posts')
      .select('id, author_id, status')
      .eq('id', postId)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const isOwner = existingPost.author_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    // Admin moderation fields
    let updateData: Record<string, unknown> = {};

    if (isAdmin) {
      const modParsed = moderatePostSchema.safeParse(parsedBody.data);
      if (modParsed.success) {
        const { is_pinned, status, removed_reason } = modParsed.data;
        if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
        if (status !== undefined) {
          updateData.status = status;
          if (status === 'removed') {
            updateData.removed_at = new Date().toISOString();
            updateData.removed_reason = removed_reason ?? null;
          }
        }
      }
    }

    // Author update fields
    if (isOwner) {
      const updateParsed = updatePostSchema.safeParse(parsedBody.data);
      if (updateParsed.success) {
        const { title, body, tags, status } = updateParsed.data;
        if (title !== undefined) updateData.title = title;
        if (body !== undefined) updateData.body = body;
        if (tags !== undefined) updateData.tags = tags;
        if (status !== undefined) updateData.status = status;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select(POST_SELECT)
      .single();

    if (updateError || !updated) {
      logger.error('Post update failed', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    // Invalidate cached translations if title or body changed
    if (updateData.title || updateData.body) {
      const serviceClient = createServiceClient();
      await (serviceClient as any)
        .from('content_translations')
        .delete()
        .eq('content_type', 'post')
        .eq('content_id', postId);
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Post PATCH route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
