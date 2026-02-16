import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDisputeSchema, disputeFilterSchema } from '@/features/disputes/schemas';
import type { DisputeConfig } from '@/features/disputes/types';
import { DEFAULT_DISPUTE_CONFIG } from '@/features/disputes/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_EVIDENCE_FILES = 5;

type RecentDispute = {
  created_at: string;
  status: string;
};

function getCooldownDays(config: DisputeConfig, disputeStatus?: string) {
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

function getCooldownState(config: DisputeConfig, recentDispute: RecentDispute | null) {
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

function formatCooldownMessage(cooldown: NonNullable<ReturnType<typeof getCooldownState>>) {
  const dayLabel = cooldown.remainingDays === 1 ? 'day' : 'days';
  if (cooldown.isExtended && cooldown.status === 'dismissed') {
    return `Dismissed disputes require a ${cooldown.cooldownDays}-day cooldown (${cooldown.remainingDays} ${dayLabel} remaining)`;
  }

  return `Cooldown active (${cooldown.cooldownDays}-day wait between disputes, ${cooldown.remainingDays} ${dayLabel} remaining)`;
}

/**
 * GET /api/disputes
 * List disputes with filters, or return config / eligibility check.
 */
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

    // Config endpoint
    if (searchParams.get('config') === 'true') {
      const { data: org } = await supabase
        .from('orgs')
        .select('gamification_config')
        .limit(1)
        .single();

      const config: DisputeConfig = {
        ...DEFAULT_DISPUTE_CONFIG,
        ...(org?.gamification_config as Partial<DisputeConfig>),
      };

      return NextResponse.json({ data: config });
    }

    // Eligibility check endpoint
    const checkEligibility = searchParams.get('check_eligibility');
    if (checkEligibility) {
      return handleEligibilityCheck(supabase, user.id, checkEligibility);
    }

    // Pending dispute counter (used by sidebar badge)
    if (searchParams.get('pending_count') === 'true') {
      return handlePendingCount(supabase, user.id);
    }

    // Arbitrator stats (used by council/admin dashboard)
    if (searchParams.get('stats') === 'true') {
      return handleArbitratorStats(supabase, user.id);
    }

    // Reviewer accuracy (used for dispute accountability dashboard)
    if (searchParams.get('reviewer_accuracy') === 'true') {
      const reviewerId = searchParams.get('reviewer_id') || undefined;
      return handleReviewerAccuracy(supabase, user.id, reviewerId);
    }

    // Parse filters
    const filters = disputeFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      tier: searchParams.get('tier') || undefined,
      sprint_id: searchParams.get('sprint_id') || undefined,
      my_disputes: searchParams.get('my_disputes') === 'true' || undefined,
    });

    // Get user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isCouncilOrAdmin = profile?.role === 'admin' || profile?.role === 'council';

    let query = supabase
      .from('disputes')
      .select(
        `
        *,
        disputant:user_profiles!disputes_disputant_id_fkey(
          name, email, organic_id, avatar_url
        ),
        task:tasks!disputes_task_id_fkey(title)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Non-council members can only see their own disputes
    if (!isCouncilOrAdmin || filters.my_disputes) {
      query = query.or(
        `disputant_id.eq.${user.id},reviewer_id.eq.${user.id},arbitrator_id.eq.${user.id}`
      );
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.tier) {
      query = query.eq('tier', filters.tier);
    }
    if (filters.sprint_id) {
      query = query.eq('sprint_id', filters.sprint_id);
    }

    const { data, error, count } = await query.limit(50);

    if (error) throw error;

    return NextResponse.json({ data: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
  }
}

/**
 * POST /api/disputes
 * Create a new dispute on a task submission.
 */
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, xp_total')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.role === 'guest') {
      return NextResponse.json(
        { error: 'Guests cannot file disputes' },
        { status: 403 }
      );
    }

    // Parse input
    const body = await request.json();
    const parseResult = createDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const normalizedEvidenceLinks = Array.from(
      new Set(input.evidence_links.map((value) => value.trim()).filter(Boolean))
    );
    const normalizedEvidenceFiles = Array.from(
      new Set((input.evidence_files ?? []).map((value) => value.trim()).filter(Boolean))
    );

    if (normalizedEvidenceFiles.length > MAX_EVIDENCE_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_EVIDENCE_FILES} evidence files allowed` },
        { status: 400 }
      );
    }

    const hasInvalidEvidencePath = normalizedEvidenceFiles.some((path) => {
      if (!path.startsWith(`${user.id}/`)) return true;
      return path.includes('..');
    });

    if (hasInvalidEvidencePath) {
      return NextResponse.json(
        { error: 'Invalid evidence file path' },
        { status: 400 }
      );
    }

    // Load dispute config
    const { data: org } = await supabase
      .from('orgs')
      .select('gamification_config')
      .limit(1)
      .single();

    const config: DisputeConfig = {
      ...DEFAULT_DISPUTE_CONFIG,
      ...(org?.gamification_config as Partial<DisputeConfig>),
    };

    // Check minimum XP
    if (profile.xp_total < config.dispute_min_xp_to_file) {
      return NextResponse.json(
        {
          error: `You need at least ${config.dispute_min_xp_to_file} XP to file a dispute (you have ${profile.xp_total})`,
        },
        { status: 403 }
      );
    }

    // Check XP stake affordability
    if (profile.xp_total < config.xp_dispute_stake) {
      return NextResponse.json(
        {
          error: `Insufficient XP. Filing requires ${config.xp_dispute_stake} XP stake (you have ${profile.xp_total})`,
        },
        { status: 403 }
      );
    }

    // Get submission details
    const { data: submission, error: subError } = await supabase
      .from('task_submissions')
      .select('id, task_id, user_id, reviewer_id, review_status')
      .eq('id', input.submission_id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Must be the submission author
    if (submission.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only dispute your own submissions' },
        { status: 403 }
      );
    }

    // Submission must have been reviewed (rejected or scored)
    if (!submission.reviewer_id || submission.review_status === 'pending') {
      return NextResponse.json(
        { error: 'Submission has not been reviewed yet' },
        { status: 400 }
      );
    }

    // Cannot dispute your own review
    if (submission.reviewer_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot dispute your own review' },
        { status: 400 }
      );
    }

    // Check no active dispute on this submission
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('submission_id', input.submission_id)
      .not('status', 'in', '("resolved","dismissed","withdrawn","mediated")')
      .maybeSingle();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'An active dispute already exists for this submission' },
        { status: 409 }
      );
    }

    const { data: recentDispute } = await supabase
      .from('disputes')
      .select('created_at, status')
      .eq('disputant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cooldown = getCooldownState(config, recentDispute);
    if (cooldown) {
      return NextResponse.json(
        {
          error: formatCooldownMessage(cooldown),
        },
        { status: 429 }
      );
    }

    // Get current sprint (for sprint-bound deadline)
    const { data: activeSprint } = await supabase
      .from('sprints')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    // Deduct XP stake
    const { error: xpError } = await supabase
      .from('user_profiles')
      .update({
        xp_total: Math.max(0, profile.xp_total - config.xp_dispute_stake),
      })
      .eq('id', user.id);

    if (xpError) throw xpError;

    // Calculate deadlines
    const now = new Date();
    const mediationDeadline = input.request_mediation
      ? new Date(now.getTime() + config.dispute_mediation_hours * 60 * 60 * 1000).toISOString()
      : null;
    const responseDeadline = new Date(
      now.getTime() + config.dispute_response_hours * 60 * 60 * 1000
    ).toISOString();

    // Create the dispute
    const { data: dispute, error: insertError } = await supabase
      .from('disputes')
      .insert({
        submission_id: input.submission_id,
        task_id: submission.task_id,
        sprint_id: activeSprint?.id ?? null,
        disputant_id: user.id,
        reviewer_id: submission.reviewer_id,
        status: input.request_mediation ? 'mediation' : 'open',
        tier: input.request_mediation ? 'mediation' : 'council',
        reason: input.reason,
        evidence_text: input.evidence_text,
        evidence_links: normalizedEvidenceLinks,
        evidence_files: normalizedEvidenceFiles,
        response_deadline: responseDeadline,
        mediation_deadline: mediationDeadline,
        xp_stake: config.xp_dispute_stake,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Mark submission as disputed
    await supabase
      .from('task_submissions')
      .update({ review_status: 'disputed' })
      .eq('id', input.submission_id);

    return NextResponse.json({ data: dispute }, { status: 201 });
  } catch (error) {
    console.error('Error creating dispute:', error);
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function handleEligibilityCheck(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  submissionId: string
) {
  // Load config
  const { data: org } = await supabase
    .from('orgs')
    .select('gamification_config')
    .limit(1)
    .single();

  const config: DisputeConfig = {
    ...DEFAULT_DISPUTE_CONFIG,
    ...(org?.gamification_config as Partial<DisputeConfig>),
  };

  // Get user XP
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('xp_total, role')
    .eq('id', userId)
    .single();

  if (!profile) {
    return NextResponse.json({ eligible: false, reason: 'Profile not found', xp_stake: config.xp_dispute_stake, user_xp: 0 });
  }

  if (profile.role === 'guest') {
    return NextResponse.json({ eligible: false, reason: 'Guests cannot file disputes', xp_stake: config.xp_dispute_stake, user_xp: profile.xp_total });
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

  return NextResponse.json({
    eligible: true,
    xp_stake: config.xp_dispute_stake,
    user_xp: profile.xp_total,
  });
}

async function handlePendingCount(
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
    return NextResponse.json({ error: 'Failed to fetch pending count' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

async function handleArbitratorStats(
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
    return NextResponse.json(
      {
        data: {
          resolved_count: 0,
          overturn_rate: 0,
          avg_resolution_hours: 0,
        },
      }
    );
  }

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('resolution, created_at, resolved_at')
    .eq('arbitrator_id', userId)
    .in('status', ['resolved', 'dismissed']);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch arbitrator stats' }, { status: 500 });
  }

  const resolvedCount = disputes?.length ?? 0;
  const overturnedCount =
    disputes?.filter((dispute) => dispute.resolution === 'overturned').length ?? 0;
  const overturnRate =
    resolvedCount > 0 ? Math.round((overturnedCount / resolvedCount) * 100) : 0;

  const durations = (disputes ?? [])
    .map((dispute) => {
      if (!dispute.resolved_at) return null;
      const start = new Date(dispute.created_at).getTime();
      const end = new Date(dispute.resolved_at).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return (end - start) / (1000 * 60 * 60);
    })
    .filter((value): value is number => value !== null);

  const avgResolutionHours =
    durations.length > 0
      ? Math.round((durations.reduce((acc, value) => acc + value, 0) / durations.length) * 10) /
        10
      : 0;

  return NextResponse.json({
    data: {
      resolved_count: resolvedCount,
      overturn_rate: overturnRate,
      avg_resolution_hours: avgResolutionHours,
    },
  });
}

async function handleReviewerAccuracy(
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
    return NextResponse.json({ error: 'Admin or council access required' }, { status: 403 });
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
    return NextResponse.json({ error: 'Failed to fetch reviewer accuracy' }, { status: 500 });
  }

  const totalReviewsDisputed = disputes?.length ?? 0;
  const overturnedCount =
    disputes?.filter((dispute) => dispute.resolution === 'overturned').length ?? 0;
  const reviewerAccuracy =
    totalReviewsDisputed > 0
      ? Math.round(((totalReviewsDisputed - overturnedCount) / totalReviewsDisputed) * 100)
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
