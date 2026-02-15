import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { RewardsConfig } from '@/features/rewards';
import { DEFAULT_REWARDS_CONFIG } from '@/features/rewards';

function parseRewardsConfig(value: unknown): RewardsConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_REWARDS_CONFIG;
  }

  const config = value as Partial<RewardsConfig>;
  return {
    enabled:
      typeof config.enabled === 'boolean'
        ? config.enabled
        : DEFAULT_REWARDS_CONFIG.enabled,
    points_to_token_rate:
      typeof config.points_to_token_rate === 'number' && config.points_to_token_rate > 0
        ? config.points_to_token_rate
        : DEFAULT_REWARDS_CONFIG.points_to_token_rate,
    min_claim_threshold:
      typeof config.min_claim_threshold === 'number' && config.min_claim_threshold >= 0
        ? config.min_claim_threshold
        : DEFAULT_REWARDS_CONFIG.min_claim_threshold,
    default_epoch_pool:
      typeof config.default_epoch_pool === 'number' && config.default_epoch_pool >= 0
        ? config.default_epoch_pool
        : DEFAULT_REWARDS_CONFIG.default_epoch_pool,
    claim_requires_wallet:
      typeof config.claim_requires_wallet === 'boolean'
        ? config.claim_requires_wallet
        : DEFAULT_REWARDS_CONFIG.claim_requires_wallet,
  };
}

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

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('claimable_points, total_points, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch org rewards config
    const { data: org } = await supabase
      .from('orgs')
      .select('rewards_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const config = parseRewardsConfig(org?.rewards_config);

    // Count pending claims
    const { count: pendingClaims } = await supabase
      .from('reward_claims')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // Sum total claimed (approved + paid)
    const { data: claimedData } = await supabase
      .from('reward_claims')
      .select('points_amount')
      .eq('user_id', user.id)
      .in('status', ['approved', 'paid']);

    const totalClaimed = (claimedData ?? []).reduce((sum, c) => sum + c.points_amount, 0);

    // Sum total distributed tokens
    const { data: distData } = await supabase
      .from('reward_distributions')
      .select('token_amount')
      .eq('user_id', user.id);

    const totalDistributed = (distData ?? []).reduce(
      (sum, d) => sum + Number(d.token_amount),
      0
    );

    return NextResponse.json({
      claimable_points: profile.claimable_points,
      total_points: profile.total_points,
      pending_claims: pendingClaims ?? 0,
      total_claimed: totalClaimed,
      total_distributed: totalDistributed,
      conversion_rate: config.points_to_token_rate,
      min_threshold: config.min_claim_threshold,
      wallet_address: profile.wallet_pubkey,
      rewards_enabled: config.enabled,
      claim_requires_wallet: config.claim_requires_wallet,
    });
  } catch (err) {
    console.error('Rewards GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
