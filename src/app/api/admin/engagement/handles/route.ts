import { NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { requireAdminOrCouncil } from '@/lib/auth/require-role';
import { createHandleSchema } from '@/features/engagement/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminOrCouncil(supabase);
    if (gate.error) return gate.error;

    const { data, error } = await asEngDb(supabase)
      .from('engagement_handles')
      .select('id, handle, display_name, is_active, added_by, last_polled_at, last_seen_tweet_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[engagement.admin.handles] list failed', error);
      return NextResponse.json({ error: 'Failed to list handles' }, { status: 500 });
    }
    return NextResponse.json({ handles: data ?? [] });
  } catch (err) {
    logger.error('[engagement.admin.handles.GET] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const gate = await requireAdminOrCouncil(supabase);
    if (gate.error) return gate.error;

    const body = await parseJsonBody(request);
    if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });

    const parsed = createHandleSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const handle = parsed.data.handle.replace(/^@/, '');

    // Need the caller's org_id. Load first-org convention to match existing
    // single-org deployments (gamification_config query pattern).
    const { data: org } = await supabase.from('orgs').select('id').limit(1).single();
    if (!org) return NextResponse.json({ error: 'Org not configured' }, { status: 500 });

    const { data, error } = await asEngDb(supabase)
      .from('engagement_handles')
      .insert(
        {
          org_id: org.id as string,
          handle,
          display_name: parsed.data.display_name ?? null,
          is_active: parsed.data.is_active ?? true,
          added_by: gate.profile.id,
        } as never
      )
      .select('id, handle, display_name, is_active')
      .single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Handle already exists' }, { status: 409 });
      }
      logger.error('[engagement.admin.handles] create failed', error);
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({ handle: data }, { status: 201 });
  } catch (err) {
    logger.error('[engagement.admin.handles.POST] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
