'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Sprint, SprintSnapshot, SprintWithSnapshot } from './types';

const SPRINT_COLUMNS =
  'id, org_id, name, start_at, end_at, status, capacity_points, reward_pool, goal, active_started_at, review_started_at, dispute_window_started_at, dispute_window_ends_at, settlement_started_at, settlement_integrity_flags, settlement_blocked_reason, reward_settlement_status, reward_settlement_committed_at, reward_settlement_idempotency_key, reward_settlement_kill_switch_at, reward_emission_cap, reward_carryover_amount, reward_carryover_sprint_count, completed_at, created_at, updated_at';
const SPRINT_SNAPSHOT_COLUMNS =
  'id, sprint_id, completed_by, completed_at, total_tasks, completed_tasks, incomplete_tasks, total_points, completed_points, completion_rate, task_summary, incomplete_action, created_at';

// Query keys
export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: () => [...sprintKeys.lists()] as const,
  details: () => [...sprintKeys.all, 'detail'] as const,
  detail: (id: string) => [...sprintKeys.details(), id] as const,
  snapshot: (sprintId: string) => [...sprintKeys.all, 'snapshot', sprintId] as const,
  timeline: () => [...sprintKeys.all, 'timeline'] as const,
};

/**
 * Fetch all sprints
 */
export function useSprints() {
  const supabase = createClient();

  return useQuery({
    queryKey: sprintKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select(SPRINT_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Sprint[];
    },
    staleTime: 120_000,
  });
}

/**
 * Fetch a single sprint by ID with its tasks
 */
export function useSprint(id: string) {
  return useQuery({
    queryKey: sprintKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/sprints/${id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch sprint');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Fetch snapshot for a completed sprint
 */
export function useSprintSnapshot(sprintId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: sprintKeys.snapshot(sprintId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_snapshots')
        .select(SPRINT_SNAPSHOT_COLUMNS)
        .eq('sprint_id', sprintId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }
      return data as SprintSnapshot;
    },
    enabled: !!sprintId,
    staleTime: 120_000,
  });
}

/**
 * Fetch completed sprints with snapshots for the timeline
 */
export function useSprintTimeline() {
  const supabase = createClient();

  return useQuery({
    queryKey: sprintKeys.timeline(),
    queryFn: async () => {
      const { data: sprints, error: sprintError } = await supabase
        .from('sprints')
        .select(SPRINT_COLUMNS)
        .order('start_at', { ascending: false });

      if (sprintError) throw sprintError;
      if (!sprints || sprints.length === 0) return [];

      const completedSprintIds = sprints
        .filter((sprint) => sprint.status === 'completed')
        .map((sprint) => sprint.id);
      let snapshots: SprintSnapshot[] = [];

      if (completedSprintIds.length > 0) {
        const { data: snapshotData, error: snapError } = await supabase
          .from('sprint_snapshots')
          .select(SPRINT_SNAPSHOT_COLUMNS)
          .in('sprint_id', completedSprintIds);

        if (snapError) throw snapError;
        snapshots = (snapshotData ?? []) as SprintSnapshot[];
      }

      const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.sprint_id, snapshot]));

      return sprints.map(
        (sprint): SprintWithSnapshot => ({
          ...sprint,
          snapshot: snapshotMap.get(sprint.id) ?? null,
        })
      );
    },
    staleTime: 120_000,
  });
}

/**
 * Create a new sprint
 */
export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      start_at: string;
      end_at: string;
      goal?: string;
      capacity_points?: number | null;
    }) => {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create sprint');
      }

      const { sprint } = await response.json();
      return sprint as Sprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
    },
  });
}

/**
 * Update a sprint
 */
export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
      updates,
    }: {
      sprintId: string;
      updates: Record<string, unknown>;
    }) => {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update sprint');
      }

      const { sprint } = await response.json();
      return sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.id) });
    },
  });
}

/**
 * Delete a sprint
 */
export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete sprint');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
    },
  });
}

/**
 * Start a sprint (transition from planning → active)
 */
export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await fetch(`/api/sprints/${sprintId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start sprint');
      }

      const { sprint } = await response.json();
      return sprint as Sprint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.id) });
    },
  });
}

/**
 * Complete a sprint (transition from active → completed, creates snapshot)
 */
export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
      incompleteAction,
      nextSprintId,
    }: {
      sprintId: string;
      incompleteAction?: 'backlog' | 'next_sprint';
      nextSprintId?: string;
    }) => {
      const payload: Record<string, unknown> = {};
      if (incompleteAction) payload.incomplete_action = incompleteAction;
      if (nextSprintId) payload.next_sprint_id = nextSprintId;

      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete sprint');
      }

      const data = await response.json();
      return {
        sprint: data.sprint as Sprint,
        snapshot: (data.snapshot ?? null) as SprintSnapshot | null,
        phase_transition: (data.phase_transition ?? null) as
          | { from: string; to: string }
          | null,
        reviewer_sla: data.reviewer_sla ?? null,
        settlement_blockers: data.settlement_blockers ?? null,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.sprint.id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.timeline() });
    },
  });
}
