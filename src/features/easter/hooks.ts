'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EggCheckResponse, EggHuntConfig, GoldenEgg, EggHuntStats } from './schemas';

// --- Egg check (called on route change by provider) ---

async function fetchEggCheck(): Promise<EggCheckResponse> {
  const res = await fetch('/api/easter/egg-check');
  if (!res.ok) return { spawn: false, shimmer: false, egg: null, xp_egg: null };
  return res.json();
}

export function useEggCheck(enabled: boolean) {
  return useQuery({
    queryKey: ['easter', 'egg-check'],
    queryFn: fetchEggCheck,
    enabled,
    staleTime: 0, // Always fresh — called on route change
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

// --- Egg claim ---

export function useEggClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { egg_number: number; found_on_page: string }) => {
      const res = await fetch('/api/easter/egg-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to claim egg');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['easter'] });
    },
  });
}

// --- User's egg collection ---

async function fetchMyEggs(): Promise<GoldenEgg[]> {
  const res = await fetch('/api/easter/egg-claim');
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export function useMyEggs() {
  return useQuery({
    queryKey: ['easter', 'my-eggs'],
    queryFn: fetchMyEggs,
    staleTime: 30_000,
  });
}

// --- Admin: config ---

async function fetchEggHuntConfig(): Promise<EggHuntConfig | null> {
  const res = await fetch('/api/admin/easter/config');
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export function useEggHuntConfig() {
  return useQuery({
    queryKey: ['easter', 'admin-config'],
    queryFn: fetchEggHuntConfig,
    staleTime: 10_000,
  });
}

export function useUpdateEggHuntConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/easter/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to update config');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['easter'] });
    },
  });
}

// --- Admin: stats ---

async function fetchEggHuntStats(): Promise<EggHuntStats | null> {
  const res = await fetch('/api/admin/easter/stats');
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export function useEggHuntStats() {
  return useQuery({
    queryKey: ['easter', 'admin-stats'],
    queryFn: fetchEggHuntStats,
    staleTime: 15_000,
  });
}
