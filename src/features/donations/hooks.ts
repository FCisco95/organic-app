'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubmitDonationInput } from './schemas';
import type {
  Donation,
  DonationHistoryResponse,
  DonationLeaderboardResponse,
  DonationReceiptResponse,
  DonationStatsResponse,
} from './types';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';

export const donationKeys = {
  all: ['donations'] as const,
  history: (limit?: number, offset?: number) =>
    [...donationKeys.all, 'history', limit, offset] as const,
  leaderboard: (limit?: number) => [...donationKeys.all, 'leaderboard', limit] as const,
  stats: () => [...donationKeys.all, 'stats'] as const,
  receipt: (id: string) => [...donationKeys.all, 'receipt', id] as const,
};

export function useDonationHistory(options?: { limit?: number; offset?: number; enabled?: boolean }) {
  const qs = buildQueryString({ limit: options?.limit, offset: options?.offset });

  return useQuery({
    queryKey: donationKeys.history(options?.limit, options?.offset),
    queryFn: async () => fetchJson<DonationHistoryResponse>(`/api/donations/history${qs}`),
    enabled: options?.enabled ?? true,
  });
}

export function useDonationLeaderboard(options?: { limit?: number; enabled?: boolean }) {
  const qs = buildQueryString({ limit: options?.limit });

  return useQuery({
    queryKey: donationKeys.leaderboard(options?.limit),
    queryFn: async () => fetchJson<DonationLeaderboardResponse>(`/api/donations/leaderboard${qs}`),
    enabled: options?.enabled ?? true,
  });
}

export function useDonationStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: donationKeys.stats(),
    queryFn: async () => fetchJson<DonationStatsResponse>('/api/donations/stats'),
    enabled: options?.enabled ?? true,
  });
}

export function useDonationReceipt(donationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: donationKeys.receipt(donationId),
    queryFn: async () => fetchJson<DonationReceiptResponse>(`/api/donations/receipt?id=${donationId}`),
    enabled: Boolean(donationId) && (options?.enabled ?? true),
  });
}

export function useSubmitDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitDonationInput) =>
      fetchJson<Donation>('/api/donations/submit', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationKeys.all });
    },
  });
}
