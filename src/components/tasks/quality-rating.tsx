'use client';

import { Star, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface QualityRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function QualityRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
  className,
}: QualityRatingProps) {
  const t = useTranslations('Tasks.qualityScores');

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      // Clicking the same star again toggles to 0
      onChange(rating === value ? 0 : rating);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5">
        {value === 0 && !readonly && (
          <Ban className={cn(sizeClasses[size], 'text-red-400 mr-1')} />
        )}
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            disabled={readonly}
            className={cn(
              'transition-colors',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                star <= value ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && (
        <span className={cn('text-sm', value === 0 ? 'text-red-500 font-medium' : 'text-gray-600')}>
          {t(String(value))}
        </span>
      )}
    </div>
  );
}

interface QualityScoreDisplayProps {
  score: number;
  earnedPoints?: number;
  basePoints?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QualityScoreDisplay({
  score,
  earnedPoints,
  basePoints,
  size = 'md',
  className,
}: QualityScoreDisplayProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <QualityRating value={score} readonly size={size} showLabel />
      {earnedPoints !== undefined && basePoints !== undefined && (
        <span className="text-sm text-gray-500">
          ({earnedPoints} / {basePoints} pts)
        </span>
      )}
    </div>
  );
}
