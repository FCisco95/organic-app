import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationFiltersSchema } from '@/features/notifications/schemas';

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

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (unread) {
      query = query.eq('read', false);
    }

    if (cursor) {
      const cursorNotif = await supabase
        .from('notifications')
        .select('created_at')
        .eq('id', cursor)
        .single();
      if (cursorNotif.data) {
        query = query.lt('created_at', cursorNotif.data.created_at);
      }
    }

    const { data: notifications, count, error } = await query;

    if (error) {
      console.error('Notifications query error:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count (always, for the badge)
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    // Fetch actor info for notifications
    const actorIds = [
      ...new Set(
        (notifications ?? []).map((n) => n.actor_id).filter((id): id is string => id !== null)
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

    const enriched = (notifications ?? []).map((n) => ({
      ...n,
      actor: n.actor_id ? (actorMap[n.actor_id] ?? null) : null,
    }));

    return NextResponse.json({
      notifications: enriched,
      total: count ?? 0,
      unread_count: unreadCount ?? 0,
    });
  } catch (err) {
    console.error('Notifications API error:', err);
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
      console.error('Mark all read error:', error);
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark all read API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
