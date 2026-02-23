import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { validateReferralCode } from '@/features/gamification/referral-engine';
import { z } from 'zod';

const bodySchema = z.object({
  code: z.string().min(1).max(20),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await validateReferralCode(supabase, parsed.data.code);

    if (!result) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true, referrer_id: result.referrer_id });
  } catch (error) {
    logger.error('Referral validation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
