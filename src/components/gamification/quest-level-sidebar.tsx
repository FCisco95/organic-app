'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Flame } from 'lucide-react';
import { useGamificationOverview } from '@/features/gamification/hooks';
import { useBurnCost } from '@/features/gamification/hooks';
import { LevelBadge } from '@/components/reputation/level-badge';
import { XpProgressBar } from '@/components/reputation/xp-progress-bar';
import { BurnConfirmDialog } from './burn-confirm-dialog';

export function QuestLevelSidebar() {
  const t = useTranslations('Quests');
  const { data: overview, isLoading } = useGamificationOverview();
  const { data: burnCost } = useBurnCost();
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);

  if (isLoading || !overview) {
    return (
      <div className="w-full lg:w-[280px] shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse space-y-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
          <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-2 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const { level_progress, rewards } = overview;

  return (
    <>
      <div className="w-full lg:w-[280px] shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white p-5 sticky top-20">
          {/* Star icon + Level badge */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                <Star className="h-8 w-8 text-organic-orange" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <LevelBadge level={overview.level} size="sm" showName={false} />
              </div>
            </div>

            <LevelBadge level={overview.level} size="md" />
          </div>

          {/* Points Holding */}
          <div className="text-center mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase">
              {t('pointsHolding')}
            </p>
            <p className="text-xl font-bold text-gray-900 font-mono tabular-nums">
              {(rewards.claimable_points ?? 0).toLocaleString()}
            </p>
          </div>

          {/* XP Progress */}
          <XpProgressBar
            xpTotal={overview.xp_total}
            level={overview.level}
            className="mb-2"
          />

          {!level_progress.is_max_level && (
            <p className="text-center text-xs text-gray-400 font-mono tabular-nums mb-4">
              {overview.xp_total.toLocaleString()} / {level_progress.xp_for_next_level.toLocaleString()}
            </p>
          )}

          {/* Streak */}
          {overview.current_streak > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 mb-4">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>
                {t('streakLabel', { days: overview.current_streak })}
              </span>
            </div>
          )}

          {/* Burn Button */}
          <button
            onClick={() => setBurnDialogOpen(true)}
            disabled={!burnCost?.can_burn}
            className="w-full py-2.5 px-4 rounded-lg bg-organic-orange text-white text-sm font-semibold transition-colors hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('burnButton')}
          </button>

          {burnCost && !burnCost.can_burn && burnCost.leveling_mode === 'auto' && (
            <p className="text-xs text-gray-400 text-center mt-2">
              {t('autoLevelHint')}
            </p>
          )}
        </div>
      </div>

      <BurnConfirmDialog
        open={burnDialogOpen}
        onOpenChange={setBurnDialogOpen}
      />
    </>
  );
}
