import { NextRequest, NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { requireAdminOrCouncil } from '@/lib/auth/require-role';
import { updateHandleSchema } from '@/features/engagement/types';
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

    const parsed = updateHandleSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await asEngDb(supabase)
      .from('engagement_handles')
      .update(parsed.data as never)
      .eq('id', id)
      .select('id, handle, display_name, is_active')
      .single();

    if (error) {
      logger.error('[engagement.admin.handles.PATCH] failed', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ handle: data });
  } catch (err) {
    logger.error('[engagement.admin.handles.PATCH] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const gate = await requireAdminOrCouncil(supabase);
    if (gate.error) return gate.error;

    // Soft-delete by deactivating — preserves historical posts attached to this handle.
    const { error } = await asEngDb(supabase)
      .from('engagement_handles')
      .update({ is_active: false } as never)
      .eq('id', id);

    if (error) {
      logger.error('[engagement.admin.handles.DELETE] failed', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('[engagement.admin.handles.DELETE] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
