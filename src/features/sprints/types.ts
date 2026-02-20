import { Database, SprintStatus } from '@/types/database';
import type { Json } from '@/types/database';

// Base database types
export type Sprint = Database['public']['Tables']['sprints']['Row'];
export type SprintInsert = Database['public']['Tables']['sprints']['Insert'];
export type SprintUpdate = Database['public']['Tables']['sprints']['Update'];
export type SprintSnapshot = Database['public']['Tables']['sprint_snapshots']['Row'];

// Re-export for convenience
export type { SprintStatus };

export const SPRINT_PHASE_SEQUENCE: SprintStatus[] = [
  'planning',
  'active',
  'review',
  'dispute_window',
  'settlement',
  'completed',
];

export const SPRINT_EXECUTION_PHASES: SprintStatus[] = [
  'active',
  'review',
  'dispute_window',
  'settlement',
];

export const SPRINT_TERMINAL_PHASES: SprintStatus[] = ['completed'];

const PHASE_INDEX = new Map<SprintStatus, number>(
  SPRINT_PHASE_SEQUENCE.map((phase, index) => [phase, index])
);

export function sprintPhaseRank(status: SprintStatus): number {
  return PHASE_INDEX.get(status) ?? -1;
}

export function canTransitionSprintPhase(from: SprintStatus, to: SprintStatus): boolean {
  if (from === to) return true;

  const allowed: Record<SprintStatus, SprintStatus[]> = {
    planning: ['active'],
    active: ['review'],
    review: ['dispute_window'],
    dispute_window: ['settlement'],
    settlement: ['completed'],
    completed: [],
  };

  return allowed[from].includes(to);
}

export function getNextSprintPhase(status: SprintStatus): SprintStatus | null {
  const currentIndex = sprintPhaseRank(status);
  if (currentIndex < 0 || currentIndex >= SPRINT_PHASE_SEQUENCE.length - 1) {
    return null;
  }

  return SPRINT_PHASE_SEQUENCE[currentIndex + 1] ?? null;
}

export function isSprintExecutionPhase(status: SprintStatus | null | undefined): boolean {
  if (!status) return false;
  return SPRINT_EXECUTION_PHASES.includes(status);
}

export function isSprintCompleted(status: SprintStatus | null | undefined): boolean {
  return status === 'completed';
}

// Sprint form data (for create/edit modals)
export interface SprintFormData {
  name: string;
  start_at: string;
  end_at: string;
  status: SprintStatus;
  capacity_points: string;
  goal: string;
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

// Task summary item stored in sprint snapshot JSONB
export interface SnapshotTaskSummary {
  id: string;
  title: string;
  status: string;
  points: number | null;
  assignee_name: string | null;
}

// Sprint with its snapshot (for timeline)
export interface SprintWithSnapshot extends Sprint {
  snapshot: SprintSnapshot | null;
}
