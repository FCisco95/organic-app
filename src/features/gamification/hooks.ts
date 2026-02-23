'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GamificationOverview,
  QuestProgressResponse,
  ReferralStats,
  BurnCostInfo,
  QuestDefinitionRow,
} from './types';
import type { GamificationConfigInput } from './schemas';
import {
  gamificationOverviewSchema,
  questProgressResponseSchema,
  referralStatsSchema,
  burnCostSchema,
} from './schemas';

export const gamificationKeys = {
  all: ['gamification'] as const,
  overview: () => [...gamificationKeys.all, 'overview'] as const,
  quests: () => [...gamificationKeys.all, 'quests'] as const,
  referrals: () => [...gamificationKeys.all, 'referrals'] as const,
  burnCost: () => [...gamificationKeys.all, 'burn-cost'] as const,
  adminQuests: () => [...gamificationKeys.all, 'admin-quests'] as const,
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

// ─── Referral Hooks ─────────────────────────────────────────────────────

export function useReferralStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gamificationKeys.referrals(),
    queryFn: async (): Promise<ReferralStats> => {
      const res = await fetch('/api/referrals');
      if (!res.ok) {
        throw new Error('Failed to fetch referral stats');
      }
      const json = await res.json();
      return referralStatsSchema.parse(json);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

// ─── Burn Hooks ─────────────────────────────────────────────────────────

export function useBurnCost(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gamificationKeys.burnCost(),
    queryFn: async (): Promise<BurnCostInfo> => {
      const res = await fetch('/api/gamification/burn-cost');
      if (!res.ok) {
        throw new Error('Failed to fetch burn cost');
      }
      const json = await res.json();
      return burnCostSchema.parse(json);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

export function useBurnPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gamification/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to burn points');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}

// ─── Admin Quest Hooks ──────────────────────────────────────────────────

export function useAdminQuests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gamificationKeys.adminQuests(),
    queryFn: async (): Promise<QuestDefinitionRow[]> => {
      const res = await fetch('/api/admin/quests');
      if (!res.ok) {
        throw new Error('Failed to fetch admin quests');
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

export function useCreateQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create quest');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.adminQuests() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.quests() });
    },
  });
}

export function useUpdateQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/admin/quests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update quest');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.adminQuests() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.quests() });
    },
  });
}

export function useDeleteQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/quests/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete quest');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.adminQuests() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.quests() });
    },
  });
}

export function useUpdateGamificationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GamificationConfigInput & { reason: string }) => {
      const res = await fetch('/api/admin/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update gamification config');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}
