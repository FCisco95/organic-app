'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { useReputation } from '@/features/reputation';
import { formatXp } from '@/features/reputation';
import { LevelBadge } from './level-badge';
import { XpProgressBar } from './xp-progress-bar';
import { StreakDisplay } from './streak-display';

interface ReputationSummaryProps {
  className?: string;
}

export function ReputationSummary({ className }: ReputationSummaryProps) {
  const t = useTranslations('Reputation');
  const { data, isLoading } = useReputation();

  if (isLoading) {
    return (
      <div className={className}>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-20 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-32 mb-2" />
          <div className="h-2 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={className}>
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
            {t('title')}
          </p>
          <LevelBadge level={data.level} size="md" />
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-gray-900">{formatXp(data.xp_total)}</span>
          <span className="text-sm text-gray-400">{t('xp')}</span>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {t('pointsSecondary', { points: data.total_points })}
        </p>

        <XpProgressBar xpTotal={data.xp_total} level={data.level} />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <StreakDisplay streak={data.current_streak} showLabel={false} />
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {t('achievementsUnlocked', { count: data.achievement_count })}
          </span>
        </div>

        <p className="mt-3 text-[11px] text-gray-400">{t('leaderboardPriorityHint')}</p>
      </div>
    </div>
  );
}
