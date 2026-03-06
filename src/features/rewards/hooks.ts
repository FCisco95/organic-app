'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';
import type {
  UserRewardsInfo,
  RewardClaim,
  RewardDistribution,
  RewardsSummary,
} from './types';

// ─── Query Key Factory ─────────────────────────────────────────────

export const rewardsKeys = {
  all: ['rewards'] as const,
  user: () => [...rewardsKeys.all, 'user'] as const,
  claims: (filters?: Record<string, unknown>) => [...rewardsKeys.all, 'claims', filters] as const,
  distributions: (filters?: Record<string, unknown>) =>
    [...rewardsKeys.all, 'distributions', filters] as const,
  summary: () => [...rewardsKeys.all, 'summary'] as const,
};

// ─── useUserRewards ─────────────────────────────────────────────────

export function useUserRewards(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: rewardsKeys.user(),
    queryFn: async (): Promise<UserRewardsInfo> => {
      return fetchJson<UserRewardsInfo>('/api/rewards');
    },
    staleTime: 20_000,
    refetchInterval: options?.enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

// ─── useRewardClaims ────────────────────────────────────────────────

export function useRewardClaims(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: rewardsKeys.claims(filters),
    queryFn: async (): Promise<{ claims: RewardClaim[]; total: number }> => {
      const qs = buildQueryString({
        status: filters?.status,
        page: filters?.page,
        limit: filters?.limit,
      });
      return fetchJson<{ claims: RewardClaim[]; total: number }>(`/api/rewards/claims${qs}`);
    },
    staleTime: 15_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
}

// ─── useSubmitClaim ─────────────────────────────────────────────────

export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { points_amount: number }) => {
      return fetchJson('/api/rewards/claims', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

// ─── useReviewClaim ─────────────────────────────────────────────────

export function useReviewClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      status,
      admin_note,
    }: {
      claimId: string;
      status: 'approved' | 'rejected';
      admin_note?: string;
    }) => {
      return fetchJson(`/api/rewards/claims/${claimId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, admin_note }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

// ─── usePayClaim ────────────────────────────────────────────────────

export function usePayClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ claimId, tx_signature }: { claimId: string; tx_signature: string }) => {
      return fetchJson(`/api/rewards/claims/${claimId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ tx_signature }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

// ─── useDistributions ───────────────────────────────────────────────

export function useDistributions(filters?: {
  type?: string;
  sprint_id?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: rewardsKeys.distributions(filters),
    queryFn: async (): Promise<{ distributions: RewardDistribution[]; total: number }> => {
      const qs = buildQueryString({
        type: filters?.type,
        sprint_id: filters?.sprint_id,
        page: filters?.page,
        limit: filters?.limit,
      });
      return fetchJson<{ distributions: RewardDistribution[]; total: number }>(
        `/api/rewards/distributions${qs}`
      );
    },
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
}

// ─── useManualDistribution ──────────────────────────────────────────

export function useManualDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: {
        distributions: {
          user_id: string;
          token_amount: number;
          category: string;
          reason: string;
        }[];
      }
    ) => {
      return fetchJson('/api/rewards/distributions/manual', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

// ─── useRewardsSummary ──────────────────────────────────────────────

export function useRewardsSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: rewardsKeys.summary(),
    queryFn: async (): Promise<RewardsSummary> => {
      return fetchJson<RewardsSummary>('/api/rewards/summary');
    },
    staleTime: 45_000,
    refetchInterval: options?.enabled ? 90_000 : false,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}
