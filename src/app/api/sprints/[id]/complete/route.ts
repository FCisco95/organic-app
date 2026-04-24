import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { completeSprintSchema } from '@/features/sprints/schemas';
import {
  resolveSettlementBlockers,
  parseRewardSettlementResult,
  type RewardSettlementResult,
} from '@/features/sprints/settlement-blockers';
import { settleSprintEngagementBonuses } from '@/features/engagement/settlement';
import { logger } from '@/lib/logger';

const SPRINT_COLUMNS =
  'id, name, status, start_at, end_at, goal, capacity_points, reward_pool, org_id, active_started_at, review_started_at, dispute_window_started_at, dispute_window_ends_at, settlement_started_at, settlement_integrity_flags, settlement_blocked_reason, reward_settlement_status, reward_settlement_committed_at, reward_settlement_idempotency_key, reward_settlement_kill_switch_at, reward_emission_cap, reward_carryover_amount, reward_carryover_sprint_count, completed_at, created_at, updated_at';

const DEFAULT_DISPUTE_WINDOW_HOURS = 48;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is council or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role !== 'council' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only council and admin members can complete sprints' },
        { status: 403 }
      );
    }

    // Parse and validate body (optional for non-settlement transitions).
    let body: Record<string, unknown> = {};
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 0) {
      const { data, error: jsonError } = await parseJsonBody(request);
      if (jsonError) {
        return NextResponse.json({ error: jsonError }, { status: 400 });
      }
      body = data;
    }

    const parsed = completeSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const incompleteAction = parsed.data.incomplete_action ?? 'backlog';
    const nextSprintId = parsed.data.next_sprint_id;

    // Verify sprint exists and is in an execution phase
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select(SPRINT_COLUMNS)
      .eq('id', id)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (
      sprint.status !== 'active' &&
      sprint.status !== 'review' &&
      sprint.status !== 'dispute_window' &&
      sprint.status !== 'settlement'
    ) {
      return NextResponse.json(
        { error: 'Sprint is not in a completable phase', status: sprint.status },
        { status: 400 }
      );
    }

    if (sprint.status === 'active') {
      const { data: updatedSprint, error: updateError } = await supabase
        .from('sprints')
        .update({
          status: 'review',
          review_started_at: new Date().toISOString(),
          settlement_blocked_reason: null,
        })
        .eq('id', id)
        .select(SPRINT_COLUMNS)
        .single();

      if (updateError || !updatedSprint) {
        return NextResponse.json({ error: 'Failed to start review phase' }, { status: 500 });
      }

      return NextResponse.json({
        sprint: updatedSprint,
        snapshot: null,
        phase_transition: { from: 'active', to: 'review' },
      });
    }

    if (sprint.status === 'review') {
      let reviewerSla = {
        escalated_count: 0,
        extended_count: 0,
        admin_notified_count: 0,
      };

      const { data: slaData, error: slaError } = await supabase.rpc('apply_sprint_reviewer_sla', {
        p_sprint_id: id,
        p_extension_hours: 24,
      });

      if (slaError) {
        logger.error('Error applying sprint reviewer SLA:', slaError);
      } else if (Array.isArray(slaData) && slaData.length > 0) {
        reviewerSla = {
          escalated_count: Number(slaData[0]?.escalated_count ?? 0),
          extended_count: Number(slaData[0]?.extended_count ?? 0),
          admin_notified_count: Number(slaData[0]?.admin_notified_count ?? 0),
        };
      }

      const now = Date.now();
      const disputeWindowEndsAt =
        sprint.dispute_window_ends_at ??
        new Date(now + DEFAULT_DISPUTE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      const { data: updatedSprint, error: updateError } = await supabase
        .from('sprints')
        .update({
          status: 'dispute_window',
          dispute_window_started_at: new Date(now).toISOString(),
          dispute_window_ends_at: disputeWindowEndsAt,
          settlement_blocked_reason: null,
        })
        .eq('id', id)
        .select(SPRINT_COLUMNS)
        .single();

      if (updateError || !updatedSprint) {
        return NextResponse.json({ error: 'Failed to start dispute window phase' }, { status: 500 });
      }

      return NextResponse.json({
        sprint: updatedSprint,
        snapshot: null,
        reviewer_sla: reviewerSla,
        phase_transition: { from: 'review', to: 'dispute_window' },
      });
    }

    if (sprint.status === 'dispute_window') {
      if (sprint.dispute_window_ends_at && new Date(sprint.dispute_window_ends_at) > new Date()) {
        return NextResponse.json(
          {
            error: 'Dispute window is still open',
            dispute_window_ends_at: sprint.dispute_window_ends_at,
          },
          { status: 409 }
        );
      }

      const settlementBlockers = await resolveSettlementBlockers(supabase, id);
      if (settlementBlockers.blocked) {
        const blockedReason =
          settlementBlockers.reasons.join('; ') || 'unknown settlement blocker';

        await supabase
          .from('sprints')
          .update({ settlement_blocked_reason: blockedReason })
          .eq('id', id);

        return NextResponse.json(
          { error: 'Settlement is blocked', settlement_blockers: settlementBlockers },
          { status: 409 }
        );
      }

      const { data: updatedSprint, error: updateError } = await supabase
        .from('sprints')
        .update({
          status: 'settlement',
          settlement_started_at: new Date().toISOString(),
          settlement_blocked_reason: null,
        })
        .eq('id', id)
        .select(SPRINT_COLUMNS)
        .single();

      if (updateError || !updatedSprint) {
        return NextResponse.json({ error: 'Failed to start settlement phase' }, { status: 500 });
      }

      return NextResponse.json({
        sprint: updatedSprint,
        snapshot: null,
        settlement_blockers: settlementBlockers,
        phase_transition: { from: 'dispute_window', to: 'settlement' },
      });
    }

    // settlement -> completed
    const settlementBlockers = await resolveSettlementBlockers(supabase, id);
    if (settlementBlockers.blocked) {
      const blockedReason = settlementBlockers.reasons.join('; ') || 'unknown settlement blocker';

      await supabase
        .from('sprints')
        .update({ settlement_blocked_reason: blockedReason })
        .eq('id', id);

      return NextResponse.json(
        { error: 'Settlement is blocked', settlement_blockers: settlementBlockers },
        { status: 409 }
      );
    }

    // If moving to next sprint, validate it exists and is in planning.
    if (incompleteAction === 'next_sprint') {
      if (!nextSprintId) {
        return NextResponse.json(
          { error: 'next_sprint_id is required when incomplete_action is next_sprint' },
          { status: 400 }
        );
      }
      const { data: nextSprint } = await supabase
        .from('sprints')
        .select('id, status')
        .eq('id', nextSprintId)
        .single();

      if (!nextSprint) {
        return NextResponse.json({ error: 'Next sprint not found' }, { status: 404 });
      }
      if (nextSprint.id === id) {
        return NextResponse.json(
          { error: 'Next sprint must be different from the sprint being completed' },
          { status: 400 }
        );
      }
      if (nextSprint.status !== 'planning') {
        return NextResponse.json(
          { error: 'Next sprint must be in planning status' },
          { status: 400 }
        );
      }
    }

    let rewardSettlement: RewardSettlementResult | null = null;
    let epochDistributions = 0;
    let pointsSettlement: Record<string, unknown> | null = null;

    // Proportional task-pool points payout (see migration
    // 20260408000000_sprint_proportional_points_payout.sql). Runs before
    // the token reward settlement so we fail fast on point issues before
    // touching treasury numbers.
    const { data: pointsData, error: pointsError } = await (supabase as any).rpc(
      'settle_sprint_task_points',
      { p_sprint_id: id }
    );

    if (pointsError) {
      logger.error('Error settling sprint task points:', pointsError);
      return NextResponse.json(
        { error: 'Failed to settle sprint task points' },
        { status: 500 }
      );
    }

    pointsSettlement =
      pointsData && typeof pointsData === 'object'
        ? (pointsData as Record<string, unknown>)
        : null;

    // Distribute X Engagement top-N bonus pools for posts in this sprint.
    // Non-fatal: a failure here shouldn't block token reward settlement.
    let engagementSettlement: Record<string, unknown> | null = null;
    try {
      const engagementResult = await settleSprintEngagementBonuses(supabase, id);
      engagementSettlement = engagementResult as unknown as Record<string, unknown>;
      if (!engagementResult.ok) {
        logger.warn('Engagement sprint-bonus settlement returned non-ok', engagementResult);
      }
    } catch (engErr) {
      logger.error('Engagement sprint-bonus settlement threw', engErr);
    }

    const { data: settlementData, error: settlementError } = await supabase.rpc(
      'commit_sprint_reward_settlement',
      {
        p_sprint_id: id,
        p_actor_id: user.id,
        p_reason: 'sprint_completion',
      }
    );

    if (settlementError) {
      const missingFunction =
        settlementError.message?.includes('commit_sprint_reward_settlement') ?? false;

      if (missingFunction) {
        logger.warn(
          'commit_sprint_reward_settlement RPC unavailable, falling back to distribute_epoch_rewards',
          { sprint_id: id }
        );

        if (sprint.reward_pool && Number(sprint.reward_pool) > 0) {
          const { data: distCount, error: distError } = await supabase.rpc(
            'distribute_epoch_rewards',
            { p_sprint_id: id }
          );
          if (distError) {
            logger.error('Error distributing epoch rewards fallback:', distError);
            return NextResponse.json(
              { error: 'Failed to settle sprint rewards' },
              { status: 500 }
            );
          }
          epochDistributions = distCount ?? 0;
        }
      } else {
        logger.error('Error committing sprint reward settlement:', settlementError);
        return NextResponse.json({ error: 'Failed to settle sprint rewards' }, { status: 500 });
      }
    } else {
      rewardSettlement = parseRewardSettlementResult(settlementData);
      epochDistributions = rewardSettlement.distributed_count ?? 0;

      if (!rewardSettlement.ok) {
        return NextResponse.json(
          {
            error: rewardSettlement.message ?? 'Reward settlement integrity hold',
            reward_settlement: rewardSettlement,
          },
          { status: 409 }
        );
      }
    }

    // Fetch all sprint tasks with assignee info
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id, title, status, points, assignee_id,
        assignee:user_profiles!tasks_assignee_id_fkey(name)
      `
      )
      .eq('sprint_id', id);

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch sprint tasks' }, { status: 500 });
    }

    const allTasks = tasks ?? [];
    const completedTasks = allTasks.filter((t) => t.status === 'done');
    const incompleteTasks = allTasks.filter((t) => t.status !== 'done');

    const totalPoints = allTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const completionRate =
      allTasks.length > 0
        ? Number(((completedTasks.length / allTasks.length) * 100).toFixed(2))
        : 0;

    // Build task summary JSONB
    const taskSummary = allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      points: t.points,
      assignee_name: (t.assignee as { name: string | null } | null)?.name ?? null,
    }));

    // Insert snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('sprint_snapshots')
      .insert({
        sprint_id: id,
        completed_by: user.id,
        total_tasks: allTasks.length,
        completed_tasks: completedTasks.length,
        incomplete_tasks: incompleteTasks.length,
        total_points: totalPoints,
        completed_points: completedPoints,
        completion_rate: completionRate,
        task_summary: taskSummary,
        incomplete_action: incompleteAction,
      })
      .select()
      .single();

    if (snapError) {
      logger.error('Error creating sprint snapshot:', snapError);
      return NextResponse.json({ error: 'Failed to create sprint snapshot' }, { status: 500 });
    }

    // Handle incomplete tasks
    if (incompleteTasks.length > 0) {
      const incompleteIds = incompleteTasks.map((t) => t.id);

      if (incompleteAction === 'backlog') {
        const { error: backlogError } = await supabase
          .from('tasks')
          .update({ sprint_id: null, status: 'backlog' })
          .in('id', incompleteIds);

        if (backlogError) {
          logger.error('Error moving tasks to backlog:', backlogError);
          return NextResponse.json(
            { error: 'Failed to move incomplete tasks to backlog' },
            { status: 500 }
          );
        }
      } else if (incompleteAction === 'next_sprint' && nextSprintId) {
        const { error: moveError } = await supabase
          .from('tasks')
          .update({ sprint_id: nextSprintId })
          .in('id', incompleteIds);

        if (moveError) {
          logger.error('Error moving tasks to next sprint:', moveError);
          return NextResponse.json(
            { error: 'Failed to move incomplete tasks to next sprint' },
            { status: 500 }
          );
        }
      }
    }

    // Update sprint to completed (settlement -> completed).
    const { data: updatedSprint, error: updateError } = await supabase
      .from('sprints')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        settlement_blocked_reason: null,
      })
      .eq('id', id)
      .select(SPRINT_COLUMNS)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to complete sprint' }, { status: 500 });
    }

    // Consolidate post-completion actions: escalate disputes + clone templates
    let disputesEscalated = 0;
    let recurringTasksCloned = 0;
    const targetSprintId =
      incompleteAction === 'next_sprint' && nextSprintId ? nextSprintId : null;

    const { data: finalizeData, error: finalizeError } = await supabase.rpc(
      'finalize_sprint_completion' as any,
      {
        p_sprint_id: id,
        p_target_sprint_id: targetSprintId,
      }
    );

    if (finalizeError) {
      logger.error('finalize_sprint_completion RPC error:', finalizeError);
    } else {
      const result = finalizeData as { ok: boolean; disputes_escalated?: number; templates_cloned?: number } | null;
      disputesEscalated = result?.disputes_escalated ?? 0;
      recurringTasksCloned = result?.templates_cloned ?? 0;
    }

    return NextResponse.json({
      sprint: updatedSprint,
      snapshot,
      recurring_tasks_cloned: recurringTasksCloned,
      epoch_distributions: epochDistributions,
      points_settlement: pointsSettlement,
      engagement_settlement: engagementSettlement,
      reward_settlement: rewardSettlement,
      disputes_escalated: disputesEscalated,
      settlement_blockers: settlementBlockers,
      phase_transition: { from: 'settlement', to: 'completed' },
    });
  } catch (error) {
    logger.error('Sprint complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
