'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Info } from 'lucide-react';
import { useGamificationOverview } from '@/features/gamification/hooks';
import { useBurnCost } from '@/features/gamification/hooks';
import { LevelBadge } from '@/components/reputation/level-badge';
import { QuestProgressRing } from './quest-progress-ring';
import { BurnConfirmDialog } from './burn-confirm-dialog';
import { cn } from '@/lib/utils';

export function QuestLevelSidebar() {
  const t = useTranslations('Quests');
  const { data: overview, isLoading } = useGamificationOverview();
  const { data: burnCost } = useBurnCost();
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);

  if (isLoading || !overview) {
    return (
      <div className="w-full lg:w-[280px] shrink-0">
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-4">
          <div className="h-16 w-16 bg-muted rounded-full mx-auto" />
          <div className="h-5 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-2 bg-muted rounded" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const { level_progress, rewards } = overview;
  const xpPercent = level_progress.is_max_level ? 100 : level_progress.progress_percent;

  return (
    <>
      <div className="w-full lg:w-[280px] shrink-0">
        <div className="rounded-xl border border-border bg-card p-5 sticky top-20">
          {/* Level ring with number */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <QuestProgressRing
              percent={xpPercent}
              size={64}
              strokeWidth={5}
              color="hsl(var(--organic-orange, 24.6 95% 53.1%))"
            >
              <span className="text-lg font-bold text-foreground">{overview.level}</span>
            </QuestProgressRing>

            <LevelBadge level={overview.level} size="md" />
          </div>

          {/* Points Holding */}
          <div className="text-center mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t('pointsHolding')}
            </p>
            <p className="text-xl font-bold text-foreground font-mono tabular-nums">
              {(rewards.claimable_points ?? 0).toLocaleString()}
            </p>
          </div>

          {/* XP Progress text */}
          {!level_progress.is_max_level && (
            <p className="text-center text-xs text-muted-foreground font-mono tabular-nums mb-4">
              {overview.xp_total.toLocaleString()} / {level_progress.xp_for_next_level.toLocaleString()} XP
            </p>
          )}

          {/* Streak */}
          {overview.current_streak > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Flame className={cn(
                'h-5 w-5 text-orange-500',
                overview.current_streak > 0 && 'animate-pulse'
              )} />
              <span>
                {t('streakLabel', { days: overview.current_streak })}
              </span>
            </div>
          )}

          {/* Burn Button or Auto-level info */}
          {burnCost?.can_burn ? (
            <button
              onClick={() => setBurnDialogOpen(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-organic-orange text-white text-sm font-semibold transition-colors hover:bg-orange-600"
            >
              {t('burnButton')}
            </button>
          ) : burnCost && burnCost.leveling_mode === 'auto' ? (
            <div className="rounded-lg bg-muted border border-border p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t('autoLevelHint')}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <BurnConfirmDialog
        open={burnDialogOpen}
        onOpenChange={setBurnDialogOpen}
      />
    </>
  );
}
