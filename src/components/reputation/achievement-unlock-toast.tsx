'use client';

import toast from 'react-hot-toast';

export function showAchievementToast(name: string, icon: string, xpReward: number) {
  toast.custom(
    (toastInstance) => (
      <div
        className={`${
          toastInstance.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto border border-amber-200`}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Achievement Unlocked!</p>
              <p className="text-xs text-gray-500">{name}</p>
              {xpReward > 0 && (
                <span className="text-[10px] font-medium text-amber-600">+{xpReward} XP</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    { duration: 4000 }
  );
}
