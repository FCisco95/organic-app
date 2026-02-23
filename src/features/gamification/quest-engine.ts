import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  QuestCadence,
  QuestProgressItem,
  QuestProgressResponse,
  QuestSummary,
  QuestDefinitionRow,
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

function resolveQuestMetric(metricType: string, context: QuestContext): number {
  switch (metricType as QuestMetricKey) {
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
  quest: QuestDefinitionRow,
  context: QuestContext,
  nextDailyResetIso: string,
  nextWeeklyResetIso: string
): QuestProgressItem {
  const rawProgress = Math.max(0, Math.floor(resolveQuestMetric(quest.metric_type, context)));
  const target = Math.max(1, quest.target_value);
  const progress = Math.min(rawProgress, target);
  const completed = rawProgress >= target;
  const progressPercent = Math.min(100, Math.round((progress / target) * 100));
  const remaining = Math.max(0, target - rawProgress);

  return {
    id: quest.id,
    cadence: quest.cadence,
    title: quest.title,
    description: quest.description,
    progress,
    target,
    unit: quest.unit,
    completed,
    progress_percent: progressPercent,
    remaining,
    reset_at:
      quest.cadence === 'daily'
        ? nextDailyResetIso
        : quest.cadence === 'weekly'
          ? nextWeeklyResetIso
          : null,
    xp_reward: quest.xp_reward,
    points_reward: quest.points_reward,
    icon: quest.icon,
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

/** Load active quest definitions from DB, filtering event quests by date window */
export async function loadQuestDefinitions(
  supabase: DbClient,
  now: Date = new Date()
): Promise<QuestDefinitionRow[]> {
  const { data, error } = await supabase
    .from('quests' as any)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load quest definitions: ${error.message}`);
  }

  const nowIso = now.toISOString();
  const rows = (data ?? []) as unknown as QuestDefinitionRow[];
  return rows.filter((quest) => {
    // Filter event quests by active date window
    if (quest.cadence === 'event') {
      if (quest.start_date && quest.start_date > nowIso) return false;
      if (quest.end_date && quest.end_date < nowIso) return false;
    }
    return true;
  });
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

  const [questDefs, profileResult, activityCountsResult, achievementsCountResult, weeklyActivityResult, weeklyXpResult] =
    await Promise.all([
      loadQuestDefinitions(supabase, now),
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

  const items = questDefs.map((quest) =>
    toProgressItem(quest, context, nextDayStart.toISOString(), nextWeekStart.toISOString())
  );

  const objectives = {
    daily: items.filter((item) => item.cadence === 'daily'),
    weekly: items.filter((item) => item.cadence === 'weekly'),
    long_term: items.filter((item) => item.cadence === 'long_term'),
    event: items.filter((item) => item.cadence === 'event'),
  };

  return {
    generated_at: now.toISOString(),
    objectives,
    summary: buildQuestSummary(items),
  };
}
