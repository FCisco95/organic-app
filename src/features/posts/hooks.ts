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

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (sort: PostSortInput, search: string, type?: string) =>
    [...postKeys.lists(), sort, search, type ?? 'all'] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (postId: string) => [...postKeys.details(), postId] as const,
  comments: (postId: string) => [...postKeys.all, 'comments', postId] as const,
};

export function usePosts(options?: { sort?: PostSortInput; search?: string; type?: string; enabled?: boolean }) {
  const sort = options?.sort ?? 'new';
  const search = options?.search?.trim() ?? '';
  const type = options?.type;
  const qs = buildQueryString({ sort, search, type });

  return useQuery({
    queryKey: postKeys.list(sort, search, type),
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
