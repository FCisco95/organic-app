'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationPreferences, useUpdatePreference } from '@/features/notifications/hooks';
import type { NotificationCategory } from '@/features/notifications/types';
import { NOTIFICATION_CATEGORIES, CATEGORY_ICON_NAMES } from '@/features/notifications/types';
import {
  ClipboardList,
  ScrollText,
  Vote,
  MessageCircle,
  Scale,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CategoryIconName } from '@/features/notifications/types';

const CATEGORY_ICON_MAP: Record<CategoryIconName, LucideIcon> = {
  ClipboardList,
  ScrollText,
  Vote,
  MessageCircle,
  Scale,
  Settings,
};

/** Category descriptions for the preferences sheet */
const CATEGORY_DESCRIPTION_KEYS: Record<NotificationCategory, string> = {
  tasks: 'preferences.descriptions.tasks',
  proposals: 'preferences.descriptions.proposals',
  voting: 'preferences.descriptions.voting',
  comments: 'preferences.descriptions.comments',
  disputes: 'preferences.descriptions.disputes',
  system: 'preferences.descriptions.system',
};

export function NotificationPreferences() {
  const t = useTranslations('Notifications');
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePref = useUpdatePreference();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
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
    <div className="space-y-1" data-testid="notification-preferences">
      {/* Header actions */}
      <div className="flex items-center justify-between pb-4 mb-2 border-b border-border">
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

      {/* Category rows with icon + name + description */}
      {NOTIFICATION_CATEGORIES.map((category) => {
        const pref = prefMap.get(category);
        const inApp = pref?.in_app ?? true;
        const email = pref?.email ?? true;
        const iconName = CATEGORY_ICON_NAMES[category];
        const IconComponent = CATEGORY_ICON_MAP[iconName];

        return (
          <div
            key={category}
            className="flex items-center justify-between py-3 rounded-md hover:bg-muted/30 transition-colors px-1"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {t(`preferences.categories.${category}`)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t(CATEGORY_DESCRIPTION_KEYS[category])}
                </p>
              </div>
            </div>
            <div className="flex gap-6 shrink-0">
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
        ${checked ? 'bg-[hsl(var(--organic-terracotta,15_80%_55%))]' : 'bg-muted-foreground/25'}
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
