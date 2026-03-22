'use client';

import { cn } from '@/lib/utils';
import type { Notification } from '@/features/notifications/types';
import { EVENT_ICON_NAMES } from '@/features/notifications/types';
import { useTranslations } from 'next-intl';
import {
  ClipboardList,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  Upload,
  FileCheck,
  MessageCircle,
  ScrollText,
  Vote,
  Clock,
  Scale,
  Reply,
  ArrowUp,
  Undo2,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EventIconName } from '@/features/notifications/types';

const ICON_MAP: Record<EventIconName, LucideIcon> = {
  ClipboardList,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  Upload,
  FileCheck,
  MessageCircle,
  ScrollText,
  Vote,
  Clock,
  Scale,
  Reply,
  ArrowUp,
  Undo2,
  Settings,
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationHref(notification: Notification): string {
  const { subject_type, subject_id, metadata } = notification;
  if (subject_type === 'task') return `/tasks/${subject_id}`;
  if (subject_type === 'proposal') return `/proposals/${subject_id}`;
  if (subject_type === 'dispute') return `/disputes/${subject_id}`;
  // Fallback for submissions/comments — navigate to parent task
  if (metadata?.task_id) return `/tasks/${metadata.task_id}`;
  if (metadata?.proposal_id) return `/proposals/${metadata.proposal_id}`;
  return '/';
}

/** Extract actor name and action verb separately for the three-line layout */
function useActionVerb(notification: Notification) {
  const t = useTranslations('Notifications');
  const title = (notification.metadata?.title as string) || t('untitled');
  const batchCount = notification.batch_count ?? 0;

  switch (notification.event_type) {
    case 'task_created':
      return t('events.taskCreated', { title });
    case 'task_status_changed': {
      const newStatus = notification.metadata?.new_status as string;
      return t('events.taskStatusChanged', { title, status: newStatus || '?' });
    }
    case 'task_completed':
      return t('events.taskCompleted', { title });
    case 'task_deleted':
      return t('events.taskDeleted', { title });
    case 'submission_created':
      if (batchCount > 1) {
        return t('events.submissionBatch', { title, count: batchCount });
      }
      return t('events.submissionCreated', { title });
    case 'submission_reviewed': {
      const reviewStatus = notification.metadata?.review_status as string;
      return t('events.submissionReviewed', { title, status: reviewStatus || '?' });
    }
    case 'comment_created':
      if (batchCount > 1) {
        return t('events.commentBatch', { title, count: batchCount });
      }
      return t('events.commentCreated', { title });
    case 'comment_deleted':
      return t('events.commentDeleted', { title });
    case 'proposal_created':
      return t('events.proposalCreated', { title });
    case 'proposal_status_changed': {
      const newStatus = notification.metadata?.new_status as string;
      return t('events.proposalStatusChanged', { title, status: newStatus || '?' });
    }
    case 'proposal_deleted':
      return t('events.proposalDeleted', { title });
    case 'vote_cast':
      return t('events.voteCast', { title });
    case 'voting_reminder_24h':
      return t('events.votingReminder24h', { title });
    case 'voting_reminder_1h':
      return t('events.votingReminder1h', { title });
    case 'dispute_created':
      return t('events.disputeCreated', { title });
    case 'dispute_response_submitted':
      return t('events.disputeResponseSubmitted', { title });
    case 'dispute_escalated':
      return t('events.disputeEscalated', { title });
    case 'dispute_resolved':
      return t('events.disputeResolved', { title });
    case 'dispute_withdrawn':
      return t('events.disputeWithdrawn', { title });
    default:
      return title;
  }
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  compact?: boolean;
}

/**
 * Card-style notification item for the timeline layout.
 * Three-line layout: actor + action + time | subject title | content snippet
 */
export function NotificationItem({ notification, onClick, compact }: NotificationItemProps) {
  const t = useTranslations('Notifications');
  const actorName = notification.actor?.name || t('someone');
  const title = (notification.metadata?.title as string) || t('untitled');
  const actionText = useActionVerb(notification);
  const description = notification.metadata?.description as string | undefined;
  const iconName = EVENT_ICON_NAMES[notification.event_type];
  const IconComponent = ICON_MAP[iconName];

  if (compact) {
    // Compact variant for bell dropdown — clean list, no card chrome
    return (
      <button
        onClick={() => onClick?.(notification)}
        className={cn(
          'flex items-start gap-3 w-full text-left px-4 py-3 transition-colors hover:bg-muted/50',
          !notification.read && 'bg-primary/[0.03]'
        )}
      >
        {/* Icon */}
        <div className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-muted">
          <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm leading-snug', !notification.read && 'font-medium')}>
            <span className="text-foreground">{actorName}</span>{' '}
            <span className="text-muted-foreground">{actionText}</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
            {getRelativeTime(notification.created_at)}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="mt-2 shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--organic-terracotta,15_80%_55%))]" />
          </div>
        )}
      </button>
    );
  }

  // Full card variant for the timeline page
  return (
    <button
      onClick={() => onClick?.(notification)}
      className={cn(
        'w-full text-left rounded-lg border bg-card p-4 transition-all hover:bg-accent/50',
        !notification.read && 'shadow-sm border-border',
        notification.read && 'border-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon in muted circle */}
        <div className="mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Three-line content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Actor + action + time */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm leading-snug truncate">
              <span className="font-medium text-foreground">{actorName}</span>{' '}
              <span className="text-muted-foreground">{actionText}</span>
            </p>
            <span className="shrink-0 text-xs text-muted-foreground/60 font-mono tabular-nums">
              {getRelativeTime(notification.created_at)}
            </span>
          </div>

          {/* Line 2: Subject title */}
          <p className={cn(
            'text-sm mt-1 truncate',
            !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
          )}>
            {title}
          </p>

          {/* Line 3: Content snippet/preview */}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export { getNotificationHref };
