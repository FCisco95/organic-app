import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getBurnCost } from '@/features/gamification/burn-engine';

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

    const cost = await getBurnCost(supabase, user.id);
    return NextResponse.json(cost);
  } catch (error) {
    logger.error('Burn cost API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
