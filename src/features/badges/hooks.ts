'use client';

import { useQuery } from '@tanstack/react-query';
import type { UserBadge } from './schemas';

// --- User hook: fetch own badges ---

async function fetchMyBadges(): Promise<UserBadge[]> {
  const res = await fetch('/api/badges');
  if (!res.ok) throw new Error('Failed to fetch badges');
  const json = await res.json();
  return json.data ?? [];
}

export function useMyBadges() {
  return useQuery({
    queryKey: ['badges', 'my'],
    queryFn: fetchMyBadges,
    staleTime: 60_000,
  });
}

// --- Admin hook: fetch all badges across users ---

interface AdminBadge extends UserBadge {
  user_profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

async function fetchAdminBadges(): Promise<AdminBadge[]> {
  const res = await fetch('/api/admin/badges');
  if (!res.ok) throw new Error('Failed to fetch badges');
  const json = await res.json();
  return json.data ?? [];
}

export function useAdminBadges() {
  return useQuery({
    queryKey: ['badges', 'admin'],
    queryFn: fetchAdminBadges,
    staleTime: 30_000,
  });
}
