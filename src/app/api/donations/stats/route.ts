import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const DONATION_WITH_DONOR =
  '*, donor:user_profiles!donations_donor_id_fkey(id,name,email,organic_id,avatar_url)';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all verified donations
    const { data: donations, error } = await (supabase as any)
      .from('donations')
      .select(DONATION_WITH_DONOR)
      .eq('status', 'verified')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Donation stats query failed', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const all = donations ?? [];
    const uniqueDonors = new Set(all.map((d: Record<string, unknown>) => d.donor_id));

    let totalUsd = 0;
    let totalSol = 0;
    let totalOrg = 0;

    for (const d of all) {
      totalUsd += (d as Record<string, unknown>).amount_usd as number ?? 0;
      if ((d as Record<string, unknown>).token === 'SOL') {
        totalSol += Number((d as Record<string, unknown>).amount ?? 0);
      } else {
        totalOrg += Number((d as Record<string, unknown>).amount ?? 0);
      }
    }

    return NextResponse.json({
      total_donations: all.length,
      total_donors: uniqueDonors.size,
      total_usd: totalUsd,
      total_sol: totalSol,
      total_org: totalOrg,
      recent_donations: all.slice(0, 10),
    });
  } catch (error) {
    logger.error('Donation stats route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
