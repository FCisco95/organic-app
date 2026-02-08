'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Notification } from '@/features/notifications/types';
import { EVENT_ICONS } from '@/features/notifications/types';
import { useTranslations } from 'next-intl';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationHref(notification: Notification): string {
  const { subject_type, subject_id, metadata } = notification;
  if (subject_type === 'task') return `/tasks/${subject_id}`;
  if (subject_type === 'proposal') return `/proposals/${subject_id}`;
  // Fallback for submissions/comments — navigate to parent task
  if (metadata?.task_id) return `/tasks/${metadata.task_id}`;
  if (metadata?.proposal_id) return `/proposals/${metadata.proposal_id}`;
  return '/';
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  compact?: boolean;
}

export function NotificationItem({ notification, onClick, compact }: NotificationItemProps) {
  const t = useTranslations('Notifications');
  const actorName = notification.actor?.name || t('someone');
  const title = (notification.metadata?.title as string) || t('untitled');
  const icon = EVENT_ICONS[notification.event_type];
  const batchCount = notification.batch_count ?? 0;

  const getActionText = () => {
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
      default:
        return title;
    }
  };

  return (
    <button
      onClick={() => onClick?.(notification)}
      className={cn(
        'flex items-start gap-3 w-full text-left rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50',
        !notification.read && 'bg-primary/5'
      )}
    >
      {/* Unread dot */}
      <div className="mt-2 shrink-0">
        {!notification.read ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Avatar or Icon */}
      {!compact && notification.actor ? (
        <Avatar className="h-8 w-8 shrink-0">
          {notification.actor.avatar_url && (
            <AvatarImage src={notification.actor.avatar_url} alt={actorName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {actorName[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className="text-base mt-0.5 shrink-0">{icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.read && 'font-medium')}>
          <span className="text-foreground">{actorName}</span>{' '}
          <span className="text-muted-foreground">{getActionText()}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

export { getNotificationHref };
