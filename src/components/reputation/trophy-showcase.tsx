'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Award, ChevronRight } from 'lucide-react';
import { useAchievements } from '@/features/reputation/hooks';
import { RARITY_ORDER } from '@/features/reputation';
import { AchievementCard } from './achievement-card';

export function TrophyShowcase() {
  const { data: achievements, isLoading } = useAchievements();

  const { rarest, platinumCount, unlockedCount, totalCount } = useMemo(() => {
    if (!achievements) return { rarest: [], platinumCount: 0, unlockedCount: 0, totalCount: 0 };

    const unlocked = achievements.filter((a) => a.unlocked);
    const sorted = unlocked.sort((a, b) => {
      const aIdx = RARITY_ORDER.indexOf(a.rarity);
      const bIdx = RARITY_ORDER.indexOf(b.rarity);
      return bIdx - aIdx;
    });

    return {
      rarest: sorted.slice(0, 3),
      platinumCount: unlocked.filter((a) => a.rarity === 'platinum').length,
      unlockedCount: unlocked.length,
      totalCount: achievements.length,
    };
  }, [achievements]);

  if (isLoading) return null;
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Trophies
        </h2>
        <Link
          href="/profile/trophies"
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-gray-500">
          <span className="font-semibold text-gray-900">{unlockedCount}</span>/{totalCount}
        </span>
        {platinumCount > 0 && (
          <span className="flex items-center gap-1 text-indigo-600">
            <Award className="w-3 h-3" />
            <span className="font-semibold">{platinumCount}</span> Platinum
          </span>
        )}
      </div>

      {/* Rarest achievements */}
      {rarest.length > 0 && (
        <div className="space-y-2">
          {rarest.map((a) => (
            <AchievementCard key={a.id} achievement={a} compact />
          ))}
        </div>
      )}

      {rarest.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">
          No achievements unlocked yet. Start earning!
        </p>
      )}
    </div>
  );
}
