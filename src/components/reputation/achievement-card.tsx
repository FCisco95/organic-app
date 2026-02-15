'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AchievementWithStatus } from '@/features/reputation';

interface AchievementCardProps {
  achievement: AchievementWithStatus;
  className?: string;
}

export function AchievementCard({ achievement, className }: AchievementCardProps) {
  const t = useTranslations('Reputation');

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all',
        achievement.unlocked
          ? 'bg-white border-gray-200 hover:shadow-sm'
          : 'bg-gray-50 border-gray-100 opacity-60',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg text-lg',
            achievement.unlocked ? 'bg-amber-50' : 'bg-gray-100'
          )}
        >
          {achievement.unlocked ? (
            achievement.icon
          ) : (
            <Lock className="w-4 h-4 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', achievement.unlocked ? 'text-gray-900' : 'text-gray-400')}>
            {t(`achievementNames.${achievement.id}`)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t(`achievementDescriptions.${achievement.id}`)}
          </p>
          {achievement.xp_reward > 0 && (
            <span className="inline-block mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              +{achievement.xp_reward} XP
            </span>
          )}
        </div>
      </div>
      {achievement.unlocked && achievement.unlocked_at && (
        <p className="text-[10px] text-gray-400 mt-2">
          {t('unlocked')} {new Date(achievement.unlocked_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
