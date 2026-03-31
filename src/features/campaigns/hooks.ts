'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Campaign } from './schemas';

// --- Public hook: fetch active campaigns ---

async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns');
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  const json = await res.json();
  return json.data ?? [];
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: fetchCampaigns,
    staleTime: 60_000,
  });
}

// --- Admin hooks ---

async function fetchAdminCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/admin/campaigns');
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  const json = await res.json();
  return json.data ?? [];
}

export function useAdminCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'admin'],
    queryFn: fetchAdminCampaigns,
    staleTime: 30_000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to update campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to delete campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
