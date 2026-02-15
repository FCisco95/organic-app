import { getXpProgress, getXpRemaining, getLevelInfo } from './types';

/** Format XP number with locale-aware comma separators */
export function formatXp(xp: number): string {
  return xp.toLocaleString('en-US');
}

/** Get level progress as { percent, current, needed, remaining } */
export function getLevelProgress(xpTotal: number, level: number) {
  const currentInfo = getLevelInfo(level);
  const nextInfo = level < 11 ? getLevelInfo(level + 1) : null;
  const percent = getXpProgress(xpTotal, level);
  const remaining = getXpRemaining(xpTotal, level);

  return {
    percent,
    current: xpTotal - currentInfo.xpRequired,
    needed: nextInfo ? nextInfo.xpRequired - currentInfo.xpRequired : 0,
    remaining,
    isMaxLevel: level >= 11,
  };
}

/** Format streak display text */
export function formatStreak(streak: number): string {
  if (streak === 0) return '0 days';
  if (streak === 1) return '1 day';
  return `${streak} days`;
}

/** Get streak color intensity based on length */
export function getStreakColor(streak: number): string {
  if (streak >= 30) return 'text-orange-500';
  if (streak >= 14) return 'text-orange-400';
  if (streak >= 7) return 'text-amber-500';
  if (streak >= 3) return 'text-amber-400';
  if (streak >= 1) return 'text-gray-500';
  return 'text-gray-300';
}
