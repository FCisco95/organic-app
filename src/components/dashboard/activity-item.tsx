'use client';

import { ActivityEvent, ActivityEventType } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const EVENT_ACCENT: Record<string, string> = {
  task_completed: 'bg-emerald-500',
  vote_cast: 'bg-emerald-500',
  proposal_created: 'bg-organic-terracotta',
  task_created: 'bg-blue-500',
  submission_created: 'bg-violet-500',
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  return `${diffDay}d ago`;
}

export function ActivityItem({
  event,
  isLast = false,
}: {
  event: ActivityEvent;
  isLast?: boolean;
}) {
  const t = useTranslations('dashboard.activity');
  const actorName = event.actor?.organic_id
    ? `Organic #${event.actor.organic_id}`
    : event.actor?.name || 'Someone';
  const title = (event.metadata?.title as string) || '';
  const accent = EVENT_ACCENT[event.event_type] || 'bg-muted-foreground/40';

  const messageKey = event.event_type as string;
  let description: string;
  try {
    description = t(messageKey, { actor: actorName, title });
  } catch {
    description = `${actorName} ${event.event_type.replace(/_/g, ' ')}${title ? `: ${title}` : ''}`;
  }

  return (
    <div className={cn('py-3', !isLast && 'border-b border-border/50')}>
      <p className="text-[13px] leading-relaxed text-foreground">{description}</p>
      <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', accent)} />
        {formatTimeAgo(event.created_at)}
      </span>
    </div>
  );
}
