'use client';

import { Bell, Globe, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type ProfileTabId = 'account' | 'social' | 'wallet' | 'notifications';

const TAB_ICONS: Record<ProfileTabId, React.ElementType> = {
  account: User,
  social: Globe,
  wallet: Wallet,
  notifications: Bell,
};

interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const t = useTranslations('Profile');

  const tabs: { id: ProfileTabId; label: string }[] = [
    { id: 'account', label: t('tabAccount') },
    { id: 'social', label: t('tabSocial') },
    { id: 'wallet', label: t('tabWallet') },
    { id: 'notifications', label: t('tabNotifications') },
  ];

  return (
    <div className="flex border-b border-border mb-4 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-b-2 border-organic-orange text-organic-orange'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
