'use client';

import { useState, useEffect } from 'react';
import { ActivityEvent } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  FileText,
  Vote,
  CheckCircle,
  Shield,
  UserPlus,
  Activity,
  Zap,
} from 'lucide-react';

const EVENT_ICON: Record<string, React.ElementType> = {
  proposal_created: FileText,
  vote_cast: Vote,
  task_completed: CheckCircle,
  task_created: CheckCircle,
  submission_created: Zap,
  dispute_escalated: Shield,
  member_joined: UserPlus,
};

const EVENT_ICON_BG: Record<string, string> = {
  task_completed: 'bg-emerald-500/10',
  vote_cast: 'bg-emerald-500/10',
  proposal_created: 'bg-organic-terracotta/10',
  task_created: 'bg-blue-500/10',
  submission_created: 'bg-violet-500/10',
  dispute_escalated: 'bg-red-500/10',
  member_joined: 'bg-orange-500/10',
};

const EVENT_ICON_TEXT: Record<string, string> = {
  task_completed: 'text-emerald-500',
  vote_cast: 'text-emerald-500',
  proposal_created: 'text-organic-terracotta',
  task_created: 'text-blue-500',
  submission_created: 'text-violet-500',
  dispute_escalated: 'text-red-500',
  member_joined: 'text-orange-500',
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

/** Suppress hydration mismatch by rendering time-ago only on the client */
function TimeAgo({ dateStr }: { dateStr: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span>&nbsp;</span>;
  return <>{formatTimeAgo(dateStr)}</>;
}

export function ActivityItem({
  event,
  isLast = false,
  index = 0,
}: {
  event: ActivityEvent;
  isLast?: boolean;
  index?: number;
}) {
  const t = useTranslations('dashboard.activity');
  const actorName = event.actor?.organic_id
    ? `Organic #${event.actor.organic_id}`
    : event.actor?.name || 'Someone';
  const title = (event.metadata?.title as string) || '';
  const Icon = EVENT_ICON[event.event_type] || Activity;
  const iconBg = EVENT_ICON_BG[event.event_type] || 'bg-muted-foreground/10';
  const iconText = EVENT_ICON_TEXT[event.event_type] || 'text-muted-foreground';

  const messageKey = event.event_type as string;
  let description: string;
  try {
    description = t(messageKey, { actor: actorName, title });
  } catch {
    description = `${actorName} ${event.event_type.replace(/_/g, ' ')}${title ? `: ${title}` : ''}`;
  }

  return (
    <div
      className={cn('flex items-start gap-3 py-3 animate-slide-in', !isLast && 'border-b border-border/50')}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', iconBg)}>
        <Icon className={cn('h-3.5 w-3.5', iconText)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-relaxed text-foreground">{description}</p>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TimeAgo dateStr={event.created_at} />
        </span>
      </div>
    </div>
  );
}
