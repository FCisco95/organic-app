'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Sprint, SprintSnapshot, SprintWithSnapshot } from './types';

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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Sprint[];
    },
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
        .select('*')
        .eq('sprint_id', sprintId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }
      return data as SprintSnapshot;
    },
    enabled: !!sprintId,
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
        .select('*')
        .eq('status', 'completed')
        .order('end_at', { ascending: false });

      if (sprintError) throw sprintError;
      if (!sprints || sprints.length === 0) return [];

      const sprintIds = sprints.map((s) => s.id);
      const { data: snapshots, error: snapError } = await supabase
        .from('sprint_snapshots')
        .select('*')
        .in('sprint_id', sprintIds);

      if (snapError) throw snapError;

      const snapshotMap = new Map((snapshots ?? []).map((s: SprintSnapshot) => [s.sprint_id, s]));

      return sprints.map(
        (sprint): SprintWithSnapshot => ({
          ...sprint,
          snapshot: snapshotMap.get(sprint.id) ?? null,
        })
      );
    },
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
      incompleteAction: 'backlog' | 'next_sprint';
      nextSprintId?: string;
    }) => {
      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomplete_action: incompleteAction,
          next_sprint_id: nextSprintId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete sprint');
      }

      const { sprint, snapshot } = await response.json();
      return { sprint: sprint as Sprint, snapshot };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.sprint.id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.timeline() });
    },
  });
}
