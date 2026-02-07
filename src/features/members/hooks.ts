'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MembersResponse, MemberProfile, MemberFilters } from './types';

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: Partial<MemberFilters>) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

export function useMembers(filters: Partial<MemberFilters> = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role && filters.role !== 'all') params.set('role', filters.role);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery({
    queryKey: memberKeys.list(filters),
    queryFn: async (): Promise<MembersResponse> => {
      const res = await fetch(`/api/members?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async (): Promise<MemberProfile> => {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) throw new Error('Failed to fetch member');
      const json = await res.json();
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
      const res = await fetch('/api/members/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_visible: visible }),
      });
      if (!res.ok) throw new Error('Failed to update privacy');
      return res.json();
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
      const res = await fetch(`/api/settings/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update member role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}
