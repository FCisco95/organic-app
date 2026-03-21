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
import { cn } from '@/lib/utils';

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

const CADENCE_DOT_COLOR: Record<QuestCadence, string> = {
  daily: 'bg-blue-400',
  weekly: 'bg-purple-400',
  long_term: 'bg-amber-400',
};

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
      <div className="space-y-3 animate-pulse" data-testid="progression-shell-loading">
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4" data-testid="progression-shell-error">
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
          icon: '',
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
          icon: '',
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
          icon: '',
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
    const key = `questCopy.${quest.id}.title` as any;
    const result = t(key);
    // t() returns full namespace path on miss (e.g. "Gamification.questCopy.<uuid>.title")
    // Detect miss by checking if the result contains the quest UUID
    return result.includes(quest.id) ? quest.title : result;
  };

  // Flatten all quests into a single sorted list for the table view
  const allQuests: (QuestProgressItem & { cadence: QuestCadence })[] = QUEST_CADENCE_ORDER.flatMap(
    (cadence) =>
      objectives[cadence].map((q) => ({ ...q, cadence: cadence as QuestCadence }))
  );

  return (
    <div className="space-y-4" data-testid="progression-shell">
      {/* ===== HEADER with leaderboard link ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          {t('viewLeaderboard')}
        </Link>
      </div>

      {sourceContext && (
        <div
          className="rounded-lg border border-organic-orange/30 bg-organic-orange/5 px-3 py-2"
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

      {/* ===== COMPACT STAT BAR — single horizontal strip ===== */}
      <div
        className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-0 overflow-x-auto"
        data-testid="progression-overview-cards"
      >
        {/* Level */}
        <div className="flex items-center gap-2 pr-4 border-r border-border flex-shrink-0">
          <LevelBadge level={data.level} size="md" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('levelCard')}</p>
          </div>
        </div>

        {/* XP to next */}
        <div className="px-4 border-r border-border flex-shrink-0 text-center">
          <p className="text-lg font-bold font-mono tabular-nums text-foreground leading-none">
            {data.level_progress.xp_to_next_level.toLocaleString()}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('xpToNextCard')}</p>
        </div>

        {/* Streak */}
        <div className="px-4 border-r border-border flex-shrink-0">
          <StreakDisplay streak={data.current_streak} />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('streakCard')}</p>
        </div>

        {/* Claimable points */}
        <div className="px-4 flex-shrink-0 text-center">
          <p className="text-lg font-bold font-mono tabular-nums text-foreground leading-none">
            {data.rewards.claimable_points.toLocaleString()}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('claimablePointsCard')}</p>
          <p className="text-[10px] text-muted-foreground/70">{t('totalPointsLine', { points: data.total_points.toLocaleString() })}</p>
        </div>
      </div>

      {/* ===== XP PROGRESS ===== */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-organic-orange" />
          <h2 className="text-sm font-semibold text-foreground">{t('nextLevelTitle')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {data.level_progress.is_max_level
            ? tReputation('maxLevel')
            : t('nextLevelBody', { level: data.level + 1 })}
        </p>
        <XpProgressBar xpTotal={data.xp_total} level={data.level} />
      </section>

      {/* ===== QUEST TABLE — dense tabular view ===== */}
      <section className="rounded-xl border border-border bg-card p-4" data-testid="progression-quests-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-foreground">{t('questsTitle')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {questSummary.total > 0
              ? t('questsSummary', { completed: questSummary.completed, total: questSummary.total })
              : t('questsEmpty')}
          </p>
        </div>
        {isQuestError && (
          <p className="text-xs text-amber-700 mb-2">{t('questsFallbackNotice')}</p>
        )}

        {isQuestLoading && !questProgress ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
          </div>
        ) : allQuests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{t('questCadenceEmpty')}</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2 pr-3">{t('questTableName')}</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2 pr-3 hidden sm:table-cell">{t('questTableCadence')}</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2 pr-3 w-32">{t('questTableProgress')}</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2 pr-3">{t('questTableStatus')}</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2 text-right">{t('questTableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {allQuests.map((quest) => {
                  const cta = quest.completed ? null : QUEST_CTA_MAP[quest.id] ?? QUEST_FALLBACK_CTA;
                  const resetLabel = resolveResetLabel(quest.reset_at);
                  const questTitle = resolveQuestTitle(quest);

                  return (
                    <tr
                      key={quest.id}
                      className="border-b border-border/50 last:border-0"
                      data-testid={`progression-quest-card-${quest.id}`}
                    >
                      {/* Quest name */}
                      <td className="py-2 pr-3">
                        <p className="text-sm font-medium text-foreground leading-tight">{questTitle}</p>
                        {resetLabel && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                            <CalendarClock className="h-2.5 w-2.5" />
                            {t('questResetsLabel', { time: resetLabel })}
                          </span>
                        )}
                      </td>

                      {/* Cadence badge */}
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn('w-1.5 h-1.5 rounded-full', CADENCE_DOT_COLOR[quest.cadence])} />
                          {t(`questCadences.${quest.cadence}`)}
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="py-2 pr-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-muted flex-1">
                            <div
                              className={cn(
                                'h-1.5 rounded-full transition-all',
                                quest.completed ? 'bg-emerald-500' : 'bg-organic-orange'
                              )}
                              style={{ width: `${quest.progress_percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                            {quest.progress}/{quest.target}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 pr-3">
                        {quest.completed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {t('questCompleted')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {t('questRemaining', { remaining: quest.remaining })}
                          </span>
                        )}
                      </td>

                      {/* CTA */}
                      <td className="py-2 text-right">
                        {cta && (
                          <Link
                            href={cta.href}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-organic-orange hover:text-orange-600"
                          >
                            {t(cta.labelKey)}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== ACHIEVEMENT GRID — 4-column on desktop ===== */}
      <section className="rounded-xl border border-border bg-card p-4" data-testid="progression-achievements-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">{tReputation('achievements')}</h2>
        <div className="[&>div]:grid-cols-2 [&>div]:sm:grid-cols-3 [&>div]:lg:grid-cols-4">
          <AchievementGrid achievements={data.achievements} />
        </div>
      </section>

      {/* ===== REWARDS READINESS — compact ===== */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-foreground">{t('rewardsReadinessTitle')}</h2>
          </div>
          <Link
            href="/rewards"
            className="inline-flex items-center gap-1 text-xs font-medium text-organic-orange hover:text-orange-600"
          >
            {t('openRewards')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {pointsRemaining === 0
            ? t('rewardsReady')
            : t('rewardsNotReady', { points: pointsRemaining.toLocaleString() })}
        </p>
      </section>

      {/* ===== RECENT XP ===== */}
      <section className="rounded-xl border border-border bg-card p-4" data-testid="progression-activity-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">{t('recentXpTitle')}</h2>
        <XpHistory events={data.recent_xp_events} />
      </section>
    </div>
  );
}
