'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';
import type { TaskWithRelations, TaskDependency, SubtaskSummary } from '../types';
import type { AddDependencyInput, CreateSubtaskInput } from '../schemas';
import { taskKeys } from './keys';

// ─── Dependencies ────────────────────────────────────────────────────────

/**
 * Fetch dependencies for a task (tasks that block this task)
 */
export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: taskKeys.dependencies(taskId),
    queryFn: async () => {
      const result = await fetchJson<{
        dependencies?: TaskDependency[];
        blocked_by_this?: TaskDependency[];
      }>(`/api/tasks/${taskId}/dependencies`);
      return {
        dependencies: (result.dependencies ?? []) as TaskDependency[],
        blocked_by_this: (result.blocked_by_this ?? []) as TaskDependency[],
      };
    },
    enabled: !!taskId,
  });
}

/**
 * Add a dependency to a task
 */
export function useAddDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, input }: { taskId: string; input: AddDependencyInput }) => {
      return fetchJson(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({
        queryKey: taskKeys.dependencies(variables.input.depends_on_task_id),
      });
    },
  });
}

/**
 * Remove a dependency from a task
 */
export function useRemoveDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      dependencyId,
    }: {
      taskId: string;
      dependencyId: string;
      dependsOnTaskId?: string;
    }) => {
      const qs = buildQueryString({ id: dependencyId });
      return fetchJson(`/api/tasks/${taskId}/dependencies${qs}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      if (variables.dependsOnTaskId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.dependencies(variables.dependsOnTaskId),
        });
      }
    },
  });
}

// ─── Subtasks ────────────────────────────────────────────────────────────

/**
 * Fetch subtasks for a parent task
 */
export function useSubtasks(parentTaskId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.subtasks(parentTaskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id, name, email, organic_id, avatar_url
          )
        `
        )
        .eq('parent_task_id', parentTaskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as TaskWithRelations[];
    },
    enabled: !!parentTaskId,
  });
}

/**
 * Get subtask progress summary for a parent task
 */
export function useSubtaskProgress(parentTaskId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...taskKeys.subtasks(parentTaskId), 'progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('parent_task_id', parentTaskId);

      if (error) throw error;

      const total = data?.length ?? 0;
      const completed = data?.filter((t) => t.status === 'done').length ?? 0;

      return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      } as SubtaskSummary;
    },
    enabled: !!parentTaskId,
  });
}

/**
 * Create a subtask under a parent task
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      input,
    }: {
      parentTaskId: string;
      input: CreateSubtaskInput;
    }) => {
      return fetchJson(`/api/tasks/${parentTaskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
