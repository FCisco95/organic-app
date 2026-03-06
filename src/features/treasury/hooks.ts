'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { TreasuryData } from './types';

export const treasuryKeys = {
  all: ['treasury'] as const,
  data: () => [...treasuryKeys.all, 'data'] as const,
};

export function useTreasury() {
  return useQuery({
    queryKey: treasuryKeys.data(),
    queryFn: async (): Promise<TreasuryData> => {
      const json = await fetchJson<{ data: TreasuryData }>('/api/treasury');
      return json.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}
