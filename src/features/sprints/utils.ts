import type { SprintStats } from './types';

export function formatSprintDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getSprintDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} days`;
}

export function getCompletionPercent(stats: SprintStats[string]): number {
  if (stats.totalPoints > 0) {
    return Math.round((stats.points / stats.totalPoints) * 100);
  }
  if (stats.total > 0) {
    return Math.round((stats.completed / stats.total) * 100);
  }
  return 0;
}

export function getCapacityPercent(used: number, capacity: number | null): number {
  if (capacity === null || capacity <= 0) return 0;
  return Math.min(100, Math.round((used / capacity) * 100));
}
