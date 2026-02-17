'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsData } from './types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  data: () => [...analyticsKeys.all, 'data'] as const,
};

export function useAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.data(),
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      return json.data;
    },
    staleTime: 300_000, // 5 minutes — analytics data is slow-changing
    refetchInterval: 300_000,
    refetchOnWindowFocus: false,
  });
}
