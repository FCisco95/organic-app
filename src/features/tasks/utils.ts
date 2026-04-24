import {
  TaskWithRelations,
  QUALITY_MULTIPLIERS,
  CLAIMABLE_STATUSES,
} from './types';

export const DEFAULT_XP_PER_TASK_POINT = 10;

export function calculateEarnedPoints(basePoints: number, qualityScore: number): number {
  const multiplier = QUALITY_MULTIPLIERS[qualityScore] ?? 0;
  return Math.floor(basePoints * multiplier);
}

// Clamps non-finite/negative inputs to 0 so callers can pass raw config values safely.
export function estimateXpFromPoints(
  points: number,
  xpPerTaskPoint: number = DEFAULT_XP_PER_TASK_POINT
): number {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  const safeMultiplier = Number.isFinite(xpPerTaskPoint) ? Math.max(0, xpPerTaskPoint) : 0;
  return Math.round(safePoints * safeMultiplier);
}

export function canClaimTask(
  task: TaskWithRelations,
  userId: string,
  userHasOrganicId: boolean
): { canClaim: boolean; reason?: string } {
  if (!userHasOrganicId) {
    return { canClaim: false, reason: 'You need an Organic ID to join tasks' };
  }

  if (!task.status || !CLAIMABLE_STATUSES.includes(task.status)) {
    return { canClaim: false, reason: 'This task is not available for joining' };
  }

  const alreadyJoined = task.assignees?.some((a) => a.user_id === userId);
  if (alreadyJoined) {
    return { canClaim: false, reason: 'You have already joined this task' };
  }

  return { canClaim: true };
}

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
