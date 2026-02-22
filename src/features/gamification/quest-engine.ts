import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  QuestCadence,
  QuestProgressItem,
  QuestProgressResponse,
  QuestSummary,
} from './types';

type DbClient = SupabaseClient<Database>;

type ActivityRow = Pick<Database['public']['Tables']['activity_log']['Row'], 'event_type' | 'created_at'>;
type XpEventRow = Pick<Database['public']['Tables']['xp_events']['Row'], 'xp_amount' | 'created_at'>;

type QuestMetricKey =
  | 'daily_tasks_completed'
  | 'daily_votes_cast'
  | 'daily_xp_earned'
  | 'weekly_tasks_completed'
  | 'weekly_governance_actions'
  | 'weekly_active_days'
  | 'long_term_level'
  | 'long_term_achievements'
  | 'long_term_streak';

interface QuestDefinition {
  id: string;
  cadence: QuestCadence;
  title: string;
  description: string;
  target: number;
  unit: string;
  metric: QuestMetricKey;
  sort_order: number;
}

interface WindowMetrics {
  tasks_completed: number;
  votes_cast: number;
  comments_created: number;
  proposals_created: number;
  governance_actions: number;
  active_days: number;
  xp_earned: number;
}

interface QuestContext {
  daily: WindowMetrics;
  weekly: WindowMetrics;
  totals: {
    level: number;
    current_streak: number;
    achievements_unlocked: number;
    tasks_completed: number;
    votes_cast: number;
    comments_created: number;
    proposals_created: number;
  };
}

const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'daily_task_push',
    cadence: 'daily',
    title: 'Daily Builder',
    description: 'Complete at least 1 task today.',
    target: 1,
    unit: 'tasks',
    metric: 'daily_tasks_completed',
    sort_order: 10,
  },
  {
    id: 'daily_vote_signal',
    cadence: 'daily',
    title: 'Daily Signal',
    description: 'Cast at least 1 governance vote today.',
    target: 1,
    unit: 'votes',
    metric: 'daily_votes_cast',
    sort_order: 20,
  },
  {
    id: 'daily_xp_burst',
    cadence: 'daily',
    title: 'XP Burst',
    description: 'Earn 150 XP in one day.',
    target: 150,
    unit: 'xp',
    metric: 'daily_xp_earned',
    sort_order: 30,
  },
  {
    id: 'weekly_task_momentum',
    cadence: 'weekly',
    title: 'Weekly Momentum',
    description: 'Complete 5 tasks this week.',
    target: 5,
    unit: 'tasks',
    metric: 'weekly_tasks_completed',
    sort_order: 40,
  },
  {
    id: 'weekly_governance_actions',
    cadence: 'weekly',
    title: 'Governance Pulse',
    description: 'Take 3 governance actions (votes or proposals) this week.',
    target: 3,
    unit: 'actions',
    metric: 'weekly_governance_actions',
    sort_order: 50,
  },
  {
    id: 'weekly_active_days',
    cadence: 'weekly',
    title: 'Consistent Presence',
    description: 'Be active on 4 different days this week.',
    target: 4,
    unit: 'days',
    metric: 'weekly_active_days',
    sort_order: 60,
  },
  {
    id: 'long_term_level_five',
    cadence: 'long_term',
    title: 'Reach Level 5',
    description: 'Progress your account to level 5.',
    target: 5,
    unit: 'level',
    metric: 'long_term_level',
    sort_order: 70,
  },
  {
    id: 'long_term_achievements_ten',
    cadence: 'long_term',
    title: 'Achievement Hunter',
    description: 'Unlock 10 achievements.',
    target: 10,
    unit: 'achievements',
    metric: 'long_term_achievements',
    sort_order: 80,
  },
  {
    id: 'long_term_streak_thirty',
    cadence: 'long_term',
    title: 'Streak Master',
    description: 'Maintain a 30-day activity streak.',
    target: 30,
    unit: 'days',
    metric: 'long_term_streak',
    sort_order: 90,
  },
];

const TRACKED_ACTIVITY_EVENTS: Database['public']['Enums']['activity_event_type'][] = [
  'task_completed',
  'vote_cast',
  'comment_created',
  'proposal_created',
];

function getUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getUtcWeekStart(date: Date): Date {
  const start = getUtcDayStart(date);
  const daysFromMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysFromMonday);
  return start;
}

function getWindowMetrics(
  activityRows: ActivityRow[],
  xpRows: XpEventRow[],
  windowStartMs: number
): WindowMetrics {
  let tasksCompleted = 0;
  let votesCast = 0;
  let commentsCreated = 0;
  let proposalsCreated = 0;
  let xpEarned = 0;
  const activeDays = new Set<string>();

  for (const row of activityRows) {
    if (!row.created_at) continue;
    const timestamp = Date.parse(row.created_at);
    if (Number.isNaN(timestamp) || timestamp < windowStartMs) continue;

    activeDays.add(new Date(timestamp).toISOString().slice(0, 10));

    if (row.event_type === 'task_completed') tasksCompleted += 1;
    if (row.event_type === 'vote_cast') votesCast += 1;
    if (row.event_type === 'comment_created') commentsCreated += 1;
    if (row.event_type === 'proposal_created') proposalsCreated += 1;
  }

  for (const row of xpRows) {
    if (!row.created_at) continue;
    const timestamp = Date.parse(row.created_at);
    if (Number.isNaN(timestamp) || timestamp < windowStartMs) continue;
    xpEarned += Math.max(0, row.xp_amount ?? 0);
  }

  return {
    tasks_completed: tasksCompleted,
    votes_cast: votesCast,
    comments_created: commentsCreated,
    proposals_created: proposalsCreated,
    governance_actions: votesCast + proposalsCreated,
    active_days: activeDays.size,
    xp_earned: xpEarned,
  };
}

function resolveQuestMetric(definition: QuestDefinition, context: QuestContext): number {
  switch (definition.metric) {
    case 'daily_tasks_completed':
      return context.daily.tasks_completed;
    case 'daily_votes_cast':
      return context.daily.votes_cast;
    case 'daily_xp_earned':
      return context.daily.xp_earned;
    case 'weekly_tasks_completed':
      return context.weekly.tasks_completed;
    case 'weekly_governance_actions':
      return context.weekly.governance_actions;
    case 'weekly_active_days':
      return context.weekly.active_days;
    case 'long_term_level':
      return context.totals.level;
    case 'long_term_achievements':
      return context.totals.achievements_unlocked;
    case 'long_term_streak':
      return context.totals.current_streak;
    default:
      return 0;
  }
}

function toProgressItem(
  definition: QuestDefinition,
  context: QuestContext,
  nextDailyResetIso: string,
  nextWeeklyResetIso: string
): QuestProgressItem {
  const rawProgress = Math.max(0, Math.floor(resolveQuestMetric(definition, context)));
  const target = Math.max(1, definition.target);
  const progress = Math.min(rawProgress, target);
  const completed = rawProgress >= target;
  const progressPercent = Math.min(100, Math.round((progress / target) * 100));
  const remaining = Math.max(0, target - rawProgress);

  return {
    id: definition.id,
    cadence: definition.cadence,
    title: definition.title,
    description: definition.description,
    progress,
    target,
    unit: definition.unit,
    completed,
    progress_percent: progressPercent,
    remaining,
    reset_at:
      definition.cadence === 'daily'
        ? nextDailyResetIso
        : definition.cadence === 'weekly'
          ? nextWeeklyResetIso
          : null,
  };
}

function buildQuestSummary(items: QuestProgressItem[]): QuestSummary {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;

  return {
    completed,
    total,
    items: items.map((item) => ({
      id: item.id,
      cadence: item.cadence,
      title: item.title,
      progress: item.progress,
      target: item.target,
      unit: item.unit,
      completed: item.completed,
    })),
    note: null,
  };
}

export async function getQuestProgress(
  supabase: DbClient,
  userId: string,
  nowInput: Date = new Date()
): Promise<QuestProgressResponse> {
  const now = new Date(nowInput);
  const dayStart = getUtcDayStart(now);
  const weekStart = getUtcWeekStart(now);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

  const [profileResult, activityCountsResult, achievementsCountResult, weeklyActivityResult, weeklyXpResult] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('level, current_streak, tasks_completed')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_activity_counts')
        .select('tasks_completed, votes_cast, comments_created, proposals_created')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('activity_log')
        .select('event_type, created_at')
        .eq('actor_id', userId)
        .in('event_type', TRACKED_ACTIVITY_EVENTS)
        .gte('created_at', weekStart.toISOString()),
      supabase
        .from('xp_events')
        .select('xp_amount, created_at')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString()),
    ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error('Failed to load user quest profile state');
  }

  const activityRows = (weeklyActivityResult.data ?? []) as ActivityRow[];
  const xpRows = (weeklyXpResult.data ?? []) as XpEventRow[];

  const weeklyWindow = getWindowMetrics(activityRows, xpRows, weekStart.getTime());
  const dailyWindow = getWindowMetrics(activityRows, xpRows, dayStart.getTime());
  const activityCounts = activityCountsResult.data;

  const context: QuestContext = {
    daily: dailyWindow,
    weekly: weeklyWindow,
    totals: {
      level: profileResult.data.level ?? 1,
      current_streak: profileResult.data.current_streak ?? 0,
      achievements_unlocked: achievementsCountResult.count ?? 0,
      tasks_completed: activityCounts?.tasks_completed ?? profileResult.data.tasks_completed ?? 0,
      votes_cast: activityCounts?.votes_cast ?? 0,
      comments_created: activityCounts?.comments_created ?? 0,
      proposals_created: activityCounts?.proposals_created ?? 0,
    },
  };

  const items = QUEST_DEFINITIONS.map((definition) =>
    toProgressItem(definition, context, nextDayStart.toISOString(), nextWeekStart.toISOString())
  ).sort((a, b) => {
    const aDef = QUEST_DEFINITIONS.find((definition) => definition.id === a.id);
    const bDef = QUEST_DEFINITIONS.find((definition) => definition.id === b.id);
    return (aDef?.sort_order ?? 0) - (bDef?.sort_order ?? 0);
  });

  const objectives = {
    daily: items.filter((item) => item.cadence === 'daily'),
    weekly: items.filter((item) => item.cadence === 'weekly'),
    long_term: items.filter((item) => item.cadence === 'long_term'),
  };

  return {
    generated_at: now.toISOString(),
    objectives,
    summary: buildQuestSummary(items),
  };
}
