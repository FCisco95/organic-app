'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddIdeaCommentInput,
  CreateIdeaInput,
  IdeaSortInput,
  UpdateIdeaInput,
  VoteIdeaInput,
} from './schemas';
import type {
  IdeaCommentsResponse,
  IdeaDetail,
  IdeaFeedResponse,
  IdeaListItem,
  IdeasKpisResponse,
} from './types';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';

export const ideaKeys = {
  all: ['ideas'] as const,
  lists: () => [...ideaKeys.all, 'list'] as const,
  list: (sort: IdeaSortInput, search: string) => [...ideaKeys.lists(), sort, search] as const,
  details: () => [...ideaKeys.all, 'detail'] as const,
  detail: (ideaId: string) => [...ideaKeys.details(), ideaId] as const,
  comments: (ideaId: string) => [...ideaKeys.all, 'comments', ideaId] as const,
  kpis: () => [...ideaKeys.all, 'kpis'] as const,
};

export function useIdeas(options?: { sort?: IdeaSortInput; search?: string; enabled?: boolean }) {
  const sort = options?.sort ?? 'hot';
  const search = options?.search?.trim() ?? '';
  const qs = buildQueryString({ sort, search });

  return useQuery({
    queryKey: ideaKeys.list(sort, search),
    queryFn: async () => {
      const data = await fetchJson<IdeaFeedResponse>(`/api/ideas${qs}`);
      return data.items as IdeaListItem[];
    },
    enabled: options?.enabled ?? true,
  });
}

export function useIdea(ideaId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ideaKeys.detail(ideaId),
    queryFn: async () => fetchJson<IdeaDetail>(`/api/ideas/${ideaId}`),
    enabled: Boolean(ideaId) && (options?.enabled ?? true),
  });
}

export function useIdeaComments(ideaId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ideaKeys.comments(ideaId),
    queryFn: async () => fetchJson<IdeaCommentsResponse>(`/api/ideas/${ideaId}/comments`),
    enabled: Boolean(ideaId) && (options?.enabled ?? true),
  });
}

export function useIdeasKpis(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ideaKeys.kpis(),
    queryFn: async () => fetchJson<IdeasKpisResponse>('/api/ideas/kpis'),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIdeaInput) =>
      fetchJson<IdeaDetail>('/api/ideas', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.kpis() });
    },
  });
}

export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, updates }: { ideaId: string; updates: UpdateIdeaInput }) =>
      fetchJson<IdeaDetail>(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: (idea) => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.detail(idea.id) });
    },
  });
}

export function useVoteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, input }: { ideaId: string; input: VoteIdeaInput }) =>
      fetchJson<{ idea: Pick<IdeaDetail, 'id' | 'score' | 'upvotes' | 'downvotes'>; user_vote: -1 | 0 | 1 }>(
        `/api/ideas/${ideaId}/vote`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.detail(variables.ideaId) });
      queryClient.invalidateQueries({ queryKey: ideaKeys.kpis() });
    },
  });
}

export function useAddIdeaComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, input }: { ideaId: string; input: AddIdeaCommentInput }) =>
      fetchJson(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.comments(variables.ideaId) });
      queryClient.invalidateQueries({ queryKey: ideaKeys.detail(variables.ideaId) });
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.kpis() });
    },
  });
}

export function usePromoteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ideaId,
      category,
    }: {
      ideaId: string;
      category?: 'feature' | 'governance' | 'treasury' | 'community' | 'development';
    }) =>
      fetchJson<{ proposal_id: string }>(`/api/ideas/${ideaId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.detail(variables.ideaId) });
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.kpis() });
    },
  });
}
