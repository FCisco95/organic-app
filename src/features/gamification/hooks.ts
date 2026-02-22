'use client';

import { useQuery } from '@tanstack/react-query';
import type { GamificationOverview, QuestProgressResponse } from './types';
import { gamificationOverviewSchema, questProgressResponseSchema } from './schemas';

export const gamificationKeys = {
  all: ['gamification'] as const,
  overview: () => [...gamificationKeys.all, 'overview'] as const,
  quests: () => [...gamificationKeys.all, 'quests'] as const,
};

export function useGamificationOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gamificationKeys.overview(),
    queryFn: async (): Promise<GamificationOverview> => {
      const res = await fetch('/api/gamification/overview');
      if (!res.ok) {
        throw new Error('Failed to fetch gamification overview');
      }
      const json = await res.json();
      return gamificationOverviewSchema.parse(json);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

export function useQuestProgress(options?: { enabled?: boolean; live?: boolean }) {
  const live = options?.live ?? true;

  return useQuery({
    queryKey: gamificationKeys.quests(),
    queryFn: async (): Promise<QuestProgressResponse> => {
      const res = await fetch('/api/gamification/quests');
      if (!res.ok) {
        throw new Error('Failed to fetch quest progress');
      }
      const json = await res.json();
      return questProgressResponseSchema.parse(json);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: live ? 60_000 : false,
    enabled: options?.enabled,
  });
}
