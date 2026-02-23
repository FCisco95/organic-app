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
import type { QuestCadence, QuestProgressItem } from '@/features/gamification';
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
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-40 rounded-2xl bg-gray-200" />
        <div className="h-64 rounded-2xl bg-gray-200" />
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
  const fallbackObjectives = {
    daily: data.quest_summary.items
      .filter((item) => item.cadence === 'daily')
      .map(
        (item): QuestProgressItem => ({
          ...item,
          description: '',
          progress_percent: item.target > 0 ? Math.min(100, Math.round((item.progress / item.target) * 100)) : 0,
          remaining: Math.max(0, item.target - item.progress),
          reset_at: null,
          xp_reward: 0,
          points_reward: 0,
          icon: '🎯',
        })
      ),
    weekly: data.quest_summary.items
      .filter((item) => item.cadence === 'weekly')
      .map(
        (item): QuestProgressItem => ({
          ...item,
          description: '',
          progress_percent: item.target > 0 ? Math.min(100, Math.round((item.progress / item.target) * 100)) : 0,
          remaining: Math.max(0, item.target - item.progress),
          reset_at: null,
          xp_reward: 0,
          points_reward: 0,
          icon: '🎯',
        })
      ),
    long_term: data.quest_summary.items
      .filter((item) => item.cadence === 'long_term')
      .map(
        (item): QuestProgressItem => ({
          ...item,
          description: '',
          progress_percent: item.target > 0 ? Math.min(100, Math.round((item.progress / item.target) * 100)) : 0,
          remaining: Math.max(0, item.target - item.progress),
          reset_at: null,
          xp_reward: 0,
          points_reward: 0,
          icon: '🎯',
        })
      ),
  };

  const objectives = questProgress?.objectives ?? fallbackObjectives;
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
    try {
      return t(`questCopy.${quest.id}.title`);
    } catch {
      return quest.title;
    }
  };

  const resolveQuestDescription = (quest: QuestProgressItem): string => {
    try {
      return t(`questCopy.${quest.id}.description`);
    } catch {
      return quest.description || '';
    }
  };

  return (
    <div className="space-y-6" data-testid="progression-shell">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
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
              <p className="text-xs font-medium text-gray-700">
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

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="progression-overview-cards"
      >
        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {t('levelCard')}
          </p>
          <div className="mt-2">
            <LevelBadge level={data.level} size="md" />
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {t('xpToNextCard')}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {data.level_progress.xp_to_next_level.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-500">{tReputation('xp')}</p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {t('streakCard')}
          </p>
          <div className="mt-2">
            <StreakDisplay streak={data.current_streak} />
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {t('claimablePointsCard')}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {data.rewards.claimable_points.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('totalPointsLine', { points: data.total_points.toLocaleString() })}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-organic-orange" />
          <h2 className="text-sm font-semibold text-gray-900">{t('nextLevelTitle')}</h2>
        </div>
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            {data.level_progress.is_max_level
              ? tReputation('maxLevel')
              : t('nextLevelBody', { level: data.level + 1 })}
          </p>
        </div>
        <XpProgressBar xpTotal={data.xp_total} level={data.level} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" data-testid="progression-quests-section">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-900">{t('questsTitle')}</h2>
        </div>

        <p className="text-sm text-gray-600">
          {questSummary.total > 0
            ? t('questsSummary', { completed: questSummary.completed, total: questSummary.total })
            : t('questsEmpty')}
        </p>
        {isQuestError && (
          <p className="mt-1 text-xs text-amber-700">{t('questsFallbackNotice')}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {QUEST_CADENCE_ORDER.map((cadence) => {
            const cadenceObjectives = objectives[cadence];
            const cadenceCompleted = cadenceObjectives.filter((quest) => quest.completed).length;

            return (
              <article
                key={cadence}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                data-testid={`progression-quests-${cadence}`}
              >
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {t(`questCadences.${cadence}`)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {t('questCadenceProgress', {
                      completed: cadenceCompleted,
                      total: cadenceObjectives.length,
                    })}
                  </p>
                </div>

                {isQuestLoading && !questProgress ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 rounded bg-gray-200" />
                    <div className="h-4 rounded bg-gray-200" />
                  </div>
                ) : cadenceObjectives.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('questCadenceEmpty')}</p>
                ) : (
                  <ul className="space-y-3">
                    {cadenceObjectives.map((quest) => {
                      const cta = quest.completed ? null : QUEST_CTA_MAP[quest.id] ?? QUEST_FALLBACK_CTA;
                      const resetLabel = resolveResetLabel(quest.reset_at);
                      const questTitle = resolveQuestTitle(quest);
                      const questDescription = resolveQuestDescription(quest);

                      return (
                        <li
                          key={quest.id}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                          data-testid={`progression-quest-card-${quest.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{questTitle}</p>
                              {questDescription && (
                                <p className="mt-1 text-xs text-gray-600">{questDescription}</p>
                              )}
                            </div>
                            {quest.completed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('questCompleted')}
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <div className="h-1.5 rounded-full bg-gray-200">
                              <div
                                className={`h-1.5 rounded-full ${quest.completed ? 'bg-emerald-500' : 'bg-organic-orange'}`}
                                style={{ width: `${quest.progress_percent}%` }}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                              <span>
                                {t('questProgressCounter', {
                                  progress: quest.progress,
                                  target: quest.target,
                                })}
                              </span>
                              {!quest.completed && (
                                <span>{t('questRemaining', { remaining: quest.remaining })}</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            {resetLabel ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" data-testid="progression-achievements-section">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">{tReputation('achievements')}</h2>
        <AchievementGrid achievements={data.achievements} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">{t('rewardsReadinessTitle')}</h2>
        </div>
        <p className="text-sm text-gray-600">
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" data-testid="progression-activity-section">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('recentXpTitle')}</h2>
        <XpHistory events={data.recent_xp_events} />
      </section>
    </div>
  );
}
