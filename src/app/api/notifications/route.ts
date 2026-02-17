import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationFiltersSchema } from '@/features/notifications/schemas';
import { logger } from '@/lib/logger';

const NOTIFICATION_SELECT_COLUMNS =
  'id, user_id, event_type, category, actor_id, subject_type, subject_id, metadata, read, read_at, created_at, batch_id';

// GET /api/notifications — list notifications for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = notificationFiltersSchema.safeParse({
      category: searchParams.get('category') ?? undefined,
      unread: searchParams.get('unread') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? '20',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { category, unread, cursor, limit } = parsed.data;

    // Resolve cursor timestamp once (shared by both paths)
    let cursorTimestamp: string | null = null;
    if (cursor) {
      const cursorNotif = await supabase
        .from('notifications')
        .select('created_at')
        .eq('id', cursor)
        .single();
      cursorTimestamp = cursorNotif.data?.created_at ?? null;
    }

    // Try query with batch join first; fall back to simple query if
    // batching migration hasn't been applied yet.
    let rows: Record<string, unknown>[] = [];
    let total = 0;
    let useBatchJoin = false;

    // Attempt: batched query
    {
      let q = supabase
        .from('notifications')
        .select(`${NOTIFICATION_SELECT_COLUMNS}, notification_batches(count, first_event_at, last_event_at)`, {
          count: 'exact',
        })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) q = q.eq('category', category);
      if (unread) q = q.eq('read', false);
      if (cursorTimestamp) q = q.lt('created_at', cursorTimestamp);

      const result = await q;
      if (!result.error && result.data) {
        rows = result.data as unknown as Record<string, unknown>[];
        total = result.count ?? 0;
        useBatchJoin = true;
      }
    }

    // Fallback: simple query without batch join
    if (!useBatchJoin) {
      let q = supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT_COLUMNS, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) q = q.eq('category', category);
      if (unread) q = q.eq('read', false);
      if (cursorTimestamp) q = q.lt('created_at', cursorTimestamp);

      const result = await q;
      if (result.error) {
        logger.error('Notifications query error:', result.error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }
      rows = (result.data ?? []) as unknown as Record<string, unknown>[];
      total = result.count ?? 0;
    }

    // Reuse the already computed total when this request is specifically
    // the unread badge query (/api/notifications?unread=true&limit=1).
    let unreadCount: number | null = null;
    const canReuseTotalForUnreadCount = unread === true && !category && !cursorTimestamp;
    if (canReuseTotalForUnreadCount) {
      unreadCount = total;
    } else {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      unreadCount = count ?? 0;
    }

    // Fetch actor info for notifications
    const actorIds = [
      ...new Set(
        rows
          .map((n) => n.actor_id as string | null)
          .filter((id): id is string => id !== null)
      ),
    ];

    let actorMap: Record<
      string,
      { id: string; name: string | null; avatar_url: string | null; organic_id: number | null }
    > = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('user_profiles')
        .select('id, name, avatar_url, organic_id')
        .in('id', actorIds);

      if (actors) {
        actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));
      }
    }

    const enriched = rows.map((n) => {
      const batchData = useBatchJoin
        ? (n.notification_batches as {
            count: number;
            first_event_at: string;
            last_event_at: string;
          } | null)
        : null;

      const { notification_batches: _batch, ...rest } = n;
      const actorId = n.actor_id as string | null;

      return {
        ...rest,
        actor: actorId ? (actorMap[actorId] ?? null) : null,
        batch_count: batchData?.count ?? null,
        batch_first_at: batchData?.first_event_at ?? null,
        batch_last_at: batchData?.last_event_at ?? null,
      };
    });

    return NextResponse.json({
      notifications: enriched,
      total,
      unread_count: unreadCount ?? 0,
    });
  } catch (err) {
    logger.error('Notifications API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Mark all read error:', error);
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Mark all read API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
