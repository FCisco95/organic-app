'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { BoostRequest, EngagementProof } from './types';

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  boosts: () => [...marketplaceKeys.all, 'boosts'] as const,
  myBoosts: () => [...marketplaceKeys.all, 'my-boosts'] as const,
  boost: (id: string) => [...marketplaceKeys.all, 'boost', id] as const,
};

export function useActiveBoosts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: marketplaceKeys.boosts(),
    queryFn: async (): Promise<BoostRequest[]> => {
      const json = await fetchJson<{ data: BoostRequest[] }>('/api/marketplace/boosts');
      return json.data ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled,
  });
}

export function useMyBoosts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: marketplaceKeys.myBoosts(),
    queryFn: async (): Promise<BoostRequest[]> => {
      const json = await fetchJson<{ data: BoostRequest[] }>('/api/marketplace/boosts?mine=true');
      return json.data ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled,
  });
}

export function useBoostDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: marketplaceKeys.boost(id),
    queryFn: async (): Promise<{ boost: BoostRequest; proofs: EngagementProof[] }> => {
      return fetchJson<{ boost: BoostRequest; proofs: EngagementProof[] }>(
        `/api/marketplace/boosts/${id}`
      );
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

export function useCreateBoost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tweet_url: string;
      points_offered: number;
      max_engagements: number;
    }) => {
      return fetchJson('/api/marketplace/boosts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}

export function useSubmitProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boostId,
      proof_type,
      proof_url,
    }: {
      boostId: string;
      proof_type: string;
      proof_url?: string;
    }) => {
      return fetchJson(`/api/marketplace/boosts/${boostId}/engage`, {
        method: 'POST',
        body: JSON.stringify({ proof_type, proof_url }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}

export function useCancelBoost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boostId: string) => {
      return fetchJson(`/api/marketplace/boosts/${boostId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}
