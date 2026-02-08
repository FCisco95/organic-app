'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/features/notifications/hooks';
import type { Notification, NotificationCategory } from '@/features/notifications/types';
import { NOTIFICATION_CATEGORIES } from '@/features/notifications/types';
import {
  NotificationItem,
  getNotificationHref,
} from '@/components/notifications/notification-item';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';

type FilterTab = 'all' | NotificationCategory;

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showPrefs, setShowPrefs] = useState(false);

  const filters = activeTab === 'all' ? undefined : { category: activeTab as NotificationCategory };
  const { data, isLoading } = useNotifications(filters);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-organic-orange" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('pageTitle')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('markAllRead')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPrefs(!showPrefs)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500">{t('pageDescription')}</p>
      </div>

      {/* Preferences panel (collapsible) */}
      {showPrefs && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">{t('preferences.title')}</h3>
          <NotificationPreferences />
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3">
              <Skeleton className="h-2 w-2 rounded-full mt-2" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t('emptyPage')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('emptyPageHint')}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={handleNotificationClick}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
