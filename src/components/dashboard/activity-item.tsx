'use client';

import { ActivityEvent, ActivityEventType } from '@/features/activity';
import { useTranslations } from 'next-intl';

const EVENT_ICONS: Record<ActivityEventType, string> = {
  task_created: '📋',
  task_status_changed: '🔄',
  task_completed: '✅',
  task_deleted: '🗑️',
  submission_created: '📤',
  submission_reviewed: '📝',
  comment_created: '💬',
  comment_deleted: '🗑️',
  proposal_created: '📝',
  proposal_status_changed: '🔄',
  proposal_deleted: '🗑️',
  vote_cast: '🗳️',
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

export function ActivityItem({ event }: { event: ActivityEvent }) {
  const t = useTranslations('dashboard.activity');
  const icon = EVENT_ICONS[event.event_type] || '📌';
  const actorName = event.actor?.organic_id
    ? `Organic #${event.actor.organic_id}`
    : event.actor?.name || 'Someone';
  const title = (event.metadata?.title as string) || '';

  const messageKey = event.event_type as string;
  let description: string;
  try {
    description = t(messageKey, { actor: actorName, title });
  } catch {
    // Fallback if translation key missing
    description = `${actorName} — ${event.event_type.replace(/_/g, ' ')}${title ? `: ${title}` : ''}`;
  }

  return (
    <div className="flex items-start gap-3 py-2.5 px-1">
      <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
        {formatTimeAgo(event.created_at)}
      </span>
    </div>
  );
}
