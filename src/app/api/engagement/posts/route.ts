import { NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engagement/posts
 *
 * Returns the currently-earnable engagement posts (window open, not excluded)
 * plus a flag indicating whether the caller has an existing submission on
 * each post.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    const { data: posts, error } = await asEngDb(supabase)
      .from('engagement_posts')
      .select('id, tweet_id, posted_at, pool_size, engagement_window_ends_at, handle_id, engagement_handles(handle, display_name)')
      .eq('is_excluded', false)
      .gt('engagement_window_ends_at', nowIso)
      .order('posted_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[engagement.api.posts] list failed', error);
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
    }

    const postIds = (posts ?? []).map((p) => p.id as string);
    const { data: mySubs } = await asEngDb(supabase)
      .from('engagement_submissions')
      .select('post_id, engagement_type, comment_score, xp_awarded')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    const subsByPost: Record<string, Array<{ type: string; score: number | null; xp: number }>> = {};
    for (const s of mySubs ?? []) {
      const pid = s.post_id as string;
      subsByPost[pid] ??= [];
      subsByPost[pid].push({
        type: s.engagement_type as string,
        score: (s.comment_score as number | null) ?? null,
        xp: (s.xp_awarded as number) ?? 0,
      });
    }

    return NextResponse.json({
      posts: (posts ?? []).map((p) => ({
        id: p.id,
        tweet_id: p.tweet_id,
        posted_at: p.posted_at,
        pool_size: p.pool_size,
        engagement_window_ends_at: p.engagement_window_ends_at,
        handle: (p as { engagement_handles?: { handle?: string } }).engagement_handles?.handle ?? null,
        display_name: (p as { engagement_handles?: { display_name?: string | null } }).engagement_handles?.display_name ?? null,
        my_submissions: subsByPost[p.id as string] ?? [],
      })),
    });
  } catch (err) {
    logger.error('[engagement.api.posts] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
