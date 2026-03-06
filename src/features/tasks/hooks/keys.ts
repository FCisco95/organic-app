'use client';

import type { TaskFilters } from '../schemas';

/** Shared column lists for Supabase selects */
export const TASK_SUBMISSION_REVIEW_COLUMNS =
  'id, task_id, user_id, submission_type, content_link, content_text, description, pr_link, file_urls, custom_fields, testing_notes, revision_notes, reach_metrics, review_status, quality_score, earned_points, reviewer_id, reviewer_notes, rejection_reason, submitted_at, reviewed_at, created_at, updated_at';
export const TASK_TEMPLATE_COLUMNS =
  'id, name, description, task_type, priority, base_points, labels, is_team_task, max_assignees, default_assignee_id, is_recurring, recurrence_rule, org_id, created_by, created_at, updated_at';

/** Query key factory for all task-related queries */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  submissions: (taskId: string) => [...taskKeys.all, 'submissions', taskId] as const,
  assignees: (taskId: string) => [...taskKeys.all, 'assignees', taskId] as const,
  myTasks: (userId: string) => [...taskKeys.all, 'my-tasks', userId] as const,
  claimable: () => [...taskKeys.all, 'claimable'] as const,
  pendingReview: () => [...taskKeys.all, 'pending-review'] as const,
  // Phase 12
  dependencies: (taskId: string) => [...taskKeys.all, 'dependencies', taskId] as const,
  subtasks: (taskId: string) => [...taskKeys.all, 'subtasks', taskId] as const,
  templates: () => [...taskKeys.all, 'templates'] as const,
  template: (id: string) => [...taskKeys.all, 'template', id] as const,
};
