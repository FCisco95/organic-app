'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrganizationWithVoting } from './types';

export const settingsKeys = {
  all: ['settings'] as const,
  org: () => [...settingsKeys.all, 'org'] as const,
};

export function useOrganization() {
  return useQuery({
    queryKey: settingsKeys.org(),
    queryFn: async (): Promise<OrganizationWithVoting> => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch organization settings');
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
