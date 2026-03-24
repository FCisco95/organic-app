import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { donationLeaderboardQuerySchema } from '@/features/donations/schemas';
import { getDonorBadgeTier } from '@/features/donations/types';

const DONOR_SELECT =
  'donor_id, amount_usd, donor:user_profiles!donations_donor_id_fkey(id,name,email,organic_id,avatar_url)';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const queryResult = donationLeaderboardQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { limit } = queryResult.data;

    // Get all verified donations with donor info
    const { data: donations, error } = await (supabase as any)
      .from('donations')
      .select(DONOR_SELECT)
      .eq('status', 'verified');

    if (error) {
      logger.error('Donation leaderboard query failed', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Aggregate by donor
    const donorMap = new Map<
      string,
      { donor_id: string; donor: Record<string, unknown>; total_donated_usd: number; donation_count: number }
    >();

    for (const d of donations ?? []) {
      const existing = donorMap.get(d.donor_id);
      if (existing) {
        existing.total_donated_usd += d.amount_usd ?? 0;
        existing.donation_count += 1;
      } else {
        donorMap.set(d.donor_id, {
          donor_id: d.donor_id,
          donor: d.donor,
          total_donated_usd: d.amount_usd ?? 0,
          donation_count: 1,
        });
      }
    }

    const entries = Array.from(donorMap.values())
      .sort((a, b) => b.total_donated_usd - a.total_donated_usd)
      .slice(0, limit)
      .map((entry) => ({
        ...entry,
        badge_tier: getDonorBadgeTier(entry.total_donated_usd),
      }));

    return NextResponse.json({ entries });
  } catch (error) {
    logger.error('Donation leaderboard route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
