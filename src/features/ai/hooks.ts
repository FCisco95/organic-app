'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { GovernanceSummary } from './types';

export const governanceSummaryKeys = {
  all: ['governance-summary'] as const,
  latest: () => [...governanceSummaryKeys.all, 'latest'] as const,
};

export function useGovernanceSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: governanceSummaryKeys.latest(),
    queryFn: async (): Promise<GovernanceSummary | null> => {
      const json = await fetchJson<{ data: GovernanceSummary | null }>(
        '/api/ai/governance-summary'
      );
      return json.data;
    },
    staleTime: 300_000, // 5 min
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}
