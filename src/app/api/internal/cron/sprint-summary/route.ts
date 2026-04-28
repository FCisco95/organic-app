import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateSprintSummary } from '@/features/dashboard/sprint-summary-service';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type SprintStatus = Database['public']['Enums']['sprint_status'];
const ACTIVE_PHASES: SprintStatus[] = ['active', 'review', 'dispute_window', 'settlement'];

function isAuthorized(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, reason: 'missing_secret' };
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return { ok: false, reason: 'invalid_token' };
  }
  return { ok: true };
}

async function handleGenerate(request: Request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    const status = auth.reason === 'missing_secret' ? 503 : 401;
    return NextResponse.json(
      { error: auth.reason === 'missing_secret' ? 'CRON_SECRET is not configured' : 'Unauthorized' },
      { status }
    );
  }

  const supabase = createServiceClient();
  const { data: sprints, error } = await supabase
    .from('sprints')
    .select('id, status')
    .in('status', ACTIVE_PHASES);

  if (error) {
    logger.error('Sprint summary cron: failed to list active sprints', { error });
    return NextResponse.json({ ok: false, error: 'db_list_failed' });
  }

  const results: { sprint_id: string; ok: boolean; error?: string }[] = [];
  for (const sprint of sprints ?? []) {
    const result = await generateSprintSummary(sprint.id);
    results.push({ sprint_id: sprint.id, ok: result.ok, error: result.error });
    if (!result.ok) {
      logger.warn('Sprint summary generation failed', { sprintId: sprint.id, error: result.error });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    generated_at: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  return handleGenerate(request);
}

export async function POST(request: Request) {
  return handleGenerate(request);
}
