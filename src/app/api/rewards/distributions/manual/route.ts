import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { manualDistributionSchema } from '@/features/rewards/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin only
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = manualDistributionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { distributions } = parsed.data;

    // Insert all distributions
    const rows = distributions.map((d) => ({
      user_id: d.user_id,
      type: 'manual' as const,
      token_amount: d.token_amount,
      category: d.category,
      reason: d.reason,
      created_by: user.id,
    }));

    const { data: created, error: insertError } = await supabase
      .from('reward_distributions')
      .insert(rows)
      .select();

    if (insertError) {
      logger.error('Manual distribution error:', insertError);
      return NextResponse.json({ error: 'Failed to create distributions' }, { status: 500 });
    }

    return NextResponse.json(
      { distributions: created, count: created?.length ?? 0 },
      { status: 201 }
    );
  } catch (err) {
    logger.error('Manual distribution error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
