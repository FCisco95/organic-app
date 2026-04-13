'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type CommunityTab = 'rankings' | 'directory';

interface CommunityTabsProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
  rankingsCount?: number;
  directoryCount?: number;
}

export function CommunityTabs({
  activeTab,
  onTabChange,
  rankingsCount,
  directoryCount,
}: CommunityTabsProps) {
  const t = useTranslations('Community');

  const tabs: { id: CommunityTab; label: string; count?: number }[] = [
    { id: 'rankings', label: t('tabRankings'), count: rankingsCount },
    { id: 'directory', label: t('tabDirectory'), count: directoryCount },
  ];

  return (
    <div className="flex border-b border-border mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'inline-flex items-center px-4 py-2.5 text-sm font-medium transition-colors -mb-px min-h-[44px]',
            activeTab === tab.id
              ? 'border-b-2 border-organic-terracotta text-organic-terracotta'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className="text-xs text-muted-foreground/70 ml-1">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
