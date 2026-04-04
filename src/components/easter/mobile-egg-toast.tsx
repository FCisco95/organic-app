'use client';

import Image from 'next/image';
import toast from 'react-hot-toast';
import { getEggElement } from '@/features/easter/elements';

/**
 * Show a mobile-friendly toast for XP egg spawns.
 * Tapping the toast triggers the claim callback.
 */
export function showXpEggToast(onClaim: () => void) {
  toast(
    (t) => (
      <button
        onClick={() => {
          toast.dismiss(t.id);
          onClaim();
        }}
        className="flex items-center gap-3 w-full text-left"
      >
        <Image
          src="/eggs/xp-egg.png"
          alt="Egg"
          width={36}
          height={42}
          className="shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-zinc-100">You found an egg!</p>
          <p className="text-xs text-zinc-400">Tap to open it</p>
        </div>
      </button>
    ),
    {
      duration: 8000,
      position: 'bottom-center',
      style: {
        background: '#1c1917',
        border: '1px solid #f59e0b40',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 0 20px #f59e0b20',
      },
    }
  );
}

/**
 * Show a mobile-friendly toast for golden egg spawns.
 * Tapping the toast triggers the claim callback.
 */
export function showGoldenEggToast(eggNumber: number, onClaim: () => void) {
  const element = getEggElement(eggNumber);

  toast(
    (t) => (
      <button
        onClick={() => {
          toast.dismiss(t.id);
          onClaim();
        }}
        className="flex items-center gap-3 w-full text-left"
      >
        {element ? (
          <Image
            src={element.image}
            alt={`${element.element} egg`}
            width={36}
            height={42}
            className="shrink-0"
          />
        ) : (
          <span className="text-2xl">🥚</span>
        )}
        <div>
          <p className="text-sm font-semibold text-amber-300">A Golden Egg appeared!</p>
          <p className="text-xs text-zinc-400">Tap to claim it</p>
        </div>
      </button>
    ),
    {
      duration: 12000,
      position: 'bottom-center',
      style: {
        background: '#1c1917',
        border: '1px solid #fbbf2460',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 0 30px #fbbf2420',
      },
    }
  );
}

/**
 * Show a mobile-friendly toast for XP reward after claiming.
 */
export function showXpRewardToast(xpAmount: number) {
  const colorMap: Record<number, string> = {
    1: '#a1a1aa',
    2: '#34d399',
    5: '#60a5fa',
    10: '#c084fc',
  };
  const color = colorMap[xpAmount] ?? '#a1a1aa';

  toast(
    () => (
      <div className="flex items-center gap-3">
        <Image
          src="/eggs/xp-egg-cracked.png"
          alt="Opened egg"
          width={32}
          height={38}
          className="shrink-0 opacity-60"
        />
        <div>
          <p className="text-sm font-bold" style={{ color }}>
            +{xpAmount} XP
          </p>
          {xpAmount >= 10 && (
            <p className="text-xs text-zinc-500">Lucky find!</p>
          )}
        </div>
      </div>
    ),
    {
      duration: 2500,
      position: 'bottom-center',
      style: {
        background: '#1c1917',
        border: `1px solid ${color}40`,
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: `0 0 20px ${color}20`,
      },
    }
  );
}
