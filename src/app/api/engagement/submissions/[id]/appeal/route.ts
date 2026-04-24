import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { fileAppeal } from '@/features/engagement/dao-vote';
import { fileAppealSchema } from '@/features/engagement/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: submissionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await parseJsonBody(request);
    if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });

    const parsed = fileAppealSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Use service client for the actual insert so it isn't blocked by RLS on
    // engagement_appeals (we enforce ownership inside fileAppeal).
    const svc = createServiceClient();
    const result = await fileAppeal(svc, {
      submissionId,
      appellantId: user.id,
      reason: parsed.data.reason,
      proposedScore: parsed.data.proposed_score ?? null,
    });

    if (!result.ok) {
      const status =
        result.error === 'forbidden_not_author'
          ? 403
          : result.error === 'submission_not_found'
            ? 404
            : result.error === 'appeal_already_exists'
              ? 409
              : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, appeal_id: result.appealId }, { status: 201 });
  } catch (err) {
    logger.error('[engagement.api.appeal] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
