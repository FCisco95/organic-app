import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { syncWalletBalance } from '@/features/trading/verification';
import { getHoldingTier } from '@/features/trading/types';
import { awardXp } from '@/features/gamification/xp-service';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'trading:sync', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, wallet_pubkey')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.wallet_pubkey) {
      return NextResponse.json(
        { error: 'No wallet linked. Link a Solana wallet first.' },
        { status: 403 }
      );
    }

    const service = createServiceClient();
    const result = await syncWalletBalance(service, user.id, profile.wallet_pubkey);

    // Log activity
    await service.from('activity_log').insert({
      actor_id: user.id,
      event_type: 'holding_sync' as any,
      subject_type: 'wallet',
      subject_id: user.id,
      metadata: {
        balance: result.balance,
        holding_days: result.holdingDays,
        multiplier: result.multiplier,
        reset: result.reset,
      },
    });

    // Award holding reward XP at tier milestones (30, 60, 90 days)
    const tier = getHoldingTier(result.holdingDays);
    if (tier && !result.reset) {
      await awardXp(service, {
        userId: user.id,
        eventType: 'holding_reward',
        xpAmount: Math.round(10 * tier.multiplier),
        sourceType: 'holding',
        sourceId: `${user.id}_day_${result.holdingDays}`,
        metadata: { tier: tier.name, days: result.holdingDays },
      }).catch((err) => logger.error('Holding XP award failed', err));
    }

    return NextResponse.json({
      synced: true,
      balance: result.balance,
      holding_days: result.holdingDays,
      multiplier: result.multiplier,
      tier: getHoldingTier(result.holdingDays),
    });
  } catch (error) {
    logger.error('Trading sync route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
