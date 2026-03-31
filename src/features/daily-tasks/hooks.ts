'use client';

import { useQuery } from '@tanstack/react-query';
import type { DailyTaskProgress, LoginStreak } from './schemas';

// Response shape from GET /api/daily-tasks
interface DailyTasksResponse {
  tasks: DailyTaskProgress[];
  streak: LoginStreak | null;
}

async function fetchMyDailyTasks(): Promise<DailyTasksResponse> {
  const res = await fetch('/api/daily-tasks');
  if (!res.ok) throw new Error('Failed to fetch daily tasks');
  const json = await res.json();
  return { tasks: json.data ?? [], streak: json.streak ?? null };
}

export function useMyDailyTasks() {
  return useQuery({
    queryKey: ['daily-tasks', 'my'],
    queryFn: fetchMyDailyTasks,
    staleTime: 30_000,
  });
}

async function fetchLoginStreak(): Promise<LoginStreak | null> {
  const res = await fetch('/api/daily-tasks/streak');
  if (!res.ok) throw new Error('Failed to fetch login streak');
  const json = await res.json();
  return json.data ?? null;
}

export function useLoginStreak() {
  return useQuery({
    queryKey: ['daily-tasks', 'streak'],
    queryFn: fetchLoginStreak,
    staleTime: 60_000,
  });
}
