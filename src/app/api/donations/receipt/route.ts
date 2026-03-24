import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const DONATION_WITH_DONOR =
  '*, donor:user_profiles!donations_donor_id_fkey(id,name,email,organic_id,avatar_url)';

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
    const donationId = searchParams.get('id');

    if (!donationId) {
      return NextResponse.json({ error: 'Missing donation id' }, { status: 400 });
    }

    const { data: donation, error } = await (supabase as any)
      .from('donations')
      .select(DONATION_WITH_DONOR)
      .eq('id', donationId)
      .eq('donor_id', user.id)
      .single();

    if (error || !donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const txSig = (donation as Record<string, unknown>).tx_signature as string;
    const explorerUrl = `https://explorer.solana.com/tx/${txSig}`;

    return NextResponse.json({
      donation,
      explorer_url: explorerUrl,
    });
  } catch (error) {
    logger.error('Donation receipt route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
