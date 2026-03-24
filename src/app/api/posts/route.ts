import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createPostSchema, listPostsQuerySchema } from '@/features/posts/schemas';
import { awardXp } from '@/features/gamification/xp-service';

const POST_SELECT =
  '*, author:user_profiles!posts_author_id_fkey(id,name,email,organic_id,avatar_url)';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const queryResult = listPostsQuerySchema.safeParse({
      sort: searchParams.get('sort') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sort, search, type, limit } = queryResult.data;

    let query = (supabase as any)
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .is('removed_at', null)
      .limit(limit);

    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    if (type) {
      query = query.eq('post_type', type);
    }

    if (sort === 'popular') {
      query = query
        .order('is_pinned', { ascending: false })
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else if (sort === 'top_week') {
      const weekStart = new Date();
      weekStart.setUTCDate(weekStart.getUTCDate() - 7);
      query = query
        .gte('created_at', weekStart.toISOString())
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      // 'new' — default
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    }

    const { data: posts, error } = await query;

    if (error) {
      logger.error('Posts feed query failed', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Check user likes
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !posts || posts.length === 0) {
      return NextResponse.json({
        items: (posts ?? []).map((p: Record<string, unknown>) => ({ ...p, user_liked: false })),
      });
    }

    const postIds = posts.map((p: Record<string, unknown>) => p.id as string);
    const { data: likes } = await (supabase as any)
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    const likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));

    return NextResponse.json({
      items: posts.map((p: Record<string, unknown>) => ({
        ...p,
        user_liked: likedSet.has(p.id as string),
      })),
    });
  } catch (error) {
    logger.error('Posts GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'posts:create', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to create posts' },
        { status: 403 }
      );
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = createPostSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, body, post_type, tags, twitter_url, thread_parts } = parsed.data;

    // Announcements are admin only
    if (post_type === 'announcement' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create announcements' },
        { status: 403 }
      );
    }

    const { data: post, error: insertError } = await (supabase as any)
      .from('posts')
      .insert({
        author_id: user.id,
        title,
        body,
        post_type: post_type ?? 'text',
        tags: tags ?? [],
        twitter_url: twitter_url ?? null,
      })
      .select(POST_SELECT)
      .single();

    if (insertError || !post) {
      logger.error('Post creation failed', insertError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    // Insert thread parts if it's a thread
    if (post_type === 'thread' && thread_parts && thread_parts.length > 0) {
      const parts = thread_parts.map((part, idx) => ({
        post_id: (post as Record<string, unknown>).id as string,
        part_order: idx + 1,
        body: part.body,
      }));

      await (supabase as any).from('post_thread_parts').insert(parts);
    }

    // Award XP + log activity (non-blocking)
    const service = createServiceClient();
    await Promise.allSettled([
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'post_created' as any,
        subject_type: 'post',
        subject_id: (post as Record<string, unknown>).id as string,
        metadata: { title, post_type: post_type ?? 'text' },
      }),
      awardXp(service, {
        userId: user.id,
        eventType: 'post_created',
        xpAmount: 10,
        sourceType: 'post',
        sourceId: (post as Record<string, unknown>).id as string,
        metadata: { title },
      }),
    ]);

    return NextResponse.json({ ...(post as object), user_liked: false }, { status: 201 });
  } catch (error) {
    logger.error('Posts POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
