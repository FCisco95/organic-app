'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';
import type { MembersResponse, MemberProfile, MemberFilters } from './types';

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: Partial<MemberFilters>) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

export function useMembers(filters: Partial<MemberFilters> = {}) {
  const qs = buildQueryString({
    search: filters.search,
    role: filters.role === 'all' ? undefined : filters.role,
    page: filters.page,
    limit: filters.limit,
  });

  return useQuery({
    queryKey: memberKeys.list(filters),
    queryFn: async (): Promise<MembersResponse> => {
      const json = await fetchJson<{ data: MembersResponse }>(`/api/members${qs}`);
      return json.data;
    },
    staleTime: 30_000,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async (): Promise<MemberProfile> => {
      const json = await fetchJson<{ data: MemberProfile }>(`/api/members/${id}`);
      return json.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visible: boolean) => {
      return fetchJson('/api/members/privacy', {
        method: 'PATCH',
        body: JSON.stringify({ profile_visible: visible }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return fetchJson(`/api/settings/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}
