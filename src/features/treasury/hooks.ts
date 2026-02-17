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
    staleTime: 300_000, // 5 minutes — on-chain data doesn't change that fast
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  });
}
