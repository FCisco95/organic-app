'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUALITY_SCORE_LABELS } from '@/features/tasks';

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
  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5">
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
      {showLabel && value > 0 && (
        <span className="text-sm text-gray-600">{QUALITY_SCORE_LABELS[value]}</span>
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
