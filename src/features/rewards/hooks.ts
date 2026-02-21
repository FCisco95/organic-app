'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UserRewardsInfo,
  RewardClaim,
  RewardDistribution,
  RewardsSummary,
} from './types';

function buildQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

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
      const res = await fetch('/api/rewards');
      if (!res.ok) throw new Error('Failed to fetch rewards info');
      return res.json();
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
      const res = await fetch(
        `/api/rewards/claims${buildQueryString({
          status: filters?.status,
          page: filters?.page,
          limit: filters?.limit,
        })}`
      );
      if (!res.ok) throw new Error('Failed to fetch claims');
      return res.json();
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
      const res = await fetch('/api/rewards/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit claim');
      }
      return res.json();
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
      const res = await fetch(`/api/rewards/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to review claim');
      }
      return res.json();
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
      const res = await fetch(`/api/rewards/claims/${claimId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_signature }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to mark claim as paid');
      }
      return res.json();
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
      const res = await fetch(
        `/api/rewards/distributions${buildQueryString({
          type: filters?.type,
          sprint_id: filters?.sprint_id,
          page: filters?.page,
          limit: filters?.limit,
        })}`
      );
      if (!res.ok) throw new Error('Failed to fetch distributions');
      return res.json();
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
      const res = await fetch('/api/rewards/distributions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create distribution');
      }
      return res.json();
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
      const res = await fetch('/api/rewards/summary');
      if (!res.ok) throw new Error('Failed to fetch rewards summary');
      return res.json();
    },
    staleTime: 45_000,
    refetchInterval: options?.enabled ? 90_000 : false,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}
