import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitClaimSchema, claimFilterSchema } from '@/features/rewards/schemas';
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse filters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = claimFilterSchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
    }

    const { status, page, limit } = parsed.data;

    // Check if admin/council
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

    let query = supabase
      .from('reward_claims')
      .select('*', { count: 'exact' });

    // Users see only own claims, admin/council see all
    if (!isAdminOrCouncil) {
      query = query.eq('user_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: claims, count, error } = await query;

    if (error) {
      console.error('Claims query error:', error);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    const userIds = Array.from(new Set((claims ?? []).map((c) => c.user_id)));
    let profileMap = new Map<string, { name: string | null; email: string }>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .in('id', userIds);

      profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          { name: profile.name, email: profile.email },
        ])
      );
    }

    const mapped = (claims ?? []).map((c) => {
      const userInfo = profileMap.get(c.user_id);
      return {
        ...c,
        user_name: userInfo?.name ?? null,
        user_email: userInfo?.email ?? null,
      };
    });

    return NextResponse.json({ claims: mapped, total: count ?? 0 });
  } catch (err) {
    console.error('Claims GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const parsed = submitClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { points_amount } = parsed.data;

    // Fetch org config
    const { data: org } = await supabase
      .from('orgs')
      .select('rewards_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const config = parseRewardsConfig(org?.rewards_config);

    if (!config.enabled) {
      return NextResponse.json({ error: 'Rewards system is not enabled' }, { status: 400 });
    }

    if (points_amount < config.min_claim_threshold) {
      return NextResponse.json(
        { error: `Minimum claim threshold is ${config.min_claim_threshold} points` },
        { status: 400 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('claimable_points, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (points_amount > profile.claimable_points) {
      return NextResponse.json(
        { error: 'Insufficient claimable points' },
        { status: 400 }
      );
    }

    if (config.claim_requires_wallet && !profile.wallet_pubkey) {
      return NextResponse.json(
        { error: 'Wallet address required for claiming rewards' },
        { status: 400 }
      );
    }

    // Calculate token amount
    const token_amount = points_amount / config.points_to_token_rate;

    // Lock-on-submit: deduct claimable_points immediately
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        claimable_points: profile.claimable_points - points_amount,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Points deduction error:', updateError);
      return NextResponse.json({ error: 'Failed to deduct points' }, { status: 500 });
    }

    // Create claim
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .insert({
        user_id: user.id,
        points_amount,
        token_amount,
        conversion_rate: config.points_to_token_rate,
        wallet_address: profile.wallet_pubkey,
      })
      .select()
      .single();

    if (claimError) {
      // Refund points on failure
      await supabase
        .from('user_profiles')
        .update({ claimable_points: profile.claimable_points })
        .eq('id', user.id);

      console.error('Claim insert error:', claimError);
      return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    console.error('Claims POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
