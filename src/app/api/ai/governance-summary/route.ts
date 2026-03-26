import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAnonClient();

    const { data, error } = await (supabase as any)
      .from('governance_summaries')
      .select('id, content, summary_text, period_start, period_end, model_used, token_count, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch governance summary', error);
      return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
    }

    return NextResponse.json(
      { data: data ?? null },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    logger.error('Governance summary GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
