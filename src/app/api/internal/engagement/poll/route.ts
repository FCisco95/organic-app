import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { processEngagementTick } from '@/features/engagement/processor';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) return { ok: false, reason: 'invalid_token' };
  return { ok: true };
}

async function handle(request: Request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    const status = auth.reason === 'missing_secret' ? 503 : 401;
    return NextResponse.json(
      { error: auth.reason === 'missing_secret' ? 'CRON_SECRET is not configured' : 'Unauthorized' },
      { status }
    );
  }

  try {
    const supabase = createServiceClient();
    const result = await processEngagementTick(supabase);
    if (!result.ok) {
      logger.warn('[engagement.cron.poll] tick did not complete cleanly', result);
    }
    // 200 even on soft failure to avoid retry spam — details are in response body.
    return NextResponse.json({ ...result, ran_at: new Date().toISOString() });
  } catch (error) {
    logger.error('[engagement.cron.poll] unhandled failure', error);
    return NextResponse.json(
      { ok: false, error: 'unhandled_exception', ran_at: new Date().toISOString() },
      { status: 200 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
