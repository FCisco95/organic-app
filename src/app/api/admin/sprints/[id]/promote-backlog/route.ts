import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { promoteBacklogSchema } from '@/features/backlog/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sprintId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'backlog:promote', RATE_LIMITS.sensitive);
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
    const parsed = promoteBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }

    const { data: sprint } = await supabase
      .from('sprints')
      .select('id, status')
      .eq('id', sprintId)
      .single();
    if (!sprint) {
      return NextResponse.json({ data: null, error: 'Sprint not found' }, { status: 404 });
    }
    if (sprint.status !== 'planning') {
      return NextResponse.json(
        { data: null, error: 'Sprint is not in planning status' },
        { status: 409 },
      );
    }

    const service = createServiceClient();
    const { data: promoted, error: rpcError } = await service.rpc(
      'promote_top_backlog_to_sprint',
      { p_sprint_id: sprintId, p_n: parsed.data.n },
    );
    if (rpcError) {
      logger.error('promote_top_backlog_to_sprint failed', rpcError);
      return NextResponse.json({ data: null, error: 'Failed to promote tasks' }, { status: 500 });
    }

    const ids = ((promoted ?? []) as Array<{ promoted_task_id: string }>).map(
      (r) => r.promoted_task_id,
    );
    return NextResponse.json({
      data: { promoted_task_ids: ids, n_actually_promoted: ids.length },
      error: null,
    });
  } catch (error) {
    logger.error('promote-backlog route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
