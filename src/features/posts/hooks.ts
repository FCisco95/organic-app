'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddPostCommentInput,
  CreatePostInput,
  ModeratePostInput,
  PostSortInput,
  UpdatePostInput,
} from './schemas';
import type {
  PostCommentsResponse,
  PostDetail,
  PostFeedResponse,
  PostListItem,
} from './types';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';

export interface UserPointsData {
  claimable_points: number;
  total_points: number;
  weekly_organic_posts: number;
  free_organic_remaining: number;
  weekly_engagement_points: number;
  weekly_engagement_cap: number;
  costs: {
    non_organic: Record<string, number>;
    organic_paid: Record<string, number>;
  };
}

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (sort: PostSortInput, search: string, type?: string) =>
    [...postKeys.lists(), sort, search, type ?? 'all'] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (postId: string) => [...postKeys.details(), postId] as const,
  comments: (postId: string) => [...postKeys.all, 'comments', postId] as const,
  userPoints: () => ['user-points'] as const,
};

export function usePosts(options?: { sort?: PostSortInput; search?: string; type?: string; organic?: string; enabled?: boolean }) {
  const sort = options?.sort ?? 'new';
  const search = options?.search?.trim() ?? '';
  const type = options?.type;
  const organic = options?.organic;
  const qs = buildQueryString({ sort, search, type, organic });

  return useQuery({
    queryKey: postKeys.list(sort, search, type ? `${type}${organic ? ':organic' : ''}` : organic),
    queryFn: async () => {
      const data = await fetchJson<PostFeedResponse>(`/api/posts${qs}`);
      return data.items as PostListItem[];
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePost(postId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: async () => fetchJson<PostDetail>(`/api/posts/${postId}`),
    enabled: Boolean(postId) && (options?.enabled ?? true),
  });
}

export function usePostComments(postId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: async () => fetchJson<PostCommentsResponse>(`/api/posts/${postId}/comments`),
    enabled: Boolean(postId) && (options?.enabled ?? true),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) =>
      fetchJson<PostDetail>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.userPoints() });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, updates }: { postId: string; updates: UpdatePostInput }) =>
      fetchJson<PostDetail>(`/api/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(post.id) });
    },
  });
}

export function useModeratePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: ModeratePostInput }) =>
      fetchJson<PostDetail>(`/api/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(action),
      }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(post.id) });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) =>
      fetchJson<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`, {
        method: 'POST',
      }),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

export function useUserPoints(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: postKeys.userPoints(),
    queryFn: async () => fetchJson<UserPointsData>('/api/user/points'),
    enabled: options?.enabled ?? true,
    staleTime: 30_000, // 30s — balance doesn't change that fast
  });
}

export function usePromotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, tier }: { postId: string; tier: string }) =>
      fetchJson(`/api/posts/${postId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ tier }),
      }),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.userPoints() });
    },
  });
}

export function useFlagPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) =>
      fetchJson<{ flagged: boolean; flag_count: number; bonus_revoked: boolean }>(
        `/api/posts/${postId}/flag`,
        { method: 'POST' }
      ),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

export function useAddPostComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, input }: { postId: string; input: AddPostCommentInput }) =>
      fetchJson(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
