import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sweepExpiredAppeals } from '@/features/engagement/dao-vote';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, reason: 'missing_secret' };
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return { ok: false, reason: 'invalid_token' };
  }
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
    const { resolved } = await sweepExpiredAppeals(supabase);
    return NextResponse.json({ ok: true, resolved, ran_at: new Date().toISOString() });
  } catch (error) {
    logger.error('[engagement.cron.appeals-sweep] failed', error);
    return NextResponse.json({ ok: false, error: 'unhandled_exception' });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
