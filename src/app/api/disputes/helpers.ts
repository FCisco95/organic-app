import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DisputeConfig } from '@/features/disputes/types';
import { DEFAULT_DISPUTE_CONFIG } from '@/features/disputes/types';
import {
  DISPUTE_REVIEWER_RESPONSE_HOURS,
  isDisputeWindowClosed,
} from '@/features/disputes/sla';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MAX_EVIDENCE_FILES = 5;
export const EXECUTION_SPRINT_STATUSES = [
  'active',
  'review',
  'dispute_window',
  'settlement',
] as const;

type RecentDispute = {
  created_at: string;
  status: string;
};

export function getCooldownDays(config: DisputeConfig, disputeStatus?: string) {
  const baseCooldownDays = Math.max(0, config.dispute_cooldown_days);
  const dismissedCooldownDays = Math.max(
    baseCooldownDays,
    config.dispute_dismissed_cooldown_days
  );

  if (disputeStatus === 'dismissed') {
    return {
      cooldownDays: dismissedCooldownDays,
      isExtended: dismissedCooldownDays > baseCooldownDays,
    };
  }

  return {
    cooldownDays: baseCooldownDays,
    isExtended: false,
  };
}

export function getCooldownState(config: DisputeConfig, recentDispute: RecentDispute | null) {
  if (!recentDispute?.created_at) return null;

  const createdAtMs = new Date(recentDispute.created_at).getTime();
  if (!Number.isFinite(createdAtMs)) return null;

  const { cooldownDays, isExtended } = getCooldownDays(config, recentDispute.status);
  const cooldownMs = cooldownDays * MS_PER_DAY;
  const elapsedMs = Date.now() - createdAtMs;

  if (elapsedMs >= cooldownMs) return null;

  const remainingDays = Math.ceil((cooldownMs - elapsedMs) / MS_PER_DAY);
  return {
    cooldownDays,
    remainingDays,
    isExtended,
    status: recentDispute.status,
  };
}

export function formatCooldownMessage(
  cooldown: NonNullable<ReturnType<typeof getCooldownState>>
) {
  const dayLabel = cooldown.remainingDays === 1 ? 'day' : 'days';
  if (cooldown.isExtended && cooldown.status === 'dismissed') {
    return `Dismissed disputes require a ${cooldown.cooldownDays}-day cooldown (${cooldown.remainingDays} ${dayLabel} remaining)`;
  }

  return `Cooldown active (${cooldown.cooldownDays}-day wait between disputes, ${cooldown.remainingDays} ${dayLabel} remaining)`;
}

/** Load the dispute config from org settings, merged with defaults. */
export async function loadDisputeConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DisputeConfig> {
  const { data: org } = await supabase
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();

  return {
    ...DEFAULT_DISPUTE_CONFIG,
    ...(org?.gamification_config as Partial<DisputeConfig>),
    dispute_response_hours: DISPUTE_REVIEWER_RESPONSE_HOURS,
  };
}

export async function handleEligibilityCheck(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  submissionId: string
) {
  const config = await loadDisputeConfig(supabase);

  // Get user XP
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('xp_total, role')
    .eq('id', userId)
    .single();

  if (!profile) {
    return NextResponse.json({
      eligible: false,
      reason: 'Profile not found',
      xp_stake: config.xp_dispute_stake,
      user_xp: 0,
    });
  }

  if (profile.role === 'guest') {
    return NextResponse.json({
      eligible: false,
      reason: 'Guests cannot file disputes',
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  if (profile.xp_total < config.dispute_min_xp_to_file) {
    return NextResponse.json({
      eligible: false,
      reason: `Need ${config.dispute_min_xp_to_file} XP minimum (you have ${profile.xp_total})`,
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  if (profile.xp_total < config.xp_dispute_stake) {
    return NextResponse.json({
      eligible: false,
      reason: `Insufficient XP for stake (need ${config.xp_dispute_stake}, have ${profile.xp_total})`,
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  const { data: recentDispute } = await supabase
    .from('disputes')
    .select('created_at, status')
    .eq('disputant_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cooldown = getCooldownState(config, recentDispute);
  if (cooldown) {
    return NextResponse.json({
      eligible: false,
      reason: formatCooldownMessage(cooldown),
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  // Check no active dispute on this submission
  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id')
    .eq('submission_id', submissionId)
    .not('status', 'in', '("resolved","dismissed","withdrawn","mediated")')
    .maybeSingle();

  if (existingDispute) {
    return NextResponse.json({
      eligible: false,
      reason: 'An active dispute already exists for this submission',
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  const { data: activeSprint } = await supabase
    .from('sprints')
    .select('id, status, dispute_window_ends_at')
    .in('status', EXECUTION_SPRINT_STATUSES)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSprint) {
    return NextResponse.json({
      eligible: false,
      reason: 'No sprint is currently in an execution phase',
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  if (activeSprint.status !== 'dispute_window') {
    return NextResponse.json({
      eligible: false,
      reason: 'Disputes can only be filed during the sprint dispute window',
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  if (isDisputeWindowClosed(activeSprint.dispute_window_ends_at)) {
    return NextResponse.json({
      eligible: false,
      reason: 'Dispute window is closed for the current sprint',
      xp_stake: config.xp_dispute_stake,
      user_xp: profile.xp_total,
    });
  }

  return NextResponse.json({
    eligible: true,
    xp_stake: config.xp_dispute_stake,
    user_xp: profile.xp_total,
  });
}

export async function handlePendingCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isCouncilOrAdmin = profile?.role === 'admin' || profile?.role === 'council';

  let query = supabase
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '("resolved","dismissed","withdrawn","mediated")');

  if (!isCouncilOrAdmin) {
    query = query.or(
      `disputant_id.eq.${userId},reviewer_id.eq.${userId},arbitrator_id.eq.${userId}`
    );
  }

  const { count, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pending count' },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: count ?? 0 });
}

export async function handleArbitratorStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isCouncilOrAdmin = profile?.role === 'admin' || profile?.role === 'council';
  if (!isCouncilOrAdmin) {
    return NextResponse.json({
      data: { resolved_count: 0, overturn_rate: 0, avg_resolution_hours: 0 },
    });
  }

  const { data, error } = await supabase.rpc('get_arbitrator_stats', {
    p_user_id: userId,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch arbitrator stats' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? { resolved_count: 0, overturn_rate: 0, avg_resolution_hours: 0 },
  });
}

export async function handleReviewerAccuracy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  reviewerId?: string
) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isCouncilOrAdmin = profile?.role === 'admin' || profile?.role === 'council';
  if (!isCouncilOrAdmin) {
    return NextResponse.json(
      { error: 'Admin or council access required' },
      { status: 403 }
    );
  }

  let query = supabase
    .from('disputes')
    .select('reviewer_id, resolution')
    .in('status', ['resolved', 'dismissed']);

  if (reviewerId) {
    query = query.eq('reviewer_id', reviewerId);
  }

  const { data: disputes, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch reviewer accuracy' },
      { status: 500 }
    );
  }

  const totalReviewsDisputed = disputes?.length ?? 0;
  const overturnedCount =
    disputes?.filter((dispute) => dispute.resolution === 'overturned').length ?? 0;
  const reviewerAccuracy =
    totalReviewsDisputed > 0
      ? Math.round(
          ((totalReviewsDisputed - overturnedCount) / totalReviewsDisputed) * 100
        )
      : 0;

  return NextResponse.json({
    data: {
      reviewer_id: reviewerId ?? 'all',
      total_reviews_disputed: totalReviewsDisputed,
      overturned_count: overturnedCount,
      reviewer_accuracy: reviewerAccuracy,
    },
  });
}
