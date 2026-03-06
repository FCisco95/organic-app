'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import type { TaskWithRelations } from '../types';
import type { CreateTaskInput, UpdateTaskInput, TaskFilters } from '../schemas';
import { taskKeys } from './keys';

/**
 * Fetch tasks with optional filters
 */
export function useTasks(filters: TaskFilters = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.list(filters),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id, name, email, organic_id, avatar_url
          ),
          sprint:sprints(id, name, status)
        `
        )
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.task_type) {
        query = query.eq('task_type', filters.task_type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.sprint_id === null) {
        query = query.is('sprint_id', null);
      } else if (filters.sprint_id) {
        query = query.eq('sprint_id', filters.sprint_id);
      }
      if (filters.assignee_id === null) {
        query = query.is('assignee_id', null);
      } else if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters.is_claimable) {
        query = query.in('status', ['backlog', 'todo', 'in_progress']);
      }
      if (filters.search) {
        query = query.textSearch('search_vector', filters.search, {
          type: 'websearch',
          config: 'english',
        });
      }
      if (filters.labels && filters.labels.length > 0) {
        query = query.overlaps('labels', filters.labels);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as TaskWithRelations[];
    },
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.detail(taskId),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id, name, email, organic_id, avatar_url
          ),
          sprint:sprints(id, name, status),
          assignees:task_assignees(
            *,
            user:user_profiles(id, name, email, organic_id, avatar_url)
          ),
          submissions:task_submissions(
            *,
            user:user_profiles!task_submissions_user_id_profile_fkey(
              id, name, email, organic_id, avatar_url
            ),
            reviewer:user_profiles!task_submissions_reviewer_id_profile_fkey(
              id, name, email, organic_id
            )
          )
        `
        )
        .eq('id', taskId)
        .order('submitted_at', { ascending: false, foreignTable: 'task_submissions' })
        .single();

      if (error) throw error;

      const task = data as unknown as TaskWithRelations;

      return {
        ...task,
        assignees: task.assignees ?? [],
        submissions: task.submissions ?? [],
      } as unknown as TaskWithRelations;
    },
    enabled: !!taskId,
  });
}

/**
 * Fetch user's assigned tasks
 */
export function useMyTasks(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.myTasks(userId),
    queryFn: async () => {
      // Run both queries in parallel — they are independent
      const [soloResult, teamResult] = await Promise.all([
        supabase
          .from('tasks')
          .select(
            `
            *,
            sprint:sprints(id, name, status)
          `
          )
          .eq('assignee_id', userId)
          .neq('status', 'done')
          .order('priority', { ascending: true }),
        supabase
          .from('task_assignees')
          .select(
            `
            task:tasks(
              *,
              sprint:sprints(id, name, status)
            )
          `
          )
          .eq('user_id', userId),
      ]);

      const { data: soloTasks, error: soloError } = soloResult;
      const { data: teamAssignments, error: teamError } = teamResult as unknown as {
        data: { task: TaskWithRelations | null }[] | null;
        error: Error | null;
      };

      if (soloError) throw soloError;
      if (teamError) throw teamError;

      const teamTasks = (teamAssignments ?? [])
        .map((assignment) => assignment.task as TaskWithRelations | null)
        .filter((task): task is TaskWithRelations => !!task && task.status !== 'done');

      return [...(soloTasks ?? []), ...teamTasks] as unknown as TaskWithRelations[];
    },
    enabled: !!userId,
  });
}

/**
 * Fetch claimable tasks
 */
export function useClaimableTasks() {
  return useTasks({ is_claimable: true });
}

/**
 * Create a new task via API route (server-side validated)
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const data = await fetchJson<{ task: unknown }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: UpdateTaskInput }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Claim a task (self-assign)
 */
export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await fetchJson(`/api/tasks/${taskId}/claim`, { method: 'POST' });
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.claimable() });
    },
  });
}

/**
 * Unclaim a task
 */
export function useUnclaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await fetchJson(`/api/tasks/${taskId}/claim`, { method: 'DELETE' });
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
    },
  });
}
