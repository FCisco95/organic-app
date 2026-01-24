import {
  Database,
  TaskType,
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  SprintStatus,
} from '@/types/database';

// Base database types
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Sprint = Database['public']['Tables']['sprints']['Row'];
export type SprintInsert = Database['public']['Tables']['sprints']['Insert'];
export type SprintUpdate = Database['public']['Tables']['sprints']['Update'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskSubmission = Database['public']['Tables']['task_submissions']['Row'];
export type TaskSubmissionInsert = Database['public']['Tables']['task_submissions']['Insert'];
export type TaskSubmissionUpdate = Database['public']['Tables']['task_submissions']['Update'];

export type TaskAssignee = Database['public']['Tables']['task_assignees']['Row'];
export type TaskAssigneeInsert = Database['public']['Tables']['task_assignees']['Insert'];

// Re-export enums for convenience
export type { TaskType, TaskStatus, TaskPriority, ReviewStatus, SprintStatus };

// UI-specific types
export type TaskTab = 'all' | 'backlog' | 'activeSprint' | 'completed';

// Sprint form data (for create/edit modals)
export interface SprintFormData {
  name: string;
  start_at: string;
  end_at: string;
  status: SprintStatus;
  capacity_points: string;
}

// Sprint statistics (keyed by sprint ID)
export interface SprintStats {
  [sprintId: string]: {
    total: number;
    completed: number;
    inProgress: number;
    points: number;
    totalPoints: number;
  };
}

// Task with assignee for sprint detail view
export interface SprintTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  points: number | null;
  sprint_id: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

// Assignee type (user eligible for task assignment)
export interface Assignee {
  id: string;
  email: string;
  name?: string | null;
  organic_id: number | null;
  role: string;
}

// Task list item (used in task list views with minimal relations)
export interface TaskListItem extends Task {
  assignee?: {
    organic_id: number | null;
    email: string;
  } | null;
  sprints?: {
    name: string;
  } | null;
}

// Task submission summary (used in task list for contributor display)
export interface TaskSubmissionSummary {
  task_id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
  } | null;
}

// Task comment with user relation
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

// Simple member type (for dropdowns/selects)
export interface Member {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
}

// Extended types with relations
export interface TaskWithRelations extends Task {
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  } | null;
  sprint?: {
    id: string;
    name: string;
    status: string;
  } | null;
  created_by_user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
  } | null;
  proposal?: {
    id: string;
    title: string;
    status: string;
  } | null;
  assignees?: TaskAssigneeWithUser[];
  submissions?: TaskSubmissionWithReviewer[];
  _count?: {
    submissions: number;
    assignees: number;
  };
}

export interface TaskAssigneeWithUser extends TaskAssignee {
  user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

export interface TaskSubmissionWithReviewer extends TaskSubmission {
  user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
  } | null;
}

// Reach metrics for content submissions
export interface ReachMetrics {
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  impressions?: number;
  engagement_rate?: number;
}

// Custom fields for custom task type submissions
export interface CustomSubmissionFields {
  [key: string]: string | number | boolean | null;
}

// Task submission form data by type
export interface DevelopmentSubmissionData {
  pr_link: string;
  description?: string;
  testing_notes?: string;
}

export interface ContentSubmissionData {
  content_link?: string;
  content_text?: string;
  description?: string;
  reach_metrics?: ReachMetrics;
}

export interface DesignSubmissionData {
  file_urls: string[];
  description?: string;
  revision_notes?: string;
}

export interface CustomSubmissionData {
  description?: string;
  custom_fields?: CustomSubmissionFields;
}

export type SubmissionData =
  | DevelopmentSubmissionData
  | ContentSubmissionData
  | DesignSubmissionData
  | CustomSubmissionData;

// Review data
export interface ReviewData {
  quality_score: 1 | 2 | 3 | 4 | 5;
  reviewer_notes?: string;
  rejection_reason?: string;
}

// Quality score labels
export const QUALITY_SCORE_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

// Quality multipliers (match database function)
export const QUALITY_MULTIPLIERS: Record<number, number> = {
  1: 0.2, // 20%
  2: 0.4, // 40%
  3: 0.6, // 60%
  4: 0.8, // 80%
  5: 1.0, // 100%
};

// Task type labels
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  development: 'Development',
  content: 'Content/Social',
  design: 'Design',
  custom: 'Custom',
};

// Task type descriptions
export const TASK_TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  development: 'Code tasks with GitHub PR links',
  content: 'Writing, tweets, and community posts',
  design: 'Graphics, UI mockups, and branding',
  custom: 'Admin-defined custom task type',
};

// Task priority colors
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

// Review status colors
export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  disputed: 'bg-purple-500',
};

// Task status that indicates task is claimable
export const CLAIMABLE_STATUSES: TaskStatus[] = ['backlog', 'todo'];

// Task status that indicates work is in progress
export const IN_PROGRESS_STATUSES: TaskStatus[] = ['in_progress', 'review'];
