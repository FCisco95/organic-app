import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { reviewBacklogSchema } from '@/features/backlog/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getStewardClient } from '@/lib/steward';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'steward:review', RATE_LIMITS.sensitive);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !isAdminOrCouncil(profile.role)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ data: null, error: parsedBody.error }, { status: 400 });
    }
    const parsed = reviewBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }

    const client = await getStewardClient();
    const reviews = await client.reviewBacklogCandidates(parsed.data.task_ids);
    return NextResponse.json({ data: { reviews }, error: null });
  } catch (error) {
    logger.error('review-backlog route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
