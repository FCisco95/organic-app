'use client';

import { useActivityFeed } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ActivityItem } from './activity-item';

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();
  const t = useTranslations('dashboard.activity');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 py-3 border-b border-border/50 last:border-0">
            <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${70 - i * 8}%` }} />
            <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  const visibleEvents = events.slice(0, 5);
  const hasMore = events.length > 5;

  return (
    <div>
      <div className="divide-y divide-border/50">
        {visibleEvents.map((event, i) => (
          <ActivityItem
            key={event.id}
            event={event}
            isLast={!hasMore && i === visibleEvents.length - 1}
          />
        ))}
      </div>
      {hasMore && (
        <div className="pt-3 border-t border-border/50">
          <Link
            href="/analytics"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-organic-orange hover:text-organic-orange/80 transition-colors py-1"
          >
            {t('viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
