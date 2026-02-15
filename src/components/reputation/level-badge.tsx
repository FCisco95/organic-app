'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getLevelInfo } from '@/features/reputation';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = 'sm', showName = true, className }: LevelBadgeProps) {
  const t = useTranslations('Reputation');
  const info = getLevelInfo(level);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${info.color}18`,
        color: info.color,
        border: `1px solid ${info.color}30`,
      }}
    >
      <span className="font-bold">{info.level}</span>
      {showName && <span>{t(`levels.${info.level}`)}</span>}
    </span>
  );
}
