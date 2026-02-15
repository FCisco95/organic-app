'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { XpEvent } from '@/features/reputation';
import { formatXp } from '@/features/reputation';

interface XpHistoryProps {
  events: XpEvent[];
  className?: string;
}

export function XpHistory({ events, className }: XpHistoryProps) {
  const t = useTranslations('Reputation');

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        {t('noXpYet')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-700">
              {t(`xpSources.${event.event_type}` as Parameters<typeof t>[0])}
            </p>
            <p className="text-[11px] text-gray-400">
              {new Date(event.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className="text-sm font-semibold text-green-600">
            +{formatXp(event.xp_amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
