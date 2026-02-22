'use client';

import toast from 'react-hot-toast';
import { getLevelInfo } from '@/features/reputation';

type LevelUpToastCopy = {
  title?: string;
  description?: string;
};

export function showLevelUpToast(newLevel: number, levelName: string, copy?: LevelUpToastCopy) {
  const info = getLevelInfo(newLevel);
  const title = copy?.title ?? 'Level Up!';
  const description = copy?.description ?? `You reached Level ${newLevel} — ${levelName}`;

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
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
