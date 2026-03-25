'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { AnalyticsData, AnalyticsPreset, MarketAnalyticsData } from './types';
import { ANALYTICS_PRESETS } from './types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  data: (preset?: AnalyticsPreset) => [...analyticsKeys.all, 'data', preset ?? '30d'] as const,
  market: () => [...analyticsKeys.all, 'market'] as const,
};

export function useAnalytics(preset: AnalyticsPreset = '30d') {
  const { days, weeks, months } = ANALYTICS_PRESETS[preset];

  return useQuery({
    queryKey: analyticsKeys.data(preset),
    queryFn: async (): Promise<AnalyticsData> => {
      const params = new URLSearchParams({
        days: String(days),
        weeks: String(weeks),
        months: String(months),
      });
      const json = await fetchJson<{ data: AnalyticsData }>(`/api/analytics?${params}`);
      return json.data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}

export function useMarketAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.market(),
    queryFn: async (): Promise<MarketAnalyticsData> => {
      const json = await fetchJson<{ data: MarketAnalyticsData }>('/api/analytics/market');
      return json.data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}
