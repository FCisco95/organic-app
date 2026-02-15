'use client';

import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getStreakColor } from '@/features/reputation';

interface StreakDisplayProps {
  streak: number;
  showLabel?: boolean;
  className?: string;
}

export function StreakDisplay({ streak, showLabel = true, className }: StreakDisplayProps) {
  const t = useTranslations('Reputation');
  const color = getStreakColor(streak);

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Flame className={cn('w-4 h-4', color)} />
      <span className={cn('text-sm font-medium', color)}>
        {streak}
      </span>
      {showLabel && (
        <span className="text-xs text-gray-400">
          {streak > 0 ? t('daysStreak', { count: streak }) : t('noStreak')}
        </span>
      )}
    </span>
  );
}
