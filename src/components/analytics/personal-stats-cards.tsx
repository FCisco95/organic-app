'use client';

import { useTranslations } from 'next-intl';
import { Zap, Flame, Trophy, Coins, CheckCircle2, Star } from 'lucide-react';
import type { PersonalStats } from '@/features/analytics/personal-types';
import { cn } from '@/lib/utils';

interface PersonalStatsCardsProps {
  stats: PersonalStats | undefined;
  loading: boolean;
}

const STAT_CARDS = [
  { key: 'xp', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { key: 'level', icon: Star, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { key: 'streak', icon: Flame, color: 'text-organic-terracotta', bg: 'bg-organic-terracotta-lightest dark:bg-organic-terracotta-lightest0/10' },
  { key: 'points', icon: Coins, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'tasks', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { key: 'achievements', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
] as const;

function getStatValue(key: string, stats: PersonalStats): { value: string; label: string } {
  switch (key) {
    case 'xp':
      return { value: stats.xp_total.toLocaleString(), label: 'totalXp' };
    case 'level':
      return { value: String(stats.level), label: 'level' };
    case 'streak':
      return {
        value: `${stats.current_streak}d`,
        label: 'currentStreak',
      };
    case 'points':
      return { value: stats.claimable_points.toLocaleString(), label: 'claimablePoints' };
    case 'tasks':
      return { value: stats.tasks_completed.toLocaleString(), label: 'tasksCompleted' };
    case 'achievements':
      return {
        value: `${stats.longest_streak}d`,
        label: 'longestStreak',
      };
    default:
      return { value: '—', label: key };
  }
}

export function PersonalStatsCards({ stats, loading }: PersonalStatsCardsProps) {
  const t = useTranslations('Analytics.personal');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const stat = stats ? getStatValue(card.key, stats) : null;

        return (
          <div
            key={card.key}
            className="rounded-xl bg-white dark:bg-card ring-1 ring-border p-4 flex flex-col items-center text-center gap-2"
          >
            <div className={cn('rounded-lg p-2', card.bg)}>
              <Icon className={cn('h-4 w-4', card.color)} />
            </div>
            {loading ? (
              <div className="h-7 w-16 rounded bg-muted animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-foreground">{stat?.value ?? '—'}</p>
            )}
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t(stat?.label ?? card.key)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
