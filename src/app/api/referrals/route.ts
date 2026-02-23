import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getReferralStats } from '@/features/gamification/referral-engine';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const stats = await getReferralStats(supabase, user.id, origin);
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Referrals API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
