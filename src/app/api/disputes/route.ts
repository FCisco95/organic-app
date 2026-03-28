import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDisputeSchema, disputeFilterSchema } from '@/features/disputes/schemas';
import {
  computeReviewerResponseDeadline,
  isDisputeWindowClosed,
} from '@/features/disputes/sla';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import {
  EXECUTION_SPRINT_STATUSES,
  MAX_EVIDENCE_FILES,
  getCooldownState,
  formatCooldownMessage,
  loadDisputeConfig,
  handleEligibilityCheck,
  handlePendingCount,
  handleArbitratorStats,
  handleReviewerAccuracy,
} from './helpers';

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
      const config = await loadDisputeConfig(supabase);
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
    const filterResult = disputeFilterSchema.safeParse({
      status: searchParams.get('status') || undefined,
      tier: searchParams.get('tier') || undefined,
      sprint_id: searchParams.get('sprint_id') || undefined,
      my_disputes: searchParams.get('my_disputes') === 'true' || undefined,
    });

    if (!filterResult.success) {
      return NextResponse.json({ error: 'Invalid filter parameters' }, { status: 400 });
    }

    const filters = filterResult.data;

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;

    // Get user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

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

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      pagination: { page, limit, hasMore: offset + limit < (count ?? 0) },
    });
  } catch (error) {
    logger.error('Error fetching disputes:', error);
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
      .maybeSingle();

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
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

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
    const config = await loadDisputeConfig(supabase);

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

    // Get current in-flight sprint (for sprint-bound filing window)
    const { data: activeSprint } = await supabase
      .from('sprints')
      .select('id, status, dispute_window_ends_at')
      .in('status', EXECUTION_SPRINT_STATUSES)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeSprint) {
      return NextResponse.json(
        { error: 'No sprint is currently in an execution phase' },
        { status: 409 }
      );
    }

    if (activeSprint.status !== 'dispute_window') {
      return NextResponse.json(
        { error: 'Disputes can only be filed during the sprint dispute window' },
        { status: 409 }
      );
    }

    const now = new Date();
    if (isDisputeWindowClosed(activeSprint.dispute_window_ends_at, now)) {
      return NextResponse.json(
        {
          error: 'Dispute window is closed for the current sprint',
          dispute_window_ends_at: activeSprint.dispute_window_ends_at,
        },
        { status: 409 }
      );
    }

    // Deduct XP stake
    const { error: xpError } = await supabase
      .from('user_profiles')
      .update({
        xp_total: Math.max(0, profile.xp_total - config.xp_dispute_stake),
      })
      .eq('id', user.id);

    if (xpError) throw xpError;

    // Calculate deadlines
    const mediationDeadline = input.request_mediation
      ? new Date(
          now.getTime() + config.dispute_mediation_hours * 60 * 60 * 1000
        ).toISOString()
      : null;
    const responseDeadline = computeReviewerResponseDeadline(now);

    // Create the dispute
    const { data: dispute, error: insertError } = await supabase
      .from('disputes')
      .insert({
        submission_id: input.submission_id,
        task_id: submission.task_id,
        sprint_id: activeSprint.id,
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
    logger.error('Error creating dispute:', error);
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
  }
}
