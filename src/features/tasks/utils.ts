import {
  TaskType,
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  TaskWithRelations,
  TaskDependency,
  SubtaskSummary,
  QUALITY_MULTIPLIERS,
  QUALITY_SCORE_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_DESCRIPTIONS,
  TASK_PRIORITY_COLORS,
  REVIEW_STATUS_COLORS,
  CLAIMABLE_STATUSES,
} from './types';

export const DEFAULT_XP_PER_TASK_POINT = 10;

/**
 * Calculate earned points based on base points and quality score
 */
export function calculateEarnedPoints(basePoints: number, qualityScore: number): number {
  const multiplier = QUALITY_MULTIPLIERS[qualityScore] ?? 0;
  return Math.floor(basePoints * multiplier);
}

/**
 * Estimate XP granted from points.
 * Uses the default gamification multiplier when org-level config is not available in the client.
 */
export function estimateXpFromPoints(
  points: number,
  xpPerTaskPoint: number = DEFAULT_XP_PER_TASK_POINT
): number {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  const safeMultiplier = Number.isFinite(xpPerTaskPoint) ? Math.max(0, xpPerTaskPoint) : 0;
  return Math.round(safePoints * safeMultiplier);
}

/**
 * Get the quality multiplier for a score
 */
export function getQualityMultiplier(score: number): number {
  return QUALITY_MULTIPLIERS[score] ?? 0;
}

/**
 * Get the quality multiplier as a percentage string
 */
export function getQualityMultiplierPercent(score: number): string {
  const multiplier = getQualityMultiplier(score);
  return `${Math.round(multiplier * 100)}%`;
}

/**
 * Get the label for a quality score
 */
export function getQualityLabel(score: number): string {
  return QUALITY_SCORE_LABELS[score] ?? 'Unknown';
}

/**
 * Get the label for a task type
 */
export function getTaskTypeLabel(type: TaskType): string {
  return TASK_TYPE_LABELS[type];
}

/**
 * Get the description for a task type
 */
export function getTaskTypeDescription(type: TaskType): string {
  return TASK_TYPE_DESCRIPTIONS[type];
}

/**
 * Get the color class for a task priority
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
  return TASK_PRIORITY_COLORS[priority];
}

/**
 * Get the color class for a review status
 */
export function getReviewStatusColor(status: ReviewStatus): string {
  return REVIEW_STATUS_COLORS[status];
}

/**
 * Check if a task can be joined by a user (universal self-join model)
 * All tasks use task_assignees — unlimited participants allowed.
 */
export function canClaimTask(
  task: TaskWithRelations,
  userId: string,
  userHasOrganicId: boolean
): { canClaim: boolean; reason?: string } {
  // User must have an Organic ID
  if (!userHasOrganicId) {
    return { canClaim: false, reason: 'You need an Organic ID to join tasks' };
  }

  // Task must be in a joinable status
  if (!task.status || !CLAIMABLE_STATUSES.includes(task.status)) {
    return { canClaim: false, reason: 'This task is not available for joining' };
  }

  // Check if user already joined (via task_assignees)
  const alreadyJoined = task.assignees?.some((a) => a.user_id === userId);
  if (alreadyJoined) {
    return { canClaim: false, reason: 'You have already joined this task' };
  }

  return { canClaim: true };
}

/**
 * Check if a user can submit work for a task
 */
export function canSubmitTask(
  task: TaskWithRelations,
  userHasOrganicId: boolean
): { canSubmit: boolean; reason?: string } {
  if (!userHasOrganicId) {
    return { canSubmit: false, reason: 'You need an Organic ID to submit work' };
  }

  if (!task.sprint?.status || task.sprint.status !== 'active') {
    return { canSubmit: false, reason: 'Task must be in an active sprint to submit' };
  }

  return { canSubmit: true };
}

/**
 * Check if a user can review submissions
 */
export function canReviewSubmissions(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'council';
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: TaskWithRelations): boolean {
  if (!task.due_date || task.status === 'done') {
    return false;
  }
  return new Date(task.due_date) < new Date();
}

/**
 * Get days until/since due date
 */
export function getDueDateDays(dueDate: string): { days: number; overdue: boolean } {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    days: Math.abs(diffDays),
    overdue: diffDays < 0,
  };
}

/**
 * Format due date relative to now.
 * Accepts an optional translation function for i18n support.
 * When `t` is provided, it uses keys from Tasks.dueDate namespace:
 *   today, overdueSingle, overdueMultiple, tomorrow, inDays
 */
export function formatDueDate(
  dueDate: string,
  t?: (key: string, values?: Record<string, unknown>) => string
): string {
  const { days, overdue } = getDueDateDays(dueDate);

  if (t) {
    if (days === 0) return t('today');
    if (overdue) return days === 1 ? t('overdueSingle') : t('overdueMultiple', { days });
    return days === 1 ? t('tomorrow') : t('inDays', { days });
  }

  // Fallback (non-i18n contexts)
  if (days === 0) return 'Due today';
  if (overdue) return days === 1 ? '1 day overdue' : `${days} days overdue`;
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

/**
 * Get task progress percentage (for team tasks)
 */
export function getTaskProgress(task: TaskWithRelations): number {
  if (!task.is_team_task) {
    return task.status === 'done' ? 100 : 0;
  }

  const totalAssignees = task.max_assignees ?? 1;
  const completedSubmissions =
    task.submissions?.filter((s) => s.review_status === 'approved').length ?? 0;

  return Math.round((completedSubmissions / totalAssignees) * 100);
}

/**
 * Group tasks by status for kanban board
 */
export function groupTasksByStatus(
  tasks: TaskWithRelations[]
): Record<TaskStatus, TaskWithRelations[]> {
  const grouped: Record<TaskStatus, TaskWithRelations[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };

  for (const task of tasks) {
    const status = task.status ?? 'backlog';
    grouped[status].push(task);
  }

  return grouped;
}

/**
 * Sort tasks by priority (critical first)
 */
export function sortTasksByPriority(tasks: TaskWithRelations[]): TaskWithRelations[] {
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...tasks].sort(
    (a, b) => priorityOrder[a.priority ?? 'medium'] - priorityOrder[b.priority ?? 'medium']
  );
}

/**
 * Filter claimable tasks
 */
export function filterClaimableTasks(
  tasks: TaskWithRelations[],
  userId: string,
  userHasOrganicId: boolean
): TaskWithRelations[] {
  return tasks.filter((task) => canClaimTask(task, userId, userHasOrganicId).canClaim);
}

/**
 * Get submission form fields based on task type
 */
export function getSubmissionFieldsForType(taskType: TaskType): string[] {
  switch (taskType) {
    case 'development':
      return ['pr_link', 'description', 'testing_notes'];
    case 'content':
      return ['content_link', 'content_text', 'description', 'reach_metrics'];
    case 'design':
      return ['file_urls', 'description', 'revision_notes'];
    case 'custom':
      return ['description', 'custom_fields'];
    case 'twitter':
      return ['screenshot_url', 'comment_text', 'description'];
    default:
      return ['description'];
  }
}

/**
 * Validate submission has required fields for task type
 */
export function validateSubmissionForType(
  taskType: TaskType,
  submission: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (taskType) {
    case 'development':
      if (!submission.pr_link) {
        errors.push('PR link is required for development tasks');
      }
      break;
    case 'content':
      if (!submission.content_link && !submission.content_text) {
        errors.push('Either content link or content text is required');
      }
      break;
    case 'design':
      if (!submission.file_urls || (submission.file_urls as string[]).length === 0) {
        errors.push('At least one file is required for design tasks');
      }
      break;
    case 'custom':
      // No required fields for custom
      break;
    case 'twitter':
      if (!submission.screenshot_url) {
        errors.push('Screenshot URL is required for Twitter tasks');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Phase 12: Dependencies + Subtasks utilities
// ============================================

/**
 * Check if a task is blocked by incomplete dependencies
 */
export function isTaskBlocked(dependencies: TaskDependency[]): boolean {
  return dependencies.some((dep) => dep.blocking_task?.status !== 'done');
}

/**
 * Get the list of incomplete blocking tasks
 */
export function getIncompleteBlockers(dependencies: TaskDependency[]): TaskDependency[] {
  return dependencies.filter((dep) => dep.blocking_task?.status !== 'done');
}

/**
 * Calculate subtask progress from a list of subtasks
 */
export function calculateSubtaskProgress(subtasks: TaskWithRelations[]): SubtaskSummary {
  const total = subtasks.length;
  const completed = subtasks.filter((t) => t.status === 'done').length;
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Check if a task can be claimed, considering dependencies
 */
export function canClaimTaskWithDeps(
  task: TaskWithRelations,
  userId: string,
  userHasOrganicId: boolean,
  dependencies: TaskDependency[]
): { canClaim: boolean; reason?: string } {
  // Check dependencies first
  if (isTaskBlocked(dependencies)) {
    const blockers = getIncompleteBlockers(dependencies);
    const blockerTitles = blockers
      .map((d) => d.blocking_task?.title || 'Unknown')
      .slice(0, 3)
      .join(', ');
    return {
      canClaim: false,
      reason: `Blocked by: ${blockerTitles}${blockers.length > 3 ? ` +${blockers.length - 3} more` : ''}`,
    };
  }

  // Then check regular claim rules
  return canClaimTask(task, userId, userHasOrganicId);
}
