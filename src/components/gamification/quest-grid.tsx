'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuestProgress } from '@/features/gamification/hooks';
import type { QuestProgressItem } from '@/features/gamification/types';
import { QuestCard } from './quest-card';

type TabFilter = 'in_progress' | 'done' | 'all';

export function QuestGrid() {
  const t = useTranslations('Quests');
  const { data, isLoading } = useQuestProgress();
  const [activeTab, setActiveTab] = useState<TabFilter>('in_progress');

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-gray-200 rounded-lg" />
            <div className="h-9 w-16 bg-gray-200 rounded-lg" />
            <div className="h-9 w-12 bg-gray-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allQuests: QuestProgressItem[] = [
    ...data.objectives.daily,
    ...data.objectives.weekly,
    ...data.objectives.long_term,
    ...data.objectives.event,
  ];

  const filteredQuests = allQuests.filter((quest) => {
    if (activeTab === 'in_progress') return !quest.completed;
    if (activeTab === 'done') return quest.completed;
    return true;
  });

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    {
      key: 'in_progress',
      label: t('tabInProgress'),
      count: allQuests.filter((q) => !q.completed).length,
    },
    {
      key: 'done',
      label: t('tabDone'),
      count: allQuests.filter((q) => q.completed).length,
    },
    {
      key: 'all',
      label: t('tabAll'),
      count: allQuests.length,
    },
  ];

  return (
    <div className="flex-1 min-w-0">
      {/* Tab filter */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-organic-orange text-white border-organic-orange'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Quest cards grid */}
      {filteredQuests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-400">{t('noQuests')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}
