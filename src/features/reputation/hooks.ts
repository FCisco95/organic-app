'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UserReputation,
  AchievementWithStatus,
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
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch reputation');
      return res.json();
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

// ─── useAchievements ───────────────────────────────────────────────────

export function useAchievements(userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reputationKeys.achievements(userId),
    queryFn: async (): Promise<AchievementWithStatus[]> => {
      const params = userId ? `?userId=${userId}` : '';
      const res = await fetch(`/api/achievements${params}`);
      if (!res.ok) throw new Error('Failed to fetch achievements');
      const data = await res.json();
      return data.achievements;
    },
    staleTime: 60_000,
    enabled: options?.enabled,
  });
}

// ─── useLeaderboard ────────────────────────────────────────────────────

export function useLeaderboard(options?: { enabled?: boolean; fresh?: boolean }) {
  const fresh = options?.fresh === true;
  const querySuffix = fresh ? '?fresh=1' : '';

  return useQuery({
    queryKey: reputationKeys.leaderboard(fresh),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await fetch(`/api/leaderboard${querySuffix}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data: LeaderboardResponse = await res.json();
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
      const params = new URLSearchParams({ limit: String(limit) });
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/reputation?history=true&${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch XP history');
      const data = await res.json();
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
      const res = await fetch('/api/reputation/check-levelup', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to check level up');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate reputation queries to reflect new achievements / XP
      queryClient.invalidateQueries({ queryKey: reputationKeys.all });
    },
  });
}
