export function formatXp(xp: number): string {
  return xp.toLocaleString('en-US');
}

export function getStreakColor(streak: number): string {
  if (streak >= 30) return 'text-orange-500';
  if (streak >= 14) return 'text-orange-400';
  if (streak >= 7) return 'text-amber-500';
  if (streak >= 3) return 'text-amber-400';
  if (streak >= 1) return 'text-gray-500';
  return 'text-gray-300';
}
