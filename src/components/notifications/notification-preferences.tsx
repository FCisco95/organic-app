'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationPreferences, useUpdatePreference } from '@/features/notifications/hooks';
import type { NotificationCategory } from '@/features/notifications/types';
import { NOTIFICATION_CATEGORIES } from '@/features/notifications/types';

export function NotificationPreferences() {
  const t = useTranslations('Notifications');
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePref = useUpdatePreference();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const prefMap = new Map((preferences ?? []).map((p) => [p.category, p]));

  const handleToggle = (category: NotificationCategory, channel: 'in_app' | 'email') => {
    const current = prefMap.get(category);
    const newValue = !(current?.[channel] ?? true);

    updatePref.mutate({
      category,
      [channel]: newValue,
    });
  };

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 pb-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('preferences.category')}
        </span>
        <div className="flex gap-6">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-12 text-center">
            {t('preferences.inApp')}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-12 text-center">
            {t('preferences.email')}
          </span>
        </div>
      </div>

      {/* Category rows */}
      {NOTIFICATION_CATEGORIES.map((category) => {
        const pref = prefMap.get(category);
        const inApp = pref?.in_app ?? true;
        const email = pref?.email ?? true;

        return (
          <div
            key={category}
            className="flex items-center justify-between px-1 py-2.5 rounded-md hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-medium capitalize">
              {t(`preferences.categories.${category}`)}
            </span>
            <div className="flex gap-6">
              <div className="w-12 flex justify-center">
                <ToggleSwitch
                  checked={inApp}
                  onChange={() => handleToggle(category, 'in_app')}
                  disabled={updatePref.isPending}
                />
              </div>
              <div className="w-12 flex justify-center">
                <ToggleSwitch
                  checked={email}
                  onChange={() => handleToggle(category, 'email')}
                  disabled={updatePref.isPending}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-primary' : 'bg-muted-foreground/25'}
      `}
    >
      <span
        className={`
          pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-sm
          ring-0 transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}
