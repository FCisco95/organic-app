'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';
import type {
  UserReputation,
  AchievementWithStatus,
  AchievementSet,
  XpEvent,
  CheckLevelUpResponse,
  LeaderboardEntry,
  LeaderboardResponse,
} from './types';

// ─── Query Key Factory ─────────────────────────────────────────────────

export const reputationKeys = {
  all: ['reputation'] as const,
  user: (userId?: string) => [...reputationKeys.all, 'user', userId ?? 'me'] as const,
  achievements: (userId?: string) => [...reputationKeys.all, 'achievements', userId ?? 'me'] as const,
  leaderboard: (fresh?: boolean) =>
    [...reputationKeys.all, 'leaderboard', fresh ? 'fresh' : 'cached'] as const,
  xpHistory: (userId?: string, limit?: number) =>
    [...reputationKeys.all, 'xp-history', userId ?? 'me', limit] as const,
  levelUp: () => [...reputationKeys.all, 'level-up'] as const,
};

// ─── useReputation ─────────────────────────────────────────────────────

export function useReputation(userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reputationKeys.user(userId),
    queryFn: async (): Promise<UserReputation> => {
      const url = userId ? `/api/reputation/${userId}` : '/api/reputation';
      return fetchJson<UserReputation>(url);
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

// ─── useAchievements ───────────────────────────────────────────────────

interface AchievementsResponse {
  achievements: AchievementWithStatus[];
  sets: AchievementSet[];
}

export function useAchievements(userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reputationKeys.achievements(userId),
    queryFn: async (): Promise<AchievementWithStatus[]> => {
      const qs = buildQueryString({ userId });
      const data = await fetchJson<AchievementsResponse>(`/api/achievements${qs}`);
      return data.achievements;
    },
    staleTime: 60_000,
    enabled: options?.enabled,
  });
}

// ─── useAchievementsWithSets ──────────────────────────────────────────

export function useAchievementsWithSets(userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...reputationKeys.achievements(userId), 'with-sets'],
    queryFn: async (): Promise<AchievementsResponse> => {
      const qs = buildQueryString({ userId });
      return fetchJson<AchievementsResponse>(`/api/achievements${qs}`);
    },
    staleTime: 60_000,
    enabled: options?.enabled,
  });
}

// ─── useLeaderboard ────────────────────────────────────────────────────

export function useLeaderboard(options?: { enabled?: boolean; fresh?: boolean }) {
  const fresh = options?.fresh === true;

  return useQuery({
    queryKey: reputationKeys.leaderboard(fresh),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const qs = buildQueryString({ fresh: fresh ? 1 : undefined });
      const data = await fetchJson<LeaderboardResponse>(`/api/leaderboard${qs}`);
      return data.leaderboard ?? [];
    },
    staleTime: fresh ? 0 : 30_000,
    enabled: options?.enabled,
  });
}

// ─── useXpHistory ──────────────────────────────────────────────────────

export function useXpHistory(userId?: string, limit: number = 20) {
  return useQuery({
    queryKey: reputationKeys.xpHistory(userId, limit),
    queryFn: async (): Promise<XpEvent[]> => {
      const qs = buildQueryString({ history: true, limit, userId });
      const data = await fetchJson<{ recent_xp_events?: XpEvent[] }>(`/api/reputation${qs}`);
      return data.recent_xp_events ?? [];
    },
    staleTime: 30_000,
  });
}

// ─── useCheckLevelUp (mutation) ────────────────────────────────────────

export function useCheckLevelUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CheckLevelUpResponse> => {
      return fetchJson<CheckLevelUpResponse>('/api/reputation/check-levelup', { method: 'POST' });
    },
    onSuccess: () => {
      // Invalidate reputation queries to reflect new achievements / XP
      queryClient.invalidateQueries({ queryKey: reputationKeys.all });
    },
  });
}
