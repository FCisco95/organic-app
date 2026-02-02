'use client';

import { useActivityFeed } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { ActivityItem } from './activity-item';

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();
  const t = useTranslations('dashboard.activity');

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
        {!isLoading && events && events.length > 0 && (
          <span className="text-[11px] font-medium text-gray-300">
            {events.length} events
          </span>
        )}
      </div>

      {isLoading && (
        <div className="px-6 py-3 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="h-7 w-7 rounded-lg bg-gray-50 animate-pulse" />
              <div className="flex-1 h-3.5 rounded-md bg-gray-50 animate-pulse" />
              <div className="w-7 h-3 rounded bg-gray-50 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm text-gray-400">{t('empty')}</p>
        </div>
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="max-h-[24rem] overflow-y-auto">
          <div className="px-6 py-1">
            {events.map((event, i) => (
              <ActivityItem key={event.id} event={event} isLast={i === events.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
