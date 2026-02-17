import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitClaimSchema, claimFilterSchema } from '@/features/rewards/schemas';
import type { RewardsConfig } from '@/features/rewards';
import { DEFAULT_REWARDS_CONFIG } from '@/features/rewards';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

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
      logger.error('Claims query error:', error);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    // Fetch user profiles in parallel (FK goes to auth.users, not user_profiles, so can't use Supabase join)
    const userIds = Array.from(new Set((claims ?? []).map((c) => c.user_id)));
    let profileMap = new Map<string, { name: string | null; email: string }>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .in('id', userIds);

      profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { name: p.name, email: p.email }])
      );
    }

    const mapped = (claims ?? []).map((c) => ({
      ...c,
      user_name: profileMap.get(c.user_id)?.name ?? null,
      user_email: profileMap.get(c.user_id)?.email ?? null,
    }));

    return NextResponse.json({ claims: mapped, total: count ?? 0 });
  } catch (err) {
    logger.error('Claims GET error:', err);
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

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

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

    // Lock-on-submit: deduct claimable_points with optimistic lock to prevent double-deduction
    const expectedBefore = profile.claimable_points;
    const expectedAfter = expectedBefore - points_amount;

    const { data: deducted, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        claimable_points: expectedAfter,
      })
      .eq('id', user.id)
      .eq('claimable_points', expectedBefore) // optimistic lock: fail if concurrent mutation
      .select('id')
      .maybeSingle();

    if (updateError) {
      logger.error('Points deduction error:', updateError);
      return NextResponse.json({ error: 'Failed to deduct points' }, { status: 500 });
    }

    if (!deducted) {
      // Optimistic lock failed — another claim modified points concurrently
      return NextResponse.json(
        { error: 'Points balance changed. Please retry your claim.' },
        { status: 409 }
      );
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
      // Refund points on failure — verify the refund succeeds
      const { error: refundError } = await supabase
        .from('user_profiles')
        .update({ claimable_points: expectedBefore })
        .eq('id', user.id)
        .eq('claimable_points', expectedAfter); // only refund if balance unchanged since deduction

      if (refundError) {
        logger.error('CRITICAL: Points refund failed after claim insert error. User:', user.id, 'Amount:', points_amount, 'Refund error:', refundError);
      }

      logger.error('Claim insert error:', claimError);
      return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    logger.error('Claims POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
