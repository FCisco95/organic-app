'use client';

import { useTranslations } from 'next-intl';
import { useBurnCost, useBurnPoints } from '@/features/gamification/hooks';
import { getLevelInfo } from '@/features/reputation';
import toast from 'react-hot-toast';
import { X, Flame } from 'lucide-react';

interface BurnConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BurnConfirmDialog({ open, onOpenChange }: BurnConfirmDialogProps) {
  const t = useTranslations('Quests');
  const { data: burnCost } = useBurnCost();
  const burnMutation = useBurnPoints();

  if (!open || !burnCost) return null;

  const currentInfo = getLevelInfo(burnCost.current_level);
  const nextInfo = getLevelInfo(burnCost.next_level);

  const handleBurn = async () => {
    try {
      await burnMutation.mutateAsync();
      toast.success(t('burnSuccess', { level: burnCost.next_level }));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('burnFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-organic-terracotta-lightest0/10 flex items-center justify-center mx-auto mb-3">
            <Flame className="h-6 w-6 text-organic-terracotta" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{t('burnDialogTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('burnDialogDescription')}</p>
        </div>

        {/* Level transition */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">{t('fromLevel')}</p>
            <div
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: `${currentInfo.color}18`,
                color: currentInfo.color,
                border: `1px solid ${currentInfo.color}30`,
              }}
            >
              {burnCost.current_level}
            </div>
          </div>
          <span className="text-muted-foreground text-lg">&rarr;</span>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">{t('toLevel')}</p>
            <div
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: `${nextInfo.color}18`,
                color: nextInfo.color,
                border: `1px solid ${nextInfo.color}30`,
              }}
            >
              {burnCost.next_level}
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="rounded-lg bg-muted border border-border p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('burnCost')}</span>
            <span className="font-semibold text-foreground font-mono tabular-nums">
              {burnCost.points_cost.toLocaleString()} pts
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('availablePoints')}</span>
            <span className="font-semibold text-foreground font-mono tabular-nums">
              {burnCost.available_points.toLocaleString()} pts
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{t('afterBurn')}</span>
            <span className="font-semibold text-foreground font-mono tabular-nums">
              {(burnCost.available_points - burnCost.points_cost).toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleBurn}
            disabled={burnMutation.isPending || !burnCost.can_burn}
            className="flex-1 py-2.5 px-4 rounded-lg bg-cta text-cta-fg text-sm font-semibold hover:bg-cta-hover transition-colors disabled:opacity-50"
          >
            {burnMutation.isPending ? t('burning') : t('confirmBurn')}
          </button>
        </div>
      </div>
    </div>
  );
}
