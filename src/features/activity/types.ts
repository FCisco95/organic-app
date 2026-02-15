export type ActivityEventType =
  | 'task_created'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_deleted'
  | 'submission_created'
  | 'submission_reviewed'
  | 'comment_created'
  | 'comment_deleted'
  | 'proposal_created'
  | 'proposal_status_changed'
  | 'proposal_deleted'
  | 'vote_cast'
  | 'voting_reminder_24h'
  | 'voting_reminder_1h'
  | 'dispute_created'
  | 'dispute_response_submitted'
  | 'dispute_escalated'
  | 'dispute_resolved'
  | 'dispute_withdrawn';

export interface ActivityEvent {
  id: string;
  event_type: ActivityEventType;
  actor_id: string | null;
  subject_type: string;
  subject_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    name: string | null;
    organic_id: number | null;
    avatar_url: string | null;
  } | null;
}

export interface DashboardStats {
  total_users: number;
  org_holders: number;
  tasks_completed: number;
  active_proposals: number;
  org_price: number | null;
}
