import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createPostSchema, listPostsQuerySchema } from '@/features/posts/schemas';
import { awardXp } from '@/features/gamification/xp-service';
import { fetchOgMetadata } from '@/lib/og-preview';
import {
  calculatePostCost,
  deductPoints,
  awardPoints,
  getWeeklyOrganicPostCount,
  type PostType,
} from '@/features/gamification/points-service';
import { checkUserRestriction } from '@/lib/moderation';

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
      organic: searchParams.get('organic') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sort, search, type, organic, limit } = queryResult.data;

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

    if (organic === 'true') {
      query = query.eq('is_organic', true);
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
      logger.error('Posts feed query failed', { message: error.message, code: error.code, details: error.details });
      return NextResponse.json({ items: [], error: 'Failed to fetch posts' }, { status: 200 });
    }

    // Check user likes
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Surface actively promoted posts at top (max 3), then rest
    const now = new Date().toISOString();
    const sorted = (posts ?? []) as Record<string, unknown>[];
    const promoted = sorted.filter(
      (p) => p.is_promoted && p.promotion_expires_at && (p.promotion_expires_at as string) > now
    ).slice(0, 3);
    const promotedIds = new Set(promoted.map((p) => p.id));
    const rest = sorted.filter((p) => !promotedIds.has(p.id));
    const orderedPosts = [...promoted, ...rest];

    if (!user || orderedPosts.length === 0) {
      return NextResponse.json({
        items: orderedPosts.map((p) => ({ ...p, user_liked: false })),
      });
    }

    const postIds = orderedPosts.map((p) => p.id as string);
    const { data: likes } = await (supabase as any)
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    const likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));

    return NextResponse.json({
      items: orderedPosts.map((p) => ({
        ...p,
        user_liked: likedSet.has(p.id as string),
      })),
    });
  } catch (error) {
    logger.error('Posts GET route error', error);
    return NextResponse.json({ items: [], error: 'Internal server error' }, { status: 200 });
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

    const restricted = await checkUserRestriction(supabase, user.id);
    if (restricted) return restricted;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id, role')
      .eq('id', user.id)
      .maybeSingle();

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

    const { title, body, post_type, tags, twitter_url, is_organic, thread_parts } = parsed.data;

    // Announcements are admin only
    if (post_type === 'announcement' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create announcements' },
        { status: 403 }
      );
    }

    const service = createServiceClient();
    const effectiveType = (post_type ?? 'text') as PostType;
    const isOrganic = is_organic && post_type !== 'announcement';

    // Calculate point cost
    const weeklyOrganicCount = isOrganic
      ? await getWeeklyOrganicPostCount(service, user.id)
      : 0;
    const pointCost = calculatePostCost(effectiveType, isOrganic, weeklyOrganicCount);

    // Deduct points if cost > 0
    if (pointCost > 0) {
      const deduction = await deductPoints(
        service,
        user.id,
        pointCost,
        `Post creation (${effectiveType}${isOrganic ? ', organic' : ''})`,
        'post',
      );

      if (!deduction.success) {
        return NextResponse.json(
          {
            error: 'Insufficient points',
            required: pointCost,
            balance: deduction.newBalance,
          },
          { status: 400 }
        );
      }
    }

    // Fetch OG metadata from the link URL (non-blocking failure)
    let ogData = {
      og_title: null as string | null,
      og_description: null as string | null,
      og_image_url: null as string | null,
    };
    if (twitter_url) {
      ogData = await fetchOgMetadata(twitter_url);
    }

    const { data: post, error: insertError } = await (supabase as any)
      .from('posts')
      .insert({
        author_id: user.id,
        title,
        body,
        post_type: effectiveType,
        tags: tags ?? [],
        twitter_url: twitter_url ?? null,
        og_title: ogData.og_title,
        og_description: ogData.og_description,
        og_image_url: ogData.og_image_url,
        is_organic: isOrganic,
        points_cost: pointCost,
      })
      .select(POST_SELECT)
      .single();

    if (insertError || !post) {
      logger.error('Post creation failed', {
        message: insertError?.message,
        code: insertError?.code,
        details: insertError?.details,
      });
      // Refund points on insert failure
      if (pointCost > 0) {
        await awardPoints(service, user.id, pointCost, 'Refund: post creation failed', 'refund');
      }
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    const postId = (post as Record<string, unknown>).id as string;

    // Insert thread parts if it's a thread
    if (post_type === 'thread' && thread_parts && thread_parts.length > 0) {
      const parts = thread_parts.map((part, idx) => ({
        post_id: postId,
        part_order: idx + 1,
        body: part.body,
      }));

      await (supabase as any).from('post_thread_parts').insert(parts);
    }

    // XP amount: 15 for organic, 10 for non-organic
    const xpAmount = isOrganic ? 15 : 10;

    // Award XP + log activity + organic creation bonus (non-blocking)
    const rewards: PromiseLike<unknown>[] = [
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'post_created' as any,
        subject_type: 'post',
        subject_id: postId,
        metadata: { title, post_type: effectiveType, is_organic: isOrganic, points_cost: pointCost },
      }) as any,
      awardXp(service, {
        userId: user.id,
        eventType: 'post_created',
        xpAmount,
        sourceType: 'post',
        sourceId: postId,
        metadata: { title, is_organic: isOrganic },
      }),
    ];

    // Engagement no longer awards points. Points are only earned from
    // sprint task completion (settled at sprint close, weighted by score).
    // XP continues to reward engagement.

    await Promise.allSettled(rewards);

    return NextResponse.json({ ...(post as object), user_liked: false }, { status: 201 });
  } catch (error) {
    logger.error('Posts POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
