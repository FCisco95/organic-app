'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { usePresence } from '@/features/dashboard/hooks';

interface LiveIndicatorProps {
  className?: string;
}

function formatRelativeMinutes(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '—';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LiveIndicator({ className }: LiveIndicatorProps) {
  const t = useTranslations('Dashboard.masthead');
  const { data, isLoading } = usePresence();

  const lastActivityText = useMemo(
    () => formatRelativeMinutes(data?.lastActivityAt ?? null),
    [data?.lastActivityAt]
  );

  if (isLoading || !data) {
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className ?? ''}`}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="h-3 w-32 animate-pulse rounded bg-muted/60" />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium text-foreground/80">
        {t('liveNow', { count: data.activeCount })}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span>{t('lastActivity', { when: lastActivityText })}</span>
    </div>
  );
}
