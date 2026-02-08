'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/features/notifications/hooks';
import { NotificationItem, getNotificationHref } from './notification-item';
import type { Notification } from '@/features/notifications/types';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const t = useTranslations('Notifications');

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const displayCount = Math.min(unreadCount, 99);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const href = getNotificationHref(notification);
    router.push(href);
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleViewAll = () => {
    router.push('/notifications');
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => setOpen(!open)}
        aria-label={t('bell')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {displayCount > 0 ? displayCount : ''}
            {unreadCount > 99 && '+'}
          </span>
        )}
      </Button>

      {/* Notification panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-80 sm:w-96 rounded-lg border border-border bg-card shadow-lg',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
                disabled={markAllRead.isPending}
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">{t('empty')}</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <button
              onClick={handleViewAll}
              className="w-full rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
            >
              {t('viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
