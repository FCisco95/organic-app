import { Database, SprintStatus } from '@/types/database';
import type { Json } from '@/types/database';

// Base database types
export type Sprint = Database['public']['Tables']['sprints']['Row'];
export type SprintInsert = Database['public']['Tables']['sprints']['Insert'];
export type SprintUpdate = Database['public']['Tables']['sprints']['Update'];
export type SprintSnapshot = Database['public']['Tables']['sprint_snapshots']['Row'];

// Re-export for convenience
export type { SprintStatus };

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
