import { NextRequest, NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { requireAdminOrCouncil } from '@/lib/auth/require-role';
import { adminReviewCalibrationSchema } from '@/features/engagement/types';
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

    const parsed = adminReviewCalibrationSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await asEngDb(supabase)
      .from('engagement_calibration_samples')
      .update(
        {
          human_score: parsed.data.human_score,
          human_reviewer_id: gate.profile.id,
          reviewed_at: new Date().toISOString(),
          notes: parsed.data.notes ?? null,
        } as never
      )
      .eq('id', id)
      .select('id, ai_score, human_score, reviewed_at')
      .single();

    if (error) {
      logger.error('[engagement.admin.calibration.PATCH] failed', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ sample: data });
  } catch (err) {
    logger.error('[engagement.admin.calibration.PATCH] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
