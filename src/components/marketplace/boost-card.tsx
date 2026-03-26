'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Coins, Users, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoostRequest } from '@/features/marketplace/types';

interface BoostCardProps {
  boost: BoostRequest;
  isOwner?: boolean;
  onEngage?: (boostId: string) => void;
  onCancel?: (boostId: string) => void;
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h`;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
};

export function BoostCard({ boost, isOwner, onEngage, onCancel }: BoostCardProps) {
  const t = useTranslations('Marketplace');
  const progress = boost.max_engagements > 0
    ? Math.round((boost.current_engagements / boost.max_engagements) * 100)
    : 0;

  return (
    <div className="rounded-xl bg-white dark:bg-card ring-1 ring-gray-200/70 dark:ring-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                STATUS_COLORS[boost.status] ?? STATUS_COLORS.pending
              )}
            >
              {t(`status.${boost.status}`)}
            </span>
            {boost.author_name && (
              <span className="text-xs text-muted-foreground truncate">
                {boost.author_name}
              </span>
            )}
          </div>
          <a
            href={boost.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:text-orange-600 dark:hover:text-orange-400 inline-flex items-center gap-1.5 font-medium"
          >
            {t('viewTweet')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          {boost.points_offered} {t('points')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          {boost.current_engagements}/{boost.max_engagements}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          {getTimeLeft(boost.expires_at)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {boost.status === 'active' && !isOwner && onEngage && (
          <button
            onClick={() => onEngage(boost.id)}
            className="flex-1 rounded-lg bg-orange-500 text-white text-sm font-medium py-2 hover:bg-orange-600 transition-colors"
          >
            {t('engage')}
          </button>
        )}
        {isOwner && (boost.status === 'active' || boost.status === 'pending') && onCancel && (
          <button
            onClick={() => onCancel(boost.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border text-sm font-medium px-3 py-2 hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
