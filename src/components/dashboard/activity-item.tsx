'use client';

import { ActivityEvent, ActivityEventType } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const EVENT_CONFIG: Record<ActivityEventType, { icon: string; tint: string }> = {
  task_created: { icon: '📋', tint: 'bg-blue-50 ring-blue-100/60' },
  task_status_changed: { icon: '🔄', tint: 'bg-amber-50 ring-amber-100/60' },
  task_completed: { icon: '✅', tint: 'bg-green-50 ring-green-100/60' },
  task_deleted: { icon: '🗑️', tint: 'bg-red-50 ring-red-100/60' },
  submission_created: { icon: '📤', tint: 'bg-violet-50 ring-violet-100/60' },
  submission_reviewed: { icon: '📝', tint: 'bg-indigo-50 ring-indigo-100/60' },
  comment_created: { icon: '💬', tint: 'bg-sky-50 ring-sky-100/60' },
  comment_deleted: { icon: '🗑️', tint: 'bg-red-50 ring-red-100/60' },
  proposal_created: { icon: '📝', tint: 'bg-orange-50 ring-orange-100/60' },
  proposal_status_changed: { icon: '🔄', tint: 'bg-amber-50 ring-amber-100/60' },
  proposal_deleted: { icon: '🗑️', tint: 'bg-red-50 ring-red-100/60' },
  vote_cast: { icon: '🗳️', tint: 'bg-emerald-50 ring-emerald-100/60' },
  voting_reminder_24h: { icon: '⏰', tint: 'bg-amber-50 ring-amber-100/60' },
  voting_reminder_1h: { icon: '⏰', tint: 'bg-amber-50 ring-amber-100/60' },
};

const FALLBACK = { icon: '📌', tint: 'bg-gray-50 ring-gray-100/60' };

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

export function ActivityItem({
  event,
  isLast = false,
}: {
  event: ActivityEvent;
  isLast?: boolean;
}) {
  const t = useTranslations('dashboard.activity');
  const config = EVENT_CONFIG[event.event_type] || FALLBACK;
  const actorName = event.actor?.organic_id
    ? `Organic #${event.actor.organic_id}`
    : event.actor?.name || 'Someone';
  const title = (event.metadata?.title as string) || '';

  const messageKey = event.event_type as string;
  let description: string;
  try {
    description = t(messageKey, { actor: actorName, title });
  } catch {
    description = `${actorName} — ${event.event_type.replace(/_/g, ' ')}${title ? `: ${title}` : ''}`;
  }

  return (
    <div className={cn('flex items-center gap-3 py-3', !isLast && 'border-b border-gray-50')}>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ring-1',
          config.tint
        )}
      >
        {config.icon}
      </span>
      <p className="flex-1 min-w-0 text-[13px] text-gray-600 leading-snug truncate">
        {description}
      </p>
      <span className="shrink-0 text-[11px] tabular-nums text-gray-300/80">
        {formatTimeAgo(event.created_at)}
      </span>
    </div>
  );
}
