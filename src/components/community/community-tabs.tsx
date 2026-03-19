'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type CommunityTab = 'rankings' | 'directory';

interface CommunityTabsProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
}

export function CommunityTabs({ activeTab, onTabChange }: CommunityTabsProps) {
  const t = useTranslations('Community');

  const tabs: { id: CommunityTab; label: string }[] = [
    { id: 'rankings', label: t('tabRankings') },
    { id: 'directory', label: t('tabDirectory') },
  ];

  return (
    <div className="flex border-b border-border mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
            activeTab === tab.id
              ? 'border-b-2 border-organic-orange text-organic-orange'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
