'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TaskAssigneeWithUser, TaskSubmissionWithReviewer, TaskWithRelations } from './types';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskSubmissionInput,
  ReviewSubmissionInput,
  TaskFilters,
} from './schemas';

// Query keys
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
};

/**
 * Fetch tasks with optional filters
 */
export function useTasks(filters: TaskFilters = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.list(filters),
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
        query = query.in('status', ['backlog', 'todo']).is('assignee_id', null);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
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
            user:user_profiles!task_submissions_user_id_fkey(
              id, name, email, organic_id, avatar_url
            ),
            reviewer:user_profiles!task_submissions_reviewer_id_fkey(
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
      const assignees = task.is_team_task ? (task.assignees ?? []) : [];

      return {
        ...task,
        assignees,
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
      // Fetch solo tasks assigned to user
      const { data: soloTasks, error: soloError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          sprint:sprints(id, name, status)
        `
        )
        .eq('assignee_id', userId)
        .neq('status', 'done')
        .order('priority', { ascending: true });

      if (soloError) throw soloError;

      // Fetch team tasks where user is an assignee
      const { data: teamAssignments, error: teamError } = (await supabase
        .from('task_assignees')
        .select(
          `
          task:tasks(
            *,
            sprint:sprints(id, name, status)
          )
        `
        )
        .eq('user_id', userId)) as unknown as {
        data: { task: TaskWithRelations | null }[] | null;
        error: Error | null;
      };

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
 * Fetch submissions pending review
 */
export function usePendingReviewSubmissions() {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.pendingReview(),
    queryFn: async () => {
      const { data: submissions, error } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('review_status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      if (!submissions || submissions.length === 0) return [];

      const userIds = Array.from(new Set(submissions.map((s) => s.user_id)));
      const taskIds = Array.from(new Set(submissions.map((s) => s.task_id)));

      const [{ data: users, error: userError }, { data: tasks, error: taskError }] =
        await Promise.all([
          supabase
            .from('user_profiles')
            .select('id, name, email, organic_id, avatar_url')
            .in('id', userIds),
          supabase.from('tasks').select('id, title, task_type, base_points').in('id', taskIds),
        ]);

      if (userError) throw userError;
      if (taskError) throw taskError;

      const userMap = new Map((users ?? []).map((user) => [user.id, user]));
      const taskMap = new Map((tasks ?? []).map((task) => [task.id, task]));

      return submissions.map((submission) => ({
        ...submission,
        user: userMap.get(submission.user_id) ?? null,
        task: taskMap.get(submission.task_id) ?? null,
      }));
    },
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          points: input.base_points,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const response = await fetch(`/api/tasks/${taskId}/claim`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim task');
      }

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
      const response = await fetch(`/api/tasks/${taskId}/claim`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unclaim task');
      }

      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
    },
  });
}

/**
 * Submit work for a task
 */
export function useSubmitTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      submission,
    }: {
      taskId: string;
      submission: TaskSubmissionInput;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit task');
      }

      const { submission: createdSubmission } = await response.json();
      return createdSubmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.pendingReview() });
    },
  });
}

/**
 * Review a submission (approve/reject with quality score)
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      review,
    }: {
      submissionId: string;
      review: ReviewSubmissionInput;
    }) => {
      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to review submission');
      }

      const { submission } = await response.json();
      return submission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.pendingReview() });
    },
  });
}

/**
 * Fetch task submissions for a specific task
 */
export function useTaskSubmissions(taskId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.submissions(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(
          `
          *,
          user:user_profiles!task_submissions_user_id_fkey(
            id, name, email, organic_id, avatar_url
          ),
          reviewer:user_profiles!task_submissions_reviewer_id_fkey(
            id, name, email, organic_id
          )
        `
        )
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as unknown as TaskSubmissionWithReviewer[];
    },
    enabled: !!taskId,
  });
}

/**
 * Fetch assignees for a team task
 */
export function useTaskAssignees(taskId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.assignees(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignees')
        .select(
          `
          *,
          user:user_profiles(id, name, email, organic_id, avatar_url)
        `
        )
        .eq('task_id', taskId)
        .order('claimed_at', { ascending: true });

      if (error) throw error;
      return data as unknown as TaskAssigneeWithUser[];
    },
    enabled: !!taskId,
  });
}
