'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { OrganizationWithVoting } from './types';
import type { SettingsPatchInput } from './schemas';

export const settingsKeys = {
  all: ['settings'] as const,
  org: () => [...settingsKeys.all, 'org'] as const,
};

export function useOrganization() {
  return useQuery({
    queryKey: settingsKeys.org(),
    queryFn: async (): Promise<OrganizationWithVoting> => {
      const json = await fetchJson<{ data: OrganizationWithVoting }>('/api/settings');
      return json.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SettingsPatchInput) => {
      return fetchJson('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
