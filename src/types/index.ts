// Common types used across the application

export type UserRole = 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  wallet_pubkey?: string;
  organic_id?: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  author_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  proposal_id?: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote_choice: 'yes' | 'no' | 'abstain';
  vote_weight: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  proposal_id?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  assignee_id?: string;
  sprint_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}
