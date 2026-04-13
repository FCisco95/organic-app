'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Trophy, Award, Star, Lock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAchievementsWithSets } from '@/features/reputation/hooks';
import {
  RARITY_ORDER,
  RARITY_COLORS,
  type AchievementRarity,
  type AchievementWithStatus,
} from '@/features/reputation';
import { AchievementGrid } from '@/components/reputation/achievement-grid';
import { Skeleton } from '@/components/ui/skeleton';

const RARITY_LABELS: Record<AchievementRarity, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  secret: 'Secret',
};

function RarityBreakdown({ achievements }: { achievements: AchievementWithStatus[] }) {
  const breakdown = useMemo(() => {
    return RARITY_ORDER.map((rarity) => {
      const all = achievements.filter((a) => a.rarity === rarity);
      const unlocked = all.filter((a) => a.unlocked);
      return { rarity, total: all.length, unlocked: unlocked.length };
    }).filter((b) => b.total > 0);
  }, [achievements]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {breakdown.map(({ rarity, total, unlocked }) => {
        const colors = RARITY_COLORS[rarity];
        return (
          <div
            key={rarity}
            className={cn('rounded-xl border p-3 text-center', colors.bg, colors.border)}
          >
            <p className={cn('text-lg font-bold', colors.text)}>
              {unlocked}/{total}
            </p>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wider', colors.text)}>
              {RARITY_LABELS[rarity]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RarestShowcase({ achievements }: { achievements: AchievementWithStatus[] }) {
  const rarest = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked);
    return unlocked
      .sort((a, b) => {
        const aIdx = RARITY_ORDER.indexOf(a.rarity);
        const bIdx = RARITY_ORDER.indexOf(b.rarity);
        return bIdx - aIdx; // Higher rarity first
      })
      .slice(0, 5);
  }, [achievements]);

  if (rarest.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-500" />
        Rarest Achievements
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {rarest.map((a) => {
          const colors = RARITY_COLORS[a.rarity];
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 shrink-0',
                colors.bg, colors.border, colors.glow, 'shadow-sm'
              )}
            >
              <span className="text-xl">{a.icon}</span>
              <div>
                <p className="text-xs font-medium text-gray-900">{a.name}</p>
                <span className={cn('text-[9px] font-semibold uppercase tracking-wider', colors.text)}>
                  {RARITY_LABELS[a.rarity]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TrophiesPage() {
  const t = useTranslations('Reputation');
  const { data, isLoading } = useAchievementsWithSets();
  const achievements = useMemo(() => data?.achievements ?? [], [data]);
  const sets = useMemo(() => data?.sets ?? [], [data]);

  const stats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter((a) => a.unlocked).length;
    const platinums = achievements.filter((a) => a.rarity === 'platinum' && a.unlocked).length;
    const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, platinums, percent };
  }, [achievements]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Back to profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Trophy Case
            </h1>
            <p className="text-sm text-gray-500">
              {stats.unlocked} of {stats.total} achievements unlocked ({stats.percent}%)
            </p>
          </div>
        </div>
        {stats.platinums > 0 && (
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">{stats.platinums}</span>
            <span className="text-xs text-indigo-500">Platinum</span>
          </div>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.unlocked}</p>
          <p className="text-xs text-gray-500">Unlocked</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{stats.platinums}</p>
          <p className="text-xs text-gray-500">Platinums</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="relative w-12 h-12 mx-auto">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-gray-200" strokeWidth="2" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                className="stroke-emerald-500"
                strokeWidth="2"
                strokeDasharray={`${stats.percent}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900">
              {stats.percent}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Complete</p>
        </div>
      </div>

      {/* Rarity breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Rarity Breakdown</h2>
        <RarityBreakdown achievements={achievements} />
      </div>

      {/* Rarest achievements showcase */}
      <RarestShowcase achievements={achievements} />

      {/* Full achievement grid with sets */}
      <AchievementGrid
        achievements={achievements}
        sets={sets}
        defaultView={sets.length > 0 ? 'sets' : 'category'}
      />
    </div>
  );
}
