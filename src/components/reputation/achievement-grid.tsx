'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ACHIEVEMENT_CATEGORIES,
  RARITY_ORDER,
  RARITY_COLORS,
  type AchievementCategory,
  type AchievementRarity,
  type AchievementWithStatus,
  type AchievementSet,
} from '@/features/reputation';
import { AchievementCard } from './achievement-card';

type ViewMode = 'category' | 'sets';

interface AchievementGridProps {
  achievements: AchievementWithStatus[];
  sets?: AchievementSet[];
  className?: string;
  defaultView?: ViewMode;
}

const RARITY_LABELS: Record<AchievementRarity, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  secret: 'Secret',
};

function SetCard({
  set,
  achievements,
}: {
  set: AchievementSet;
  achievements: AchievementWithStatus[];
}) {
  const setAchievements = achievements.filter((a) => a.set_id === set.id);
  const unlocked = setAchievements.filter((a) => a.unlocked).length;
  const total = setAchievements.length;
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const platinumAchievement = achievements.find((a) => a.id === set.platinum_id);
  const hasPlatinum = platinumAchievement?.unlocked ?? false;

  return (
    <div className="space-y-3">
      {/* Set header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{set.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{set.name}</h3>
            <p className="text-xs text-gray-500">{set.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPlatinum && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              Platinum
            </span>
          )}
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-900">{unlocked}/{total}</p>
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-0.5">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  percent === 100 ? 'bg-indigo-500' : 'bg-emerald-400'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Set achievements */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {setAchievements
          .sort((a, b) => (a.chain_order ?? 0) - (b.chain_order ?? 0))
          .map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
      </div>
    </div>
  );
}

export function AchievementGrid({ achievements, sets, className, defaultView = 'category' }: AchievementGridProps) {
  const t = useTranslations('Reputation');
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  const [activeRarity, setActiveRarity] = useState<AchievementRarity | 'all'>('all');

  const filtered = useMemo(() => {
    let result = achievements;
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (activeRarity !== 'all') {
      result = result.filter((a) => a.rarity === activeRarity);
    }
    return result;
  }, [achievements, activeCategory, activeRarity]);

  // Separate unset achievements for sets view
  const unsetAchievements = useMemo(
    () => filtered.filter((a) => !a.set_id),
    [filtered]
  );

  return (
    <div className={className}>
      {/* View toggle + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* View mode toggle */}
        {sets && sets.length > 0 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('category')}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                viewMode === 'category' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >
              By Category
            </button>
            <button
              onClick={() => setViewMode('sets')}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                viewMode === 'sets' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >
              <Trophy className="w-3 h-3 inline-block mr-1" />
              By Set
            </button>
          </div>
        )}

        {/* Category tabs (category view) */}
        {viewMode === 'category' && (
          <div className="flex gap-1.5 overflow-x-auto">
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
        )}

        {/* Rarity filter */}
        <div className="flex gap-1.5 overflow-x-auto sm:ml-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400 self-center shrink-0" />
          <button
            onClick={() => setActiveRarity('all')}
            className={cn(
              'text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors',
              activeRarity === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {RARITY_ORDER.map((rarity) => {
            const colors = RARITY_COLORS[rarity];
            return (
              <button
                key={rarity}
                onClick={() => setActiveRarity(rarity)}
                className={cn(
                  'text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors',
                  activeRarity === rarity
                    ? `${colors.bg} ${colors.text} ${colors.border} border`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {RARITY_LABELS[rarity]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sets view */}
      {viewMode === 'sets' && sets && sets.length > 0 ? (
        <div className="space-y-8">
          {sets.map((set) => {
            const setAchievements = filtered.filter((a) => a.set_id === set.id);
            if (setAchievements.length === 0) return null;
            return <SetCard key={set.id} set={set} achievements={filtered} />;
          })}
          {unsetAchievements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Other Achievements</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unsetAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category view grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          {t('noAchievementsYet')}
        </p>
      )}
    </div>
  );
}
