'use client';

import { useActivityFeed } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { ActivityItem } from './activity-item';

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();
  const t = useTranslations('dashboard.activity');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 py-3 border-b border-gray-100 last:border-0">
            <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: `${70 - i * 8}%` }} />
            <div className="h-3 w-16 rounded bg-gray-50 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="py-8 text-sm text-gray-400 italic">{t('empty')}</p>
    );
  }

  return (
    <div className="max-h-[32rem] overflow-y-auto -mr-2 pr-2">
      {events.map((event, i) => (
        <ActivityItem
          key={event.id}
          event={event}
          isLast={i === events.length - 1}
        />
      ))}
    </div>
  );
}
