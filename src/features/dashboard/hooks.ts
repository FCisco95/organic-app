'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { DashboardPayload, PresencePayload } from './types';

const DASHBOARD_REFRESH_MS = 60_000;
const PRESENCE_REFRESH_MS = 60_000;

const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
  presence: () => [...dashboardKeys.all, 'presence'] as const,
};

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: async (): Promise<DashboardPayload> => {
      const { data } = await fetchJson<{ data: DashboardPayload; error: string | null }>(
        '/api/dashboard'
      );
      return data;
    },
    staleTime: DASHBOARD_REFRESH_MS / 2,
    refetchInterval: DASHBOARD_REFRESH_MS,
    refetchOnWindowFocus: false,
  });
}

export function usePresence() {
  return useQuery({
    queryKey: dashboardKeys.presence(),
    queryFn: async (): Promise<PresencePayload> => {
      const { data } = await fetchJson<{ data: PresencePayload; error: string | null }>(
        '/api/presence'
      );
      return data;
    },
    staleTime: PRESENCE_REFRESH_MS / 2,
    refetchInterval: PRESENCE_REFRESH_MS,
    refetchOnWindowFocus: false,
  });
}
