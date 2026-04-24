'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

interface MarkStreakSuccess {
  data: LoginStreak;
  milestoneClaimed: { days: number; xp_bonus: number; label: string } | null;
}

class AlreadyDoneTodayError extends Error {
  constructor() {
    super('Already done for today');
    this.name = 'AlreadyDoneTodayError';
  }
}

async function markStreakToday(): Promise<MarkStreakSuccess> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const res = await fetch('/api/daily-tasks/streak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone }),
  });

  if (res.status === 409) {
    throw new AlreadyDoneTodayError();
  }
  if (!res.ok) {
    throw new Error('Failed to mark streak');
  }
  return (await res.json()) as MarkStreakSuccess;
}

export function useMarkStreakToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markStreakToday,
    onSuccess: (result) => {
      qc.setQueryData(['daily-tasks', 'streak'], result.data);
      qc.invalidateQueries({ queryKey: ['daily-tasks', 'my'] });
      qc.invalidateQueries({ queryKey: ['reputation'] });
    },
  });
}

export { AlreadyDoneTodayError };
