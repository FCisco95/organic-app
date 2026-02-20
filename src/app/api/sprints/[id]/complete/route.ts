import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { completeSprintSchema } from '@/features/sprints/schemas';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

const SPRINT_COLUMNS =
  'id, name, status, start_at, end_at, goal, capacity_points, reward_pool, org_id, active_started_at, review_started_at, dispute_window_started_at, dispute_window_ends_at, settlement_started_at, settlement_integrity_flags, settlement_blocked_reason, reward_settlement_status, reward_settlement_committed_at, reward_settlement_idempotency_key, reward_settlement_kill_switch_at, reward_emission_cap, reward_carryover_amount, reward_carryover_sprint_count, completed_at, created_at, updated_at';

const TERMINAL_DISPUTE_STATUSES = ['resolved', 'dismissed', 'withdrawn', 'mediated'];
const DEFAULT_DISPUTE_WINDOW_HOURS = 48;

type SettlementBlockers = {
  blocked: boolean;
  unresolved_disputes: number;
  integrity_flag_count: number;
  integrity_flags: Json[];
  reasons: string[];
};

type RewardSettlementResult = {
  ok: boolean;
  code: string;
  status: 'pending' | 'committed' | 'held' | 'killed' | string;
  message?: string | null;
  idempotency_key?: string | null;
  distributed_count?: number;
  distributed_tokens?: number;
  emission_cap?: number;
  carryover_out?: number;
  carryover_streak?: number;
};

function parseSettlementBlockers(data: unknown): SettlementBlockers {
  const raw = (data ?? {}) as Record<string, unknown>;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.map((value) => String(value))
    : [];
  const integrityFlags = Array.isArray(raw.integrity_flags)
    ? (raw.integrity_flags as Json[])
    : [];

  return {
    blocked: Boolean(raw.blocked),
    unresolved_disputes: Number(raw.unresolved_disputes ?? 0),
    integrity_flag_count: Number(raw.integrity_flag_count ?? integrityFlags.length),
    integrity_flags: integrityFlags,
    reasons,
  };
}

function parseRewardSettlementResult(data: unknown): RewardSettlementResult {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(raw.ok),
    code: String(raw.code ?? ''),
    status: String(raw.status ?? 'pending'),
    message: raw.message ? String(raw.message) : null,
    idempotency_key: raw.idempotency_key ? String(raw.idempotency_key) : null,
    distributed_count: Number(raw.distributed_count ?? 0),
    distributed_tokens: Number(raw.distributed_tokens ?? 0),
    emission_cap: Number(raw.emission_cap ?? 0),
    carryover_out: Number(raw.carryover_out ?? 0),
    carryover_streak: Number(raw.carryover_streak ?? 0),
  };
}

async function resolveSettlementBlockers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sprintId: string
): Promise<SettlementBlockers> {
  const { data, error } = await supabase.rpc('get_sprint_settlement_blockers', {
    p_sprint_id: sprintId,
  });

  if (!error && data) {
    return parseSettlementBlockers(data);
  }

  // Fallback if RPC is not available yet in a partially migrated environment.
  const [{ count: unresolvedCount }, { data: sprint }] = await Promise.all([
    supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('sprint_id', sprintId)
      .not('status', 'in', `("${TERMINAL_DISPUTE_STATUSES.join('","')}")`),
    supabase
      .from('sprints')
      .select('settlement_integrity_flags')
      .eq('id', sprintId)
      .maybeSingle(),
  ]);

  const integrityFlags = Array.isArray(sprint?.settlement_integrity_flags)
    ? (sprint.settlement_integrity_flags as Json[])
    : [];
  const unresolvedDisputes = unresolvedCount ?? 0;
  const reasons: string[] = [];

  if (unresolvedDisputes > 0) {
    reasons.push(`${unresolvedDisputes} unresolved dispute(s)`);
  }
  if (integrityFlags.length > 0) {
    reasons.push('unresolved integrity flags are present');
  }

  return {
    blocked: reasons.length > 0,
    unresolved_disputes: unresolvedDisputes,
    integrity_flag_count: integrityFlags.length,
    integrity_flags: integrityFlags,
    reasons,
  };
}

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
      .single();

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

    // Phase 16: Auto-escalate unresolved disputes tied to the completed sprint.
    let disputesEscalated = 0;
    let adminDisputeExtensions = 0;
    const { data: escalationData, error: escalationError } = await supabase.rpc(
      'auto_escalate_sprint_disputes',
      { p_sprint_id: id }
    );

    if (escalationError) {
      logger.error('Error auto-escalating sprint disputes:', escalationError);
    } else if (Array.isArray(escalationData) && escalationData.length > 0) {
      disputesEscalated = escalationData[0]?.escalated_count ?? 0;
      adminDisputeExtensions = escalationData[0]?.admin_extended_count ?? 0;
    }

    // Phase 12: Auto-clone recurring task templates into next sprint
    let recurringTasksCloned = 0;
    const targetSprintId =
      incompleteAction === 'next_sprint' && nextSprintId ? nextSprintId : null;

    if (targetSprintId) {
      const { data: cloneResult, error: cloneError } = await supabase.rpc(
        'clone_recurring_templates',
        { p_sprint_id: targetSprintId }
      );

      if (cloneError) {
        logger.error('Error cloning recurring templates:', cloneError);
      } else {
        recurringTasksCloned = cloneResult ?? 0;
      }
    }

    return NextResponse.json({
      sprint: updatedSprint,
      snapshot,
      recurring_tasks_cloned: recurringTasksCloned,
      epoch_distributions: epochDistributions,
      reward_settlement: rewardSettlement,
      disputes_escalated: disputesEscalated,
      admin_dispute_extensions: adminDisputeExtensions,
      settlement_blockers: settlementBlockers,
      phase_transition: { from: 'settlement', to: 'completed' },
    });
  } catch (error) {
    logger.error('Sprint complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
