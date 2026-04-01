'use client';

import { useTranslations } from 'next-intl';
import { Clock, AlertCircle } from 'lucide-react';

interface AuditEvent {
  id: string;
  change_scope: string;
  reason: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
}

interface AdminTimelineProps {
  events: AuditEvent[];
  isLoading?: boolean;
}

const SCOPE_DOT_COLORS: Record<string, string> = {
  org: 'bg-blue-500',
  general: 'bg-blue-500',
  voting_config: 'bg-amber-500',
  governance: 'bg-red-500',
  governance_policy: 'bg-red-500',
  rewards: 'bg-emerald-500',
  rewards_config: 'bg-emerald-500',
  token: 'bg-violet-500',
  treasury: 'bg-cyan-500',
  sprints: 'bg-organic-terracotta-lightest0',
  sprint_policy: 'bg-organic-terracotta-lightest0',
  members: 'bg-indigo-500',
  gamification: 'bg-pink-500',
};

function getDotColor(scope: string): string {
  return SCOPE_DOT_COLORS[scope] ?? 'bg-muted-foreground';
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatScope(scope: string): string {
  return scope.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminTimeline({ events, isLoading }: AdminTimelineProps) {
  const t = useTranslations('AdminDashboard');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <div className="w-px flex-1 bg-muted" />
            </div>
            <div className="flex-1 space-y-2 pb-4">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t('timeline.empty')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('timeline.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        return (
          <div key={event.id} className="flex gap-3">
            {/* Dot + connector line */}
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${getDotColor(event.change_scope)} ring-2 ring-background`} />
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>
            {/* Content */}
            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
              <p className="text-sm text-foreground leading-snug">
                <span className="font-medium">{event.actor_name}</span>{' '}
                <span className="text-muted-foreground">{t('timeline.updated')}</span>{' '}
                <span className="font-medium">{formatScope(event.change_scope)}</span>
              </p>
              {event.reason && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {event.reason}
                </p>
              )}
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(event.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
