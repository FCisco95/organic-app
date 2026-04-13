'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  useNotificationsInfinite,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/features/notifications/hooks';
import { NOTIFICATION_CATEGORIES, CATEGORY_DOT_COLORS } from '@/features/notifications/types';
import type { Notification, NotificationCategory } from '@/features/notifications/types';
import { NotificationItem, getNotificationHref } from './notification-item';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | undefined>();
  const router = useRouter();
  const t = useTranslations('Notifications');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationsInfinite({ category: categoryFilter, limit: 20 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const displayCount = Math.min(unreadCount, 99);

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markRead.mutate(notification.id);
      }
      const href = getNotificationHref(notification);
      setOpen(false);
      router.push(href);
    },
    [markRead, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    router.push('/notifications');
  }, [router]);

  // Infinite scroll detection
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11"
        onClick={() => setOpen(true)}
        aria-label={t('bell')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--organic-terracotta,15_80%_55%))] px-1 text-[10px] font-bold text-white">
            {displayCount > 0 ? displayCount : ''}
            {unreadCount > 99 && '+'}
          </span>
        )}
      </Button>

      {/* Notification Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 sm:max-w-md w-full"
        >
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-0 space-y-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">
                {t('title')}
              </SheetTitle>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleMarkAllRead}
                    disabled={markAllRead.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t('markAllRead')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setOpen(false);
                    router.push('/notifications');
                  }}
                  aria-label={t('preferences.title')}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">
              {t('pageDescription')}
            </SheetDescription>
          </SheetHeader>

          {/* Category filter pills */}
          <div className="px-5 pt-3 pb-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategoryFilter(undefined)}
                className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
                  !categoryFilter
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {t('tabs.all')}
              </button>
              {NOTIFICATION_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    setCategoryFilter(
                      categoryFilter === category ? undefined : category,
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
                    categoryFilter === category
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      CATEGORY_DOT_COLORS[category],
                    )}
                  />
                  {t(`preferences.categories.${category}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Notification list — scrollable */}
          <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Bell className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {t('empty')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('emptyPageHint')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    compact
                  />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1" />

                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t('loadingMore')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer — "See all activity" link */}
          <div className="border-t border-border px-5 py-3 shrink-0">
            <button
              onClick={handleViewAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('seeAllActivity')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
