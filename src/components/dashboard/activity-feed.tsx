'use client';

import { useActivityFeed } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { ActivityItem } from './activity-item';

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();
  const t = useTranslations('dashboard.activity');

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('title')}</h2>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-6 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <p className="text-sm text-gray-500 text-center py-8">{t('empty')}</p>
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {events.map((event) => (
            <ActivityItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
