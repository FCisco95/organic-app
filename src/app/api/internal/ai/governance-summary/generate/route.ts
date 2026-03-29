import { NextResponse } from 'next/server';
import { generateGovernanceSummary } from '@/features/ai/governance-summary-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

  logger.info('Governance summary generation triggered');

  try {
    const result = await generateGovernanceSummary();

    if (!result.ok) {
      logger.error('Governance summary generation/storage failed', { error: result.error });
      // Return 200 for cron endpoints to avoid immediate retry spam
      return NextResponse.json({
        ok: false,
        error: result.error,
        generated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Governance summary generation/storage failed (unhandled)', { error: msg });
    // Return 200 for cron endpoints to avoid immediate retry spam
    return NextResponse.json({
      ok: false,
      error: 'Governance summary generation failed unexpectedly',
      generated_at: new Date().toISOString(),
    });
  }
}

export async function GET(request: Request) {
  return handleGenerate(request);
}

export async function POST(request: Request) {
  return handleGenerate(request);
}
