import type { ActivityEventType } from '@/features/activity/types';

export type NotificationCategory = 'tasks' | 'proposals' | 'voting' | 'comments' | 'system';

export type FollowSubjectType = 'task' | 'proposal';

export interface Notification {
  id: string;
  user_id: string;
  event_type: ActivityEventType;
  category: NotificationCategory;
  actor_id: string | null;
  subject_type: string;
  subject_id: string;
  metadata: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
  batch_count?: number | null;
  batch_first_at?: string | null;
  batch_last_at?: string | null;
  actor?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    organic_id: number | null;
  } | null;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: NotificationCategory;
  in_app: boolean;
  email: boolean;
}

export interface UserFollow {
  id: string;
  user_id: string;
  subject_type: FollowSubjectType;
  subject_id: string;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'tasks',
  'proposals',
  'voting',
  'comments',
  'system',
];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  tasks: 'Tasks',
  proposals: 'Proposals',
  voting: 'Voting',
  comments: 'Comments',
  system: 'System',
};

export const EVENT_ICONS: Record<ActivityEventType, string> = {
  task_created: '📋',
  task_status_changed: '🔄',
  task_completed: '✅',
  task_deleted: '🗑️',
  submission_created: '📤',
  submission_reviewed: '📝',
  comment_created: '💬',
  comment_deleted: '🗑️',
  proposal_created: '📜',
  proposal_status_changed: '🔄',
  proposal_deleted: '🗑️',
  vote_cast: '🗳️',
  voting_reminder_24h: '⏰',
  voting_reminder_1h: '⏰',
};
