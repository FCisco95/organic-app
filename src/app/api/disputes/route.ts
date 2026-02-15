import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDisputeSchema, disputeFilterSchema } from '@/features/disputes/schemas';
import type { DisputeConfig } from '@/features/disputes/types';
import { DEFAULT_DISPUTE_CONFIG } from '@/features/disputes/types';

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

    // Check cooldown
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - config.dispute_cooldown_days);

    const { data: recentDisputes } = await supabase
      .from('disputes')
      .select('id')
      .eq('disputant_id', user.id)
      .gte('created_at', cooldownDate.toISOString())
      .limit(1);

    if (recentDisputes && recentDisputes.length > 0) {
      return NextResponse.json(
        {
          error: `You must wait ${config.dispute_cooldown_days} days between disputes`,
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
        evidence_links: input.evidence_links,
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

  // Check cooldown
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - config.dispute_cooldown_days);

  const { data: recentDisputes } = await supabase
    .from('disputes')
    .select('id')
    .eq('disputant_id', userId)
    .gte('created_at', cooldownDate.toISOString())
    .limit(1);

  if (recentDisputes && recentDisputes.length > 0) {
    return NextResponse.json({
      eligible: false,
      reason: `Cooldown active (${config.dispute_cooldown_days}-day wait between disputes)`,
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
