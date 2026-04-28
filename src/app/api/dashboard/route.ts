import { NextResponse } from 'next/server';
import { createClient, createAnonClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { buildFallbackSummary } from '@/features/dashboard/sprint-summary-service';
import type { Database } from '@/types/database';
import type {
  ActivityDigestEntry,
  DashboardPayload,
  DashboardStatStrip,
  MyContributions,
  SprintHero,
  TopContributor,
} from '@/features/dashboard/types';

export const dynamic = 'force-dynamic';

type SprintStatus = Database['public']['Enums']['sprint_status'];
const ACTIVE_PHASES: SprintStatus[] = ['active', 'review', 'dispute_window', 'settlement'];
const DIGEST_LIMIT = 8;
const DIGEST_LOOKBACK_DAYS = 7;

interface SprintRow {
  id: string;
  name: string;
  status: string | null;
  start_at: string;
  end_at: string;
  dispute_window_ends_at: string | null;
  goal: string | null;
  ai_summary_text: string | null;
  ai_summary_themes: string[] | null;
  ai_summary_generated_at: string | null;
  ai_summary_model: string | null;
}

interface SprintTaskRow {
  id: string;
  status: string | null;
  points: number | null;
  assignee_id: string | null;
}

async function loadSprintHero(): Promise<SprintHero | null> {
  const supabase = createAnonClient();
  const { data: sprintsRaw, error } = await supabase
    .from('sprints')
    .select('*')
    .in('status', ACTIVE_PHASES)
    .order('start_at', { ascending: true })
    .limit(1);

  if (error) {
    logger.error('dashboard: failed to load active sprint', { error });
    return null;
  }

  const sprint = (sprintsRaw?.[0] ?? null) as unknown as SprintRow | null;
  if (!sprint) return null;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, points, assignee_id')
    .eq('sprint_id', sprint.id);

  const taskRows = (tasks ?? []) as SprintTaskRow[];
  const totalTasks = taskRows.length;
  const doneTasks = taskRows.filter((t) => t.status === 'done').length;
  const totalPoints = taskRows.reduce((sum, t) => sum + (t.points ?? 0), 0);
  const donePoints = taskRows
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.points ?? 0), 0);

  const xpByAssignee = new Map<string, number>();
  for (const t of taskRows) {
    if (t.status !== 'done' || !t.assignee_id) continue;
    xpByAssignee.set(t.assignee_id, (xpByAssignee.get(t.assignee_id) ?? 0) + (t.points ?? 0));
  }

  const assigneeIds = Array.from(xpByAssignee.keys());
  let topContributors: TopContributor[] = [];
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, name, organic_id, avatar_url')
      .in('id', assigneeIds);

    topContributors = (profiles ?? [])
      .map((p) => ({
        userId: p.id,
        name: p.name,
        avatarUrl: p.avatar_url,
        organicId: p.organic_id,
        xpEarned: xpByAssignee.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.xpEarned - a.xpEarned)
      .slice(0, 3);
  }

  const hasAi = !!sprint.ai_summary_text && !!sprint.ai_summary_generated_at;
  const fallbackText = buildFallbackSummary({
    name: sprint.name,
    status: sprint.status ?? 'unknown',
    doneTasks,
    totalTasks,
    topContributors: topContributors.map((c) => ({ name: c.name ?? `Member #${c.organicId ?? '—'}` })),
  });

  return {
    id: sprint.id,
    name: sprint.name,
    status: sprint.status,
    startAt: sprint.start_at,
    endAt: sprint.end_at,
    disputeWindowEndsAt: sprint.dispute_window_ends_at,
    goal: sprint.goal,
    progress: { done: doneTasks, total: totalTasks, pointsTotal: totalPoints, pointsDone: donePoints },
    topContributors,
    aiSummary: hasAi
      ? {
          text: sprint.ai_summary_text ?? fallbackText,
          themes: sprint.ai_summary_themes ?? [],
          generatedAt: sprint.ai_summary_generated_at,
          model: sprint.ai_summary_model,
        }
      : { text: fallbackText, themes: [], generatedAt: null, model: null },
  };
}

async function loadStatStrip(sprintId: string | null): Promise<DashboardStatStrip> {
  const supabase = createAnonClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [activeMembersResult, openProposalsResult] = await Promise.all([
    supabase
      .from('activity_log')
      .select('actor_id', { count: 'exact', head: false })
      .gte('created_at', since24h)
      .not('actor_id', 'is', null),
    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .in('status', ['voting', 'submitted', 'approved', 'discussion']),
  ]);

  const distinctActiveMembers = new Set(
    (activeMembersResult.data ?? []).map((row) => row.actor_id).filter((id): id is string => !!id)
  ).size;

  let pointsDistributed = 0;
  let tasksShipped = 0;
  if (sprintId) {
    const { data: doneTasks } = await supabase
      .from('tasks')
      .select('points')
      .eq('sprint_id', sprintId)
      .eq('status', 'done');
    const rows = doneTasks ?? [];
    tasksShipped = rows.length;
    pointsDistributed = rows.reduce((sum, t) => sum + (t.points ?? 0), 0);
  }

  return {
    activeMembers24h: distinctActiveMembers,
    pointsDistributedThisSprint: pointsDistributed,
    tasksShippedThisSprint: tasksShipped,
    openProposals: openProposalsResult.count ?? 0,
  };
}

async function loadActivityDigest(): Promise<ActivityDigestEntry[]> {
  const supabase = createAnonClient();
  const since = new Date(Date.now() - DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, event_type, actor_id, subject_type, subject_id, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(DIGEST_LIMIT);

  if (error || !data) return [];

  const actorIds = Array.from(new Set(data.map((e) => e.actor_id).filter((id): id is string => !!id)));
  const profileMap = new Map<string, { name: string | null; organic_id: number | null; avatar_url: string | null }>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, name, organic_id, avatar_url')
      .in('id', actorIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { name: p.name, organic_id: p.organic_id, avatar_url: p.avatar_url });
    }
  }

  return data.map((entry) => {
    const profile = entry.actor_id ? profileMap.get(entry.actor_id) : null;
    return {
      id: entry.id,
      eventType: entry.event_type,
      actorName: profile?.name ?? null,
      actorOrganicId: profile?.organic_id ?? null,
      actorAvatarUrl: profile?.avatar_url ?? null,
      subjectType: entry.subject_type,
      subjectId: entry.subject_id,
      metadata: (entry.metadata ?? {}) as Record<string, unknown>,
      createdAt: entry.created_at ?? new Date().toISOString(),
    };
  });
}

async function loadMyContributions(userId: string, sprintId: string | null): Promise<MyContributions> {
  if (!sprintId) {
    return { tasksDone: 0, pointsEarned: 0, xpEarned: 0, nextTaskHref: null };
  }

  const supabase = createAnonClient();
  const { data: doneTasks } = await supabase
    .from('tasks')
    .select('id, points')
    .eq('sprint_id', sprintId)
    .eq('status', 'done')
    .eq('assignee_id', userId);

  const { data: nextTask } = await supabase
    .from('tasks')
    .select('id')
    .eq('sprint_id', sprintId)
    .eq('status', 'todo')
    .is('assignee_id', null)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle();

  const tasksDone = (doneTasks ?? []).length;
  const pointsEarned = (doneTasks ?? []).reduce((sum, t) => sum + (t.points ?? 0), 0);

  return {
    tasksDone,
    pointsEarned,
    xpEarned: pointsEarned,
    nextTaskHref: nextTask ? `/tasks/${nextTask.id}` : null,
  };
}

export async function GET() {
  try {
    const sprint = await loadSprintHero();
    const sprintId = sprint?.id ?? null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [stats, activityDigest, myContributions] = await Promise.all([
      loadStatStrip(sprintId),
      loadActivityDigest(),
      user ? loadMyContributions(user.id, sprintId) : Promise.resolve(null),
    ]);

    const payload: DashboardPayload = {
      sprint,
      stats,
      myContributions,
      activityDigest,
    };

    return NextResponse.json({ data: payload, error: null });
  } catch (error) {
    logger.error('dashboard route failed', { error: String(error) });
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
