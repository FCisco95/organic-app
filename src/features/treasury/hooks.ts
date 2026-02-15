'use client';

import { useQuery } from '@tanstack/react-query';
import type { TreasuryData } from './types';

export const treasuryKeys = {
  all: ['treasury'] as const,
  data: () => [...treasuryKeys.all, 'data'] as const,
};

export function useTreasury() {
  return useQuery({
    queryKey: treasuryKeys.data(),
    queryFn: async (): Promise<TreasuryData> => {
      const res = await fetch('/api/treasury');
      if (!res.ok) throw new Error('Failed to fetch treasury data');
      const json = await res.json();
      return json.data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
  });
}
