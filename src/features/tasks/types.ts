import {
  Database,
  TaskType,
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  SprintStatus,
} from '@/types/database';

// Re-export sprint types from their new home for backward compatibility
export type {
  Sprint,
  SprintInsert,
  SprintUpdate,
  SprintFormData,
  SprintStats,
  SprintTask,
} from '@/features/sprints/types';

// Base database types
export type Task = Database['public']['Tables']['tasks']['Row'];
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
  assignees?: TaskAssigneeWithUser[];
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
    result: string | null;
  } | null;
  proposal_version?: {
    id: string;
    version_number: number;
    created_at: string | null;
  } | null;
  assignees?: TaskAssigneeWithUser[];
  submissions?: TaskSubmissionWithReviewer[];
  twitter_engagement_task?: Database['public']['Tables']['twitter_engagement_tasks']['Row'] | null;
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
  twitter_engagement_submission?:
    | Database['public']['Tables']['twitter_engagement_submissions']['Row']
    | null;
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

export interface TwitterSubmissionData {
  screenshot_url?: string;
  comment_text?: string;
  description?: string;
}

export type SubmissionData =
  | DevelopmentSubmissionData
  | ContentSubmissionData
  | DesignSubmissionData
  | CustomSubmissionData
  | TwitterSubmissionData;

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
  twitter: 'Twitter/X Engagement',
};

// Task type descriptions
export const TASK_TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  development: 'Code tasks with GitHub PR links',
  content: 'Writing, tweets, and community posts',
  design: 'Graphics, UI mockups, and branding',
  custom: 'Admin-defined custom task type',
  twitter: 'Verify likes, retweets, and comments on X',
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
export const CLAIMABLE_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress'];

// Task status that indicates work is in progress
export const IN_PROGRESS_STATUSES: TaskStatus[] = ['in_progress', 'review'];

// ============================================
// Phase 12: Dependencies, Subtasks, Templates
// ============================================

// Recurrence rule values
export type RecurrenceRule = 'sprint_start' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

// Recurrence rule labels
export const RECURRENCE_RULE_LABELS: Record<RecurrenceRule, string> = {
  sprint_start: 'Every Sprint Start',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
};

// Task dependency
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
  created_by: string | null;
  // Joined fields
  blocking_task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

// Subtask summary for parent task display
export interface SubtaskSummary {
  total: number;
  completed: number;
  percentage: number;
}

// Task template
export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  base_points: number;
  labels: string[];
  is_team_task: boolean;
  max_assignees: number;
  default_assignee_id: string | null;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  org_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Template with creator info
export interface TaskTemplateWithCreator extends TaskTemplate {
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Recurring task instance (for tracking)
export interface RecurringTaskInstance {
  id: string;
  template_id: string;
  task_id: string;
  sprint_id: string | null;
  generated_at: string;
}

// Extended task with dependency/subtask info
export interface TaskWithDependencies extends TaskWithRelations {
  dependencies?: TaskDependency[];
  blocked_by?: TaskDependency[];
  subtasks?: TaskWithRelations[];
  subtask_summary?: SubtaskSummary;
  parent_task?: {
    id: string;
    title: string;
    status: TaskStatus;
  } | null;
  is_blocked?: boolean;
  template?: {
    id: string;
    name: string;
  } | null;
}
