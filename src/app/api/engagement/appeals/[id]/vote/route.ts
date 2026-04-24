import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { castAppealVote } from '@/features/engagement/dao-vote';
import { castAppealVoteSchema } from '@/features/engagement/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: appealId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await parseJsonBody(request);
    if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });

    const parsed = castAppealVoteSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const svc = createServiceClient();
    const result = await castAppealVote(svc, {
      appealId,
      voterId: user.id,
      vote: parsed.data.vote,
    });

    if (!result.ok) {
      const status =
        result.error === 'appeal_not_found'
          ? 404
          : result.error === 'cannot_vote_own_appeal' || result.error === 'organic_id_required'
            ? 403
            : result.error === 'already_voted'
              ? 409
              : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('[engagement.api.vote] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
