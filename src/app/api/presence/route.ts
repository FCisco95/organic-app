import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { PresencePayload } from '@/features/dashboard/types';

export const dynamic = 'force-dynamic';

const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';

export async function GET() {
  try {
    const supabase = createAnonClient();
    const since = new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString();

    const { data, error } = await supabase
      .from('activity_log')
      .select('actor_id, created_at')
      .gte('created_at', since)
      .not('actor_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('presence: failed to load activity_log', { error });
      return NextResponse.json(
        { data: null, error: 'Internal server error' },
        { status: 500 }
      );
    }

    const distinctActors = new Set(
      (data ?? []).map((row) => row.actor_id).filter((id): id is string => !!id)
    );

    const payload: PresencePayload = {
      activeCount: distinctActors.size,
      lastActivityAt: data?.[0]?.created_at ?? null,
    };

    return NextResponse.json(
      { data: payload, error: null },
      { headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL } }
    );
  } catch (error) {
    logger.error('presence route failed', { error: String(error) });
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
