'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Notification,
  NotificationPreference,
  NotificationsResponse,
  NotificationCategory,
  FollowSubjectType,
} from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters?: { category?: string; unread?: boolean }) =>
    [...notificationKeys.all, 'list', filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  follows: () => [...notificationKeys.all, 'follows'] as const,
  isFollowing: (subjectType: string, subjectId: string) =>
    [...notificationKeys.follows(), subjectType, subjectId] as const,
};

export function useNotifications(filters?: { category?: NotificationCategory; unread?: boolean }) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Resolve user ID for Realtime filter
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const query = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async (): Promise<NotificationsResponse> => {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.unread !== undefined) params.set('unread', String(filters.unread));
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    staleTime: 15_000,
  });

  // Subscribe to realtime inserts for live updates, filtered to current user
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;

          // Safety check: only process own notifications
          if (newNotification.user_id !== userId) return;

          // Fetch actor info
          if (newNotification.actor_id) {
            const { data: actor } = await supabase
              .from('user_profiles')
              .select('id, name, avatar_url, organic_id')
              .eq('id', newNotification.actor_id)
              .single();
            newNotification.actor = actor;
          }

          // Update notification list
          queryClient.setQueryData<NotificationsResponse>(notificationKeys.list(filters), (old) => {
            if (!old) return { notifications: [newNotification], total: 1, unread_count: 1 };
            return {
              notifications: [newNotification, ...old.notifications].slice(0, 50),
              total: old.total + 1,
              unread_count: old.unread_count + 1,
            };
          });

          // Bump unread count
          queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) => (old ?? 0) + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, filters, userId]);

  return query;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      const res = await fetch('/api/notifications?unread=true&limit=1');
      if (!res.ok) throw new Error('Failed to fetch unread count');
      const data: NotificationsResponse = await res.json();
      return data.unread_count;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async (): Promise<NotificationPreference[]> => {
      const res = await fetch('/api/notifications/preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      const data = await res.json();
      return data.preferences;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      category: NotificationCategory;
      in_app?: boolean;
      email?: boolean;
    }) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update preference');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}

export function useIsFollowing(subjectType: FollowSubjectType, subjectId: string) {
  return useQuery({
    queryKey: notificationKeys.isFollowing(subjectType, subjectId),
    queryFn: async (): Promise<boolean> => {
      const params = new URLSearchParams({
        subject_type: subjectType,
        subject_id: subjectId,
      });
      const res = await fetch(`/api/notifications/follow?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to check follow status');
      const data = await res.json();
      return data.following;
    },
    enabled: !!subjectId,
    staleTime: 30_000,
  });
}

export function useFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { subject_type: FollowSubjectType; subject_id: string }) => {
      const res = await fetch('/api/notifications/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to follow');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(
        notificationKeys.isFollowing(variables.subject_type, variables.subject_id),
        true
      );
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { subject_type: FollowSubjectType; subject_id: string }) => {
      const res = await fetch('/api/notifications/follow', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to unfollow');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(
        notificationKeys.isFollowing(variables.subject_type, variables.subject_id),
        false
      );
    },
  });
}
