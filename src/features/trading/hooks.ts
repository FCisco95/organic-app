'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HoldingStatsResponse, HoldingSyncResponse } from './types';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';

export const holdingKeys = {
  all: ['holding'] as const,
  stats: (days?: number) => [...holdingKeys.all, 'stats', days] as const,
  sync: () => [...holdingKeys.all, 'sync'] as const,
};

export function useHoldingStats(options?: { days?: number; enabled?: boolean }) {
  const qs = buildQueryString({ days: options?.days });

  return useQuery({
    queryKey: holdingKeys.stats(options?.days),
    queryFn: async () => fetchJson<HoldingStatsResponse>(`/api/trading/stats${qs}`),
    enabled: options?.enabled ?? true,
  });
}

export function useSyncHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      fetchJson<HoldingSyncResponse>('/api/trading/sync', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
    },
  });
}
