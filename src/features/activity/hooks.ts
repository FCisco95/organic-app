'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ActivityEvent, DashboardStats } from './types';

export const activityKeys = {
  all: ['activity'] as const,
  feed: () => [...activityKeys.all, 'feed'] as const,
  stats: () => [...activityKeys.all, 'stats'] as const,
};

export function useStats() {
  return useQuery({
    queryKey: activityKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const { stats } = await res.json();
      return stats;
    },
    staleTime: 300_000, // 5 minutes — dashboard stats are slow-changing
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  });
}

export function useActivityFeed(limit = 20) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: activityKeys.feed(),
    queryFn: async (): Promise<ActivityEvent[]> => {
      const res = await fetch(`/api/activity?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const { events } = await res.json();
      return events;
    },
    staleTime: 30_000,
  });

  // Subscribe to realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel('activity_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          const newEvent = payload.new as ActivityEvent;

          // Fetch actor info if available
          if (newEvent.actor_id) {
            const { data: actor } = await supabase
              .from('user_profiles')
              .select('id, name, organic_id, avatar_url')
              .eq('id', newEvent.actor_id)
              .single();
            newEvent.actor = actor;
          }

          queryClient.setQueryData<ActivityEvent[]>(activityKeys.feed(), (old) => {
            if (!old) return [newEvent];
            return [newEvent, ...old].slice(0, limit);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, limit]);

  return query;
}
