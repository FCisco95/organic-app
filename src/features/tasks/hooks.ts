'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  TaskAssigneeWithUser,
  TaskSubmissionWithReviewer,
  TaskWithRelations,
  TaskDependency,
  TaskTemplate,
  TaskTemplateWithCreator,
  SubtaskSummary,
} from './types';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskSubmissionInput,
  ReviewSubmissionInput,
  TaskFilters,
  AddDependencyInput,
  CreateSubtaskInput,
  CreateTemplateInput,
  UpdateTemplateInput,
} from './schemas';

const TASK_SUBMISSION_REVIEW_COLUMNS =
  'id, task_id, user_id, submission_type, content_link, content_text, description, pr_link, file_urls, custom_fields, testing_notes, revision_notes, reach_metrics, review_status, quality_score, earned_points, reviewer_id, reviewer_notes, rejection_reason, submitted_at, reviewed_at, created_at, updated_at';
const TASK_TEMPLATE_COLUMNS =
  'id, name, description, task_type, priority, base_points, labels, is_team_task, max_assignees, default_assignee_id, is_recurring, recurrence_rule, org_id, created_by, created_at, updated_at';

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
  // Phase 12
  dependencies: (taskId: string) => [...taskKeys.all, 'dependencies', taskId] as const,
  subtasks: (taskId: string) => [...taskKeys.all, 'subtasks', taskId] as const,
  templates: () => [...taskKeys.all, 'templates'] as const,
  template: (id: string) => [...taskKeys.all, 'template', id] as const,
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
        .select(TASK_SUBMISSION_REVIEW_COLUMNS)
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
 * Create a new task via API route (server-side validated)
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const { task } = await response.json();
      return task;
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

// ============================================
// Phase 12: Dependencies
// ============================================

/**
 * Fetch dependencies for a task (tasks that block this task)
 */
export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: taskKeys.dependencies(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/dependencies`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch dependencies');
      }
      const result = await response.json();
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
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add dependency');
      }

      return response.json();
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
      const response = await fetch(`/api/tasks/${taskId}/dependencies?id=${dependencyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove dependency');
      }

      return response.json();
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

// ============================================
// Phase 12: Subtasks
// ============================================

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
      const response = await fetch(`/api/tasks/${parentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create subtask');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

// ============================================
// Phase 12: Task Templates
// ============================================

/**
 * Fetch all task templates
 */
export function useTaskTemplates() {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select(TASK_TEMPLATE_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskTemplateWithCreator[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single task template
 */
export function useTaskTemplate(templateId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.template(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select(TASK_TEMPLATE_COLUMNS)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a task template (council/admin only)
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const response = await fetch('/api/tasks/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });
}

/**
 * Update a task template (council/admin only)
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      input,
    }: {
      templateId: string;
      input: UpdateTemplateInput;
    }) => {
      const response = await fetch(`/api/tasks/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update template');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
      queryClient.invalidateQueries({ queryKey: taskKeys.template(variables.templateId) });
    },
  });
}

/**
 * Delete a task template (council/admin only)
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/tasks/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });
}

/**
 * Create a task from a template (any member with organic_id)
 */
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sprintId,
      overrides,
    }: {
      templateId: string;
      sprintId?: string;
      overrides?: { title?: string; description?: string };
    }) => {
      const response = await fetch(`/api/tasks/templates/${templateId}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprint_id: sprintId, ...overrides }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task from template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
