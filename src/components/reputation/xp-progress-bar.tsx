'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getLevelInfo, getXpProgress, getXpRemaining } from '@/features/reputation';
import { formatXp } from '@/features/reputation';

interface XpProgressBarProps {
  xpTotal: number;
  level: number;
  showLabel?: boolean;
  className?: string;
}

export function XpProgressBar({ xpTotal, level, showLabel = true, className }: XpProgressBarProps) {
  const t = useTranslations('Reputation');
  const info = getLevelInfo(level);
  const percent = getXpProgress(xpTotal, level);
  const remaining = getXpRemaining(xpTotal, level);
  const isMax = level >= 11;

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">
            {t('xpTotal', { xp: formatXp(xpTotal) })}
          </span>
          <span className="text-xs text-gray-400">
            {isMax ? t('maxLevel') : t('xpToNext', { xp: formatXp(remaining) })}
          </span>
        </div>
      )}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: info.color,
          }}
        />
      </div>
    </div>
  );
}
