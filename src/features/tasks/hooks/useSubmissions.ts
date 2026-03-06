'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import type { TaskSubmissionWithReviewer, TaskAssigneeWithUser } from '../types';
import type { TaskSubmissionInput, ReviewSubmissionInput } from '../schemas';
import { taskKeys, TASK_SUBMISSION_REVIEW_COLUMNS } from './keys';

/**
 * Fetch submissions pending review
 */
export function usePendingReviewSubmissions() {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.pendingReview(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(
          `
          ${TASK_SUBMISSION_REVIEW_COLUMNS},
          user:user_profiles!task_submissions_user_id_profile_fkey(id, name, email, organic_id, avatar_url),
          task:tasks!task_submissions_task_id_fkey(id, title, task_type, base_points)
        `
        )
        .eq('review_status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
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
      const data = await fetchJson<{ submission: { task_id: string } }>(`/api/tasks/${taskId}/submissions`, {
        method: 'POST',
        body: JSON.stringify(submission),
      });
      return data.submission;
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
      const data = await fetchJson<{ submission: { task_id: string } }>(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        body: JSON.stringify(review),
      });
      return data.submission;
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
          user:user_profiles!task_submissions_user_id_profile_fkey(
            id, name, email, organic_id, avatar_url
          ),
          reviewer:user_profiles!task_submissions_reviewer_id_profile_fkey(
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
