'use client';

import { useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Settings, Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useNotificationsInfinite,
  useMarkRead,
  useMarkAllRead,
} from '@/features/notifications/hooks';
import type { Notification, NotificationCategory } from '@/features/notifications/types';
import { NOTIFICATION_CATEGORIES, CATEGORY_DOT_COLORS } from '@/features/notifications/types';
import {
  NotificationItem,
  getNotificationHref,
} from '@/components/notifications/notification-item';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

type FilterTab = 'all' | NotificationCategory;

/** Group notifications by date section: Today, Yesterday, This Week, Older */
function groupByDate(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; key: string; items: Notification[] }[] = [
    { label: 'today', key: 'today', items: [] },
    { label: 'yesterday', key: 'yesterday', items: [] },
    { label: 'thisWeek', key: 'thisWeek', items: [] },
    { label: 'older', key: 'older', items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showPrefs, setShowPrefs] = useState(false);

  const filters = activeTab === 'all' ? undefined : { category: activeTab as NotificationCategory };
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsInfinite(filters);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page.notifications) ?? [],
    [data?.pages]
  );
  const unreadCount = data?.pages[0]?.unread_count ?? 0;
  const dateGroups = useMemo(() => groupByDate(notifications), [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const href = getNotificationHref(notification);
    router.push(href);
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('tabs.all') },
    ...NOTIFICATION_CATEGORIES.map((cat) => ({
      key: cat as FilterTab,
      label: t(`preferences.categories.${cat}`),
    })),
  ];

  return (
    <PageContainer width="narrow">
      <div data-testid="notifications-page">
        {/* Header — clean, minimal */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('activityTitle')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t('activitySubtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                  {unreadCount}
                </Badge>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('markAllRead')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPrefs(true)}
                aria-label={t('preferences.title')}
                data-testid="notifications-preferences-toggle"
              >
                <Settings aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Segmented control filter */}
        <div
          className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1 mb-6 overflow-x-auto max-w-full"
          data-testid="notifications-filter-tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline notification list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-16 w-px mt-1" />
                </div>
                <div className="flex-1 rounded-lg border bg-card p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{t('emptyPage')}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">{t('emptyPageHint')}</p>
            <Button
              variant="link"
              className="mt-3 text-sm"
              onClick={() => router.push('/tasks')}
            >
              {t('browseTasks')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-6" data-testid="notifications-list">
              {dateGroups.map((group) => (
                <div key={group.key}>
                  {/* Date section header as timeline marker */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-border ring-4 ring-background" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(`timeline.${group.label}`)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Timeline items */}
                  <div className="relative ml-[5px] pl-6 border-l border-dashed border-border space-y-3">
                    {group.items.map((notification) => (
                      <div key={notification.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'absolute -left-[29px] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-background',
                            !notification.read
                              ? 'bg-[hsl(var(--organic-terracotta,15_80%_55%))]'
                              : CATEGORY_DOT_COLORS[notification.category] || 'bg-muted-foreground/30'
                          )}
                        />
                        <NotificationItem
                          notification={notification}
                          onClick={handleNotificationClick}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-xs"
                >
                  {isFetchingNextPage ? t('loadingMore') : t('loadMore')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Preferences Sheet (slide from right) */}
        <Sheet open={showPrefs} onOpenChange={setShowPrefs}>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{t('preferences.title')}</SheetTitle>
              <SheetDescription>{t('preferences.description')}</SheetDescription>
            </SheetHeader>
            <NotificationPreferences />
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
