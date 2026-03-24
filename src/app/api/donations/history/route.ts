import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { donationHistoryQuerySchema } from '@/features/donations/schemas';
import { getDonorBadgeTier } from '@/features/donations/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = donationHistoryQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, offset } = queryResult.data;

    const { data: donations, error } = await (supabase as any)
      .from('donations')
      .select('*')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Donation history query failed', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Calculate total donated USD
    const { data: totals } = await (supabase as any)
      .from('donations')
      .select('amount_usd')
      .eq('donor_id', user.id)
      .eq('status', 'verified');

    const totalDonatedUsd = (totals ?? []).reduce(
      (sum: number, d: { amount_usd: number | null }) => sum + (d.amount_usd ?? 0),
      0
    );

    return NextResponse.json({
      donations: donations ?? [],
      total_donated_usd: totalDonatedUsd,
      badge_tier: getDonorBadgeTier(totalDonatedUsd),
    });
  } catch (error) {
    logger.error('Donation history route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
