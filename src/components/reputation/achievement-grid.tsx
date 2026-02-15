'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory, type AchievementWithStatus } from '@/features/reputation';
import { AchievementCard } from './achievement-card';

interface AchievementGridProps {
  achievements: AchievementWithStatus[];
  className?: string;
}

export function AchievementGrid({ achievements, className }: AchievementGridProps) {
  const t = useTranslations('Reputation');
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  const filtered =
    activeCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  return (
    <div className={className}>
      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
            activeCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {t('categories.all')}
        </button>
        {ACHIEVEMENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
              activeCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          {t('noAchievementsYet')}
        </p>
      )}
    </div>
  );
}
