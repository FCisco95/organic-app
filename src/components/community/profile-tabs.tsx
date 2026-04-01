'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type ProfileTab = 'overview' | 'reputation' | 'achievements' | 'activity';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const t = useTranslations('Community');

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: t('profileTabOverview') },
    { id: 'reputation', label: t('profileTabReputation') },
    { id: 'achievements', label: t('profileTabAchievements') },
    { id: 'activity', label: t('profileTabActivity') },
  ];

  return (
    <div className="flex border-b border-border mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors -mb-px whitespace-nowrap',
            activeTab === tab.id
              ? 'border-b-2 border-organic-terracotta text-organic-terracotta'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
