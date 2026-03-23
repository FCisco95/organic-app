'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface IdeaKpiCardProps {
  label: string;
  value: string | number;
  trend?: number;
  barPercent?: number;
  barColor?: string;
  isLoading?: boolean;
}

export function IdeaKpiCard({
  label,
  value,
  trend,
  barPercent = 0,
  barColor = 'bg-organic-terracotta',
  isLoading,
}: IdeaKpiCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="mb-3 h-8 w-16" />
        <Skeleton className="h-1 w-full" />
      </div>
    );
  }

  const trendDirection =
    trend === undefined || trend === 0
      ? 'neutral'
      : trend > 0
        ? 'positive'
        : 'negative';

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold text-foreground">
          {value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'font-mono text-xs font-semibold',
              trendDirection === 'positive' && 'text-emerald-600',
              trendDirection === 'negative' && 'text-red-500'
            )}
          >
            {trendDirection === 'positive' ? '\u25B2' : '\u25BC'}{' '}
            {trendDirection === 'positive' ? '+' : ''}
            {trend}%
          </span>
        )}
        {trendDirection === 'neutral' && trend !== undefined && (
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            &mdash; 0%
          </span>
        )}
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }}
        />
      </div>
    </div>
  );
}
