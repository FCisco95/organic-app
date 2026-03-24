'use client';

import toast from 'react-hot-toast';
import { RARITY_COLORS, type AchievementRarity } from '@/features/reputation';

interface AchievementToastOptions {
  title?: string;
  rarity?: AchievementRarity;
  setName?: string;
  setProgress?: { unlocked: number; total: number };
}

export function showAchievementToast(
  name: string,
  icon: string,
  xpReward: number,
  options?: AchievementToastOptions
) {
  const title = options?.title ?? 'Achievement Unlocked!';
  const rarity = options?.rarity ?? 'bronze';
  const colors = RARITY_COLORS[rarity];

  toast.custom(
    (toastInstance) => (
      <div
        className={`${
          toastInstance.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto border ${colors.border} ${colors.glow}`}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-lg`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                  {rarity}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {xpReward > 0 && (
                  <span className={`text-[10px] font-medium ${colors.text}`}>+{xpReward} XP</span>
                )}
                {options?.setName && options?.setProgress && (
                  <span className="text-[10px] text-gray-400">
                    {options.setProgress.unlocked}/{options.setProgress.total} in {options.setName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { duration: rarity === 'platinum' ? 6000 : rarity === 'gold' ? 5000 : 4000 }
  );
}
