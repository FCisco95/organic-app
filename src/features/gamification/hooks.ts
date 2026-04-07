'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
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
      const json = await fetchJson<Record<string, unknown>>('/api/gamification/overview');
      return gamificationOverviewSchema.parse(json);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

export function useQuestProgress(options?: { enabled?: boolean; live?: boolean }) {
  // Default to non-live to avoid burning serverless CPU on every page that
  // mounts a quest component. Pass `live: true` explicitly on the dedicated
  // quests page if real-time refresh is needed.
  const live = options?.live ?? false;

  return useQuery({
    queryKey: gamificationKeys.quests(),
    queryFn: async (): Promise<QuestProgressResponse> => {
      const json = await fetchJson<Record<string, unknown>>('/api/gamification/quests');
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
      const json = await fetchJson<Record<string, unknown>>('/api/referrals');
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
      const json = await fetchJson<Record<string, unknown>>('/api/gamification/burn-cost');
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
      return fetchJson('/api/gamification/burn', {
        method: 'POST',
      });
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
      const json = await fetchJson<{ data: QuestDefinitionRow[] }>('/api/admin/quests');
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
      return fetchJson('/api/admin/quests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
      return fetchJson(`/api/admin/quests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
      return fetchJson(`/api/admin/quests/${id}`, {
        method: 'DELETE',
      });
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
      return fetchJson('/api/admin/gamification/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}
