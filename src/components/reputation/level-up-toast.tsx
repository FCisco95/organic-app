'use client';

import toast from 'react-hot-toast';
import { getLevelInfo } from '@/features/reputation';

export function showLevelUpToast(newLevel: number, levelName: string) {
  const info = getLevelInfo(newLevel);

  toast.custom(
    (toastInstance) => (
      <div
        className={`${
          toastInstance.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto border`}
        style={{ borderColor: `${info.color}40` }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: info.color }}
            >
              {newLevel}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Level Up!</p>
              <p className="text-xs text-gray-500">
                You reached Level {newLevel} — {levelName}
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
