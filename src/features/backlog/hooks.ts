'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';

export type BacklogVoteResponse = {
  task_id: string;
  upvotes: number;
  downvotes: number;
  my_vote: -1 | 0 | 1;
};

export type BacklogCandidate = {
  id: string;
  title: string;
  description: string | null;
  points: number | null;
  upvotes: number;
  downvotes: number;
  score: number;
};

export type StewardReviewClient = {
  task_id: string;
  summary: string;
  clarity_score: 1 | 2 | 3 | 4 | 5;
  scope_score: 1 | 2 | 3 | 4 | 5;
  concerns: string[];
  recommendation: 'promote' | 'flag' | 'reject';
  generated_by: string;
};

type Envelope<T> = { data: T; error: null } | { data: null; error: string };

function unwrap<T>(envelope: Envelope<T>): T {
  if (envelope.error !== null) throw new Error(envelope.error);
  return envelope.data as T;
}

export function useBacklogVote(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: 'up' | 'down' | 'none'): Promise<BacklogVoteResponse> => {
      const res = await fetchJson<Envelope<BacklogVoteResponse>>(`/api/tasks/${taskId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['backlog'] });
    },
  });
}

export function useMyBacklogVotes() {
  return useQuery({
    queryKey: ['backlog', 'my-votes'],
    queryFn: async (): Promise<Record<string, -1 | 1>> => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase
        .from('backlog_votes')
        .select('task_id, value')
        .eq('user_id', user.id);
      const map: Record<string, -1 | 1> = {};
      for (const row of (data ?? []) as Array<{ task_id: string; value: number }>) {
        map[row.task_id] = row.value as -1 | 1;
      }
      return map;
    },
  });
}

export function useSuggestedN(orgId: string | null) {
  return useQuery({
    queryKey: ['backlog', 'suggest-n', orgId],
    queryFn: async (): Promise<number> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('suggest_promote_n', { p_org_id: orgId });
      if (error) return 3;
      return (data as number) ?? 3;
    },
  });
}

export function useTopCandidates(orgId: string | null, n: number, enabled = true) {
  return useQuery({
    queryKey: ['backlog', 'top', orgId, n],
    enabled,
    queryFn: async (): Promise<BacklogCandidate[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_top_backlog_candidates', {
        p_org_id: orgId,
        p_limit: n,
      });
      if (error || !data) return [];
      return data as BacklogCandidate[];
    },
  });
}

export function useStewardReviews(taskIds: string[]) {
  return useQuery({
    queryKey: ['steward', 'reviews', taskIds.join(',')],
    enabled: taskIds.length > 0,
    queryFn: async (): Promise<Record<string, StewardReviewClient>> => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('task_steward_reviews')
        .select('*')
        .in('task_id', taskIds);
      const map: Record<string, StewardReviewClient> = {};
      for (const row of (data ?? []) as StewardReviewClient[]) map[row.task_id] = row;
      return map;
    },
  });
}

export function useRefreshSteward() {
  return useMutation({
    mutationFn: async (vars: { taskIds: string[]; force?: boolean }) => {
      const res = await fetchJson<Envelope<{ reviews: StewardReviewClient[] }>>(
        `/api/admin/steward/review-backlog`,
        {
          method: 'POST',
          body: JSON.stringify({ task_ids: vars.taskIds, force: vars.force ?? false }),
        },
      );
      return unwrap(res).reviews;
    },
  });
}

export function usePromoteBacklog(sprintId: string) {
  return useMutation({
    mutationFn: async (n: number) => {
      const res = await fetchJson<
        Envelope<{ promoted_task_ids: string[]; n_actually_promoted: number }>
      >(`/api/admin/sprints/${sprintId}/promote-backlog`, {
        method: 'POST',
        body: JSON.stringify({ n }),
      });
      return unwrap(res);
    },
  });
}
