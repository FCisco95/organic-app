'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EggOpenResponse, EggOpenRecord, EggTierInput } from './schemas';

// --- Open an egg ---

async function openEgg(tier: EggTierInput): Promise<EggOpenResponse> {
  const res = await fetch('/api/egg-opening/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? 'Failed to open egg');
  }
  const json = await res.json();
  return json.data;
}

export function useOpenEgg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: openEgg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['egg-opens'] });
    },
  });
}

// --- Egg open history ---

async function fetchEggOpenHistory(): Promise<EggOpenRecord[]> {
  const res = await fetch('/api/egg-opening/history');
  if (!res.ok) throw new Error('Failed to fetch egg open history');
  const json = await res.json();
  return json.data ?? [];
}

export function useMyEggOpens() {
  return useQuery({
    queryKey: ['egg-opens', 'history'],
    queryFn: fetchEggOpenHistory,
    staleTime: 30_000,
  });
}

// --- Today's open count (derived from history) ---

export function useEggOpenStats() {
  return useQuery({
    queryKey: ['egg-opens', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/egg-opening/history');
      if (!res.ok) throw new Error('Failed to fetch egg open stats');
      const json = await res.json();
      return {
        todayCount: json.today_count as number ?? 0,
        dailyLimit: json.daily_limit as number ?? 5,
      };
    },
    staleTime: 10_000,
  });
}
