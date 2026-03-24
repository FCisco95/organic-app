import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { submitDonationSchema } from '@/features/donations/schemas';
import { verifyDonationTransaction } from '@/features/donations/verification';
import { awardXp } from '@/features/gamification/xp-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'donations:submit', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    // Validate user has a profile with wallet
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organic_id, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to submit donations' },
        { status: 403 }
      );
    }

    if (!profile.wallet_pubkey) {
      return NextResponse.json(
        { error: 'You must link a wallet before donating' },
        { status: 403 }
      );
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = submitDonationSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tx_signature, token, amount, from_wallet, to_wallet } = parsed.data;

    // Verify from_wallet matches user's linked wallet
    if (from_wallet !== profile.wallet_pubkey) {
      return NextResponse.json(
        { error: 'Sender wallet does not match your linked wallet' },
        { status: 403 }
      );
    }

    // Check for duplicate tx_signature
    const { data: existing } = await (supabase as any)
      .from('donations')
      .select('id')
      .eq('tx_signature', tx_signature)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This transaction has already been submitted' },
        { status: 409 }
      );
    }

    // Insert donation as pending
    const { data: donation, error: insertError } = await (supabase as any)
      .from('donations')
      .insert({
        tx_signature,
        donor_id: user.id,
        token,
        amount,
        from_wallet,
        to_wallet,
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertError || !donation) {
      logger.error('Donation insert failed', insertError);
      return NextResponse.json({ error: 'Failed to submit donation' }, { status: 500 });
    }

    // Verify on-chain (async, non-blocking to the user)
    const service = createServiceClient();
    verifyAndFinalize(service, donation, token, amount, from_wallet, to_wallet, user.id).catch(
      (err) => logger.error('Donation verification failed', err)
    );

    return NextResponse.json(donation, { status: 201 });
  } catch (error) {
    logger.error('Donations submit route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function verifyAndFinalize(
  service: ReturnType<typeof createServiceClient>,
  donation: Record<string, unknown>,
  token: string,
  amount: number,
  fromWallet: string,
  toWallet: string,
  userId: string
) {
  const donationId = donation.id as string;

  const result = await verifyDonationTransaction(
    donation.tx_signature as string,
    fromWallet,
    toWallet,
    token as 'SOL' | 'ORG',
    amount
  );

  if (result.verified) {
    // TODO: In production, fetch real USD price from oracle/API
    const usdRate = token === 'SOL' ? 150 : 0.01; // placeholder rates
    const amountUsd = amount * usdRate;

    await (service as any)
      .from('donations')
      .update({
        status: 'verified',
        amount_usd: amountUsd,
        verified_at: new Date().toISOString(),
      })
      .eq('id', donationId);

    // Log activity + award XP
    await Promise.allSettled([
      service.from('activity_log').insert({
        actor_id: userId,
        event_type: 'donation_verified' as any,
        subject_type: 'donation',
        subject_id: donationId,
        metadata: { token, amount, amount_usd: amountUsd },
      }),
      awardXp(service, {
        userId,
        eventType: 'donation_verified',
        xpAmount: 25,
        sourceType: 'donation',
        sourceId: donationId,
        metadata: { token, amount, amount_usd: amountUsd },
      }),
    ]);
  } else {
    await (service as any)
      .from('donations')
      .update({
        status: 'failed',
        failed_reason: result.error ?? 'Verification failed',
      })
      .eq('id', donationId);
  }
}
