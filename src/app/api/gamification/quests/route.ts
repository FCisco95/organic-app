import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getQuestProgress } from '@/features/gamification/quest-engine';
import { questProgressResponseSchema } from '@/features/gamification/schemas';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const progress = await getQuestProgress(supabase, user.id);
    const payload = questProgressResponseSchema.parse(progress);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error('Gamification quests API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
