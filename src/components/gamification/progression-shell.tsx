'use client';

import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gift,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useGamificationOverview, useQuestProgress } from '@/features/gamification';
import type { QuestProgressItem } from '@/features/gamification';
import { LevelBadge } from '@/components/reputation/level-badge';
import { XpProgressBar } from '@/components/reputation/xp-progress-bar';
import { StreakDisplay } from '@/components/reputation/streak-display';
import { AchievementGrid } from '@/components/reputation/achievement-grid';
import { XpHistory } from '@/components/reputation/xp-history';

type SourceContext = 'tasks' | 'proposals' | 'profile';

const QUEST_CTA_MAP: Record<
  string,
  { href: '/tasks' | '/proposals' | '/profile'; labelKey: 'questCtaTasks' | 'questCtaProposals' | 'questCtaProfile' }
> = {
  daily_task_push: { href: '/tasks', labelKey: 'questCtaTasks' },
  daily_vote_signal: { href: '/proposals', labelKey: 'questCtaProposals' },
  daily_xp_burst: { href: '/tasks', labelKey: 'questCtaTasks' },
  weekly_task_momentum: { href: '/tasks', labelKey: 'questCtaTasks' },
  weekly_governance_actions: { href: '/proposals', labelKey: 'questCtaProposals' },
  weekly_active_days: { href: '/profile', labelKey: 'questCtaProfile' },
  long_term_level_five: { href: '/tasks', labelKey: 'questCtaTasks' },
  long_term_achievements_ten: { href: '/tasks', labelKey: 'questCtaTasks' },
  long_term_streak_thirty: { href: '/tasks', labelKey: 'questCtaTasks' },
};

const QUEST_FALLBACK_CTA: { href: '/tasks'; labelKey: 'questCtaDefault' } = {
  href: '/tasks',
  labelKey: 'questCtaDefault',
};

const SOURCE_CONTEXT_HREF: Record<SourceContext, '/tasks' | '/proposals' | '/profile'> = {
  tasks: '/tasks',
  proposals: '/proposals',
  profile: '/profile',
};

const QUEST_CADENCE_ORDER = ['daily', 'weekly', 'long_term'] as const;

const CADENCE_COLORS: Record<(typeof QUEST_CADENCE_ORDER)[number], { border: string; bg: string; ring: string }> = {
  daily: { border: 'border-l-organic-orange', bg: 'bg-orange-50', ring: 'text-organic-orange' },
  weekly: { border: 'border-l-blue-500', bg: 'bg-blue-50', ring: 'text-blue-500' },
  long_term: { border: 'border-l-purple-500', bg: 'bg-purple-50', ring: 'text-purple-500' },
};

/** SVG circular progress ring */
function ProgressRing({
  percent,
  size = 48,
  strokeWidth = 4,
  completed = false,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  completed?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={completed ? 'text-emerald-500' : 'text-organic-orange'}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold tabular-nums text-foreground">
        {percent}%
      </span>
    </div>
  );
}

export function ProgressionShell({ sourceContext = null }: { sourceContext?: SourceContext | null }) {
  const locale = useLocale();
  const t = useTranslations('Gamification');
  const tReputation = useTranslations('Reputation');
  const { data, isLoading, isError } = useGamificationOverview({ enabled: true });
  const { data: questProgress, isLoading: isQuestLoading, isError: isQuestError } = useQuestProgress({
    enabled: !isError,
  });
  const relativeTime = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }), [locale]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" data-testid="progression-shell-loading">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4" data-testid="progression-shell-error">
        <p className="text-sm font-medium text-red-700">{t('errorLoad')}</p>
      </div>
    );
  }

  const pointsRemaining = Math.max(0, data.rewards.min_threshold - data.rewards.claimable_points);

  const objectives = questProgress?.objectives ?? Object.fromEntries(
    QUEST_CADENCE_ORDER.map((cadence) => [
      cadence,
      data.quest_summary.items
        .filter((item) => item.cadence === cadence)
        .map(
          (item): QuestProgressItem => ({
            ...item,
            description: '',
            progress_percent: item.target > 0 ? Math.min(100, Math.round((item.progress / item.target) * 100)) : 0,
            remaining: Math.max(0, item.target - item.progress),
            reset_at: null,
            xp_reward: 0,
            points_reward: 0,
            icon: '',
          })
        ),
    ])
  ) as Record<(typeof QUEST_CADENCE_ORDER)[number], QuestProgressItem[]>;
  const questSummary = questProgress?.summary ?? data.quest_summary;

  const resolveResetLabel = (resetAt: string | null): string | null => {
    if (!resetAt) return null;

    const diffMs = new Date(resetAt).getTime() - Date.now();
    if (diffMs <= 0) {
      return t('questResetsSoon');
    }

    const diffMinutes = Math.ceil(diffMs / 60_000);
    if (diffMinutes < 60) {
      return relativeTime.format(diffMinutes, 'minute');
    }

    const diffHours = Math.ceil(diffMs / 3_600_000);
    if (diffHours < 48) {
      return relativeTime.format(diffHours, 'hour');
    }

    const diffDays = Math.ceil(diffMs / 86_400_000);
    return relativeTime.format(diffDays, 'day');
  };

  const resolveQuestTitle = (quest: QuestProgressItem): string => {
    const key = `questCopy.${quest.id}.title` as any;
    const result = t(key);
    // t() returns full namespace path on miss (e.g. "Gamification.questCopy.<uuid>.title")
    // Detect miss by checking if the result contains the quest UUID
    return result.includes(quest.id) ? quest.title : result;
  };

  const resolveQuestDescription = (quest: QuestProgressItem): string => {
    const key = `questCopy.${quest.id}.description` as any;
    const result = t(key);
    return result.includes(quest.id) ? (quest.description || '') : result;
  };

  const achievementsUnlocked = data.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6" data-testid="progression-shell">
      {/* Header */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            {t('viewLeaderboard')}
          </Link>
        </div>

        {sourceContext && (
          <div
            className="mt-4 rounded-lg border border-organic-orange/30 bg-organic-orange/5 px-3 py-2"
            data-testid="progression-source-context"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">
                {t('questSourceContext', { source: t(`questSourceNames.${sourceContext}`) })}
              </p>
              <Link
                href={SOURCE_CONTEXT_HREF[sourceContext]}
                className="inline-flex items-center gap-1 text-xs font-medium text-organic-orange hover:text-orange-600"
              >
                {t('questSourceCta', { source: t(`questSourceNames.${sourceContext}`) })}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Overview cards */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="progression-overview-cards"
      >
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('levelCard')}
          </p>
          <div className="mt-2">
            <LevelBadge level={data.level} size="md" />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('xpToNextCard')}
          </p>
          <p className="mt-2 text-2xl font-mono font-bold text-foreground tabular-nums">
            {data.level_progress.xp_to_next_level.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{tReputation('xp')}</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('streakCard')}
          </p>
          <div className="mt-2">
            <StreakDisplay streak={data.current_streak} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('claimablePointsCard')}
          </p>
          <p className="mt-2 text-2xl font-mono font-bold text-foreground tabular-nums">
            {data.rewards.claimable_points.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('totalPointsLine', { points: data.total_points.toLocaleString() })}
          </p>
        </article>
      </section>

      {/* Next level progress */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-organic-orange" />
          <h2 className="text-sm font-semibold text-foreground">{t('nextLevelTitle')}</h2>
        </div>
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            {data.level_progress.is_max_level
              ? tReputation('maxLevel')
              : t('nextLevelBody', { level: data.level + 1 })}
          </p>
        </div>
        <XpProgressBar xpTotal={data.xp_total} level={data.level} />
      </section>

      {/* ── Timeline Quests ── */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6" data-testid="progression-quests-section">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-foreground">{t('questsTitle')}</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          {questSummary.total > 0
            ? t('questsSummary', { completed: questSummary.completed, total: questSummary.total })
            : t('questsEmpty')}
        </p>
        {isQuestError && (
          <p className="mt-1 text-xs text-amber-700">{t('questsFallbackNotice')}</p>
        )}

        {/* Timeline cadence sections */}
        <div className="mt-6 space-y-8">
          {QUEST_CADENCE_ORDER.map((cadence) => {
            const cadenceObjectives = objectives[cadence];
            const cadenceCompleted = cadenceObjectives.filter((quest) => quest.completed).length;
            const colors = CADENCE_COLORS[cadence];

            return (
              <div key={cadence} data-testid={`progression-quests-${cadence}`}>
                {/* Full-width cadence divider header */}
                <div className={`-mx-5 sm:-mx-6 px-5 sm:px-6 py-3 ${colors.bg} border-y border-border mb-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                      {t(`questCadences.${cadence}`)}
                    </h3>
                    <span className="text-xs font-mono font-medium text-muted-foreground tabular-nums">
                      {t('questCadenceProgress', {
                        completed: cadenceCompleted,
                        total: cadenceObjectives.length,
                      })}
                    </span>
                  </div>
                </div>

                {/* Timeline line with quest cards */}
                {isQuestLoading && !questProgress ? (
                  <div className="space-y-2 animate-pulse pl-6">
                    <div className="h-4 rounded bg-muted" />
                    <div className="h-4 rounded bg-muted" />
                  </div>
                ) : cadenceObjectives.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">{t('questCadenceEmpty')}</p>
                ) : (
                  <div className={`relative border-l-2 ${colors.border} ml-3 pl-6 space-y-4`}>
                    {cadenceObjectives.map((quest) => {
                      const cta = quest.completed ? null : QUEST_CTA_MAP[quest.id] ?? QUEST_FALLBACK_CTA;
                      const resetLabel = resolveResetLabel(quest.reset_at);
                      const questTitle = resolveQuestTitle(quest);
                      const questDescription = resolveQuestDescription(quest);

                      return (
                        <div
                          key={quest.id}
                          className="relative rounded-xl border border-border bg-card p-4"
                          data-testid={`progression-quest-card-${quest.id}`}
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-[calc(1.5rem+5px)] top-5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                              quest.completed ? 'bg-emerald-500' : 'bg-organic-orange'
                            }`}
                          />

                          <div className="flex items-start gap-4">
                            {/* Progress ring */}
                            <ProgressRing
                              percent={quest.progress_percent}
                              completed={quest.completed}
                              size={48}
                              strokeWidth={4}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{questTitle}</p>
                                  {questDescription && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{questDescription}</p>
                                  )}
                                </div>
                                {quest.completed && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 flex-shrink-0">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('questCompleted')}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-mono tabular-nums">
                                  {t('questProgressCounter', {
                                    progress: quest.progress,
                                    target: quest.target,
                                  })}
                                </span>
                                {!quest.completed && (
                                  <span>{t('questRemaining', { remaining: quest.remaining })}</span>
                                )}
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                {resetLabel ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarClock className="h-3 w-3" />
                                    {t('questResetsLabel', { time: resetLabel })}
                                  </span>
                                ) : (
                                  <span />
                                )}

                                {cta && (
                                  <Link
                                    href={cta.href}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-organic-orange hover:text-orange-600"
                                  >
                                    {t(cta.labelKey)}
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Achievements with count heading ── */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6" data-testid="progression-achievements-section">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {t('achievementsHeading', {
            unlocked: achievementsUnlocked,
            total: data.achievements.length,
          })}
        </h2>
        <AchievementGrid achievements={data.achievements} />
      </section>

      {/* Rewards readiness */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-foreground">{t('rewardsReadinessTitle')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {pointsRemaining === 0
            ? t('rewardsReady')
            : t('rewardsNotReady', { points: pointsRemaining.toLocaleString() })}
        </p>
        <Link
          href="/rewards"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-organic-orange hover:text-orange-600"
        >
          {t('openRewards')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Recent XP */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6" data-testid="progression-activity-section">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('recentXpTitle')}</h2>
        <XpHistory events={data.recent_xp_events} />
      </section>
    </div>
  );
}
