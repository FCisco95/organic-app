import type { ActivityEventType } from '@/features/activity/types';

export type NotificationCategory = 'tasks' | 'proposals' | 'voting' | 'comments' | 'disputes' | 'system';

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
  'disputes',
  'system',
];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  tasks: 'Tasks',
  proposals: 'Proposals',
  voting: 'Voting',
  comments: 'Comments',
  disputes: 'Disputes',
  system: 'System',
};

/** Lucide icon names for each event type (used to select icons in components) */
export type EventIconName =
  | 'ClipboardList'
  | 'ArrowRightLeft'
  | 'CheckCircle2'
  | 'Trash2'
  | 'Upload'
  | 'FileCheck'
  | 'MessageCircle'
  | 'ScrollText'
  | 'Vote'
  | 'Clock'
  | 'Scale'
  | 'Reply'
  | 'ArrowUp'
  | 'Undo2'
  | 'Settings'
  | 'Egg';

export const EVENT_ICON_NAMES: Record<ActivityEventType, EventIconName> = {
  task_created: 'ClipboardList',
  task_status_changed: 'ArrowRightLeft',
  task_completed: 'CheckCircle2',
  task_deleted: 'Trash2',
  submission_created: 'Upload',
  submission_reviewed: 'FileCheck',
  comment_created: 'MessageCircle',
  comment_deleted: 'Trash2',
  proposal_created: 'ScrollText',
  proposal_status_changed: 'ArrowRightLeft',
  proposal_deleted: 'Trash2',
  vote_cast: 'Vote',
  voting_reminder_24h: 'Clock',
  voting_reminder_1h: 'Clock',
  dispute_created: 'Scale',
  dispute_response_submitted: 'Reply',
  dispute_escalated: 'ArrowUp',
  dispute_resolved: 'CheckCircle2',
  dispute_withdrawn: 'Undo2',
  egg_found: 'Egg',
};

/** Category colors for timeline dots */
export const CATEGORY_DOT_COLORS: Record<NotificationCategory, string> = {
  tasks: 'bg-blue-500',
  proposals: 'bg-violet-500',
  voting: 'bg-amber-500',
  comments: 'bg-emerald-500',
  disputes: 'bg-rose-500',
  system: 'bg-slate-400',
};

/** Category icon names */
export type CategoryIconName =
  | 'ClipboardList'
  | 'ScrollText'
  | 'Vote'
  | 'MessageCircle'
  | 'Scale'
  | 'Settings';

export const CATEGORY_ICON_NAMES: Record<NotificationCategory, CategoryIconName> = {
  tasks: 'ClipboardList',
  proposals: 'ScrollText',
  voting: 'Vote',
  comments: 'MessageCircle',
  disputes: 'Scale',
  system: 'Settings',
};

// Legacy emoji icons — kept for backward compatibility
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
  dispute_created: '⚖️',
  dispute_response_submitted: '📝',
  dispute_escalated: '⬆️',
  dispute_resolved: '✅',
  dispute_withdrawn: '↩️',
  egg_found: '🥚',
};
