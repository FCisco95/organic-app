'use client';

import { useTranslations } from 'next-intl';
import { Lock, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RARITY_COLORS, RARITY_ORDER, type AchievementWithStatus, type AchievementRarity } from '@/features/reputation';

interface AchievementCardProps {
  achievement: AchievementWithStatus;
  className?: string;
  compact?: boolean;
}

const RARITY_LABELS: Record<AchievementRarity, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  secret: 'Secret',
};

export function AchievementCard({ achievement, className, compact }: AchievementCardProps) {
  const t = useTranslations('Reputation');
  const rarity = achievement.rarity ?? 'bronze';
  const colors = RARITY_COLORS[rarity];
  const isHidden = achievement.is_hidden && !achievement.unlocked;
  const hasProgress = !achievement.unlocked && achievement.progress !== undefined && achievement.condition_threshold > 0;
  const progressPercent = hasProgress
    ? Math.min(100, Math.round(((achievement.progress ?? 0) / achievement.condition_threshold) * 100))
    : 0;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border p-2 transition-all',
          achievement.unlocked
            ? `${colors.bg} ${colors.border} shadow-sm ${colors.glow}`
            : 'bg-gray-50 border-gray-100 opacity-60',
          className
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md text-base">
          {achievement.unlocked ? achievement.icon : <Lock className="w-3.5 h-3.5 text-gray-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-medium truncate', achievement.unlocked ? 'text-gray-900' : 'text-gray-400')}>
            {isHidden ? '???' : achievement.name}
          </p>
          <span className={cn('text-[9px] font-medium', colors.text)}>
            {RARITY_LABELS[rarity]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all',
        achievement.unlocked
          ? `${colors.bg} ${colors.border} shadow-sm ${colors.glow}`
          : 'bg-gray-50 border-gray-100 opacity-60',
        className
      )}
    >
      {/* Rarity badge */}
      <div className="absolute top-2.5 right-2.5">
        <span className={cn('text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full', colors.bg, colors.text)}>
          {RARITY_LABELS[rarity]}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg text-lg shrink-0',
            achievement.unlocked ? colors.bg : 'bg-gray-100'
          )}
        >
          {isHidden ? (
            <span className="text-gray-300 text-sm">?</span>
          ) : achievement.unlocked ? (
            achievement.icon
          ) : (
            <Lock className="w-4 h-4 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-12">
          <p className={cn('text-sm font-medium', achievement.unlocked ? 'text-gray-900' : 'text-gray-400')}>
            {isHidden ? 'Hidden Achievement' : achievement.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {isHidden ? 'Keep exploring to discover this achievement!' : achievement.description}
          </p>

          {/* Chain indicator */}
          {achievement.chain_id && achievement.chain_order > 1 && (
            <div className="flex items-center gap-1 mt-1">
              <Link2 className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Chain #{achievement.chain_order}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            {achievement.xp_reward > 0 && (
              <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
                +{achievement.xp_reward} XP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {hasProgress && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-400">
              {achievement.progress ?? 0} / {achievement.condition_threshold}
            </span>
            <span className="text-[10px] text-gray-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', {
                'bg-amber-400': rarity === 'bronze',
                'bg-slate-400': rarity === 'silver',
                'bg-yellow-400': rarity === 'gold',
                'bg-indigo-400': rarity === 'platinum',
                'bg-purple-400': rarity === 'secret',
              })}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {achievement.unlocked && achievement.unlocked_at && (
        <p className="text-[10px] text-gray-400 mt-2">
          Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
