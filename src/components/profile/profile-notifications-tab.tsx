'use client';

import { useTranslations } from 'next-intl';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';

export function ProfileNotificationsTab() {
  const t = useTranslations('Profile');

  return (
    <div data-testid="profile-preferences-section" className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-1">
        {t('notificationPreferencesTitle')}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">{t('notificationPreferencesDescription')}</p>
      <NotificationPreferences />
    </div>
  );
}
