import { NextRequest, NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { requireAdminOrCouncil } from '@/lib/auth/require-role';
import { adminUpdatePostSchema } from '@/features/engagement/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const gate = await requireAdminOrCouncil(supabase);
    if (gate.error) return gate.error;

    const body = await parseJsonBody(request);
    if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });

    const parsed = adminUpdatePostSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.is_excluded !== undefined) update.is_excluded = parsed.data.is_excluded;
    if (parsed.data.pool_size !== undefined) update.pool_size = parsed.data.pool_size;
    if (parsed.data.engagement_window_ends_at !== undefined) {
      update.engagement_window_ends_at = parsed.data.engagement_window_ends_at;
    }

    const { data, error } = await asEngDb(supabase)
      .from('engagement_posts')
      .update(update as never)
      .eq('id', id)
      .select('id, tweet_id, is_excluded, pool_size, engagement_window_ends_at')
      .single();

    if (error) {
      logger.error('[engagement.admin.posts.PATCH] failed', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (err) {
    logger.error('[engagement.admin.posts.PATCH] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
