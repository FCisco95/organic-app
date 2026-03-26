'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { PersonalAnalyticsData } from './personal-types';

export const personalAnalyticsKeys = {
  all: ['personal-analytics'] as const,
  data: () => [...personalAnalyticsKeys.all, 'data'] as const,
};

export function usePersonalAnalytics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: personalAnalyticsKeys.data(),
    queryFn: async (): Promise<PersonalAnalyticsData> => {
      return fetchJson<PersonalAnalyticsData>('/api/analytics/personal');
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}
