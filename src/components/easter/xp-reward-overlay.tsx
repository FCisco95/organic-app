'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface XpRewardOverlayProps {
  xpAmount: number;
  onClose: () => void;
}

const XP_COLORS: Record<number, { text: string; glow: string }> = {
  1: { text: 'text-zinc-300', glow: '#a1a1aa' },
  2: { text: 'text-emerald-400', glow: '#34d399' },
  5: { text: 'text-blue-400', glow: '#60a5fa' },
  10: { text: 'text-purple-400', glow: '#c084fc' },
};

function playSound(src: string) {
  try {
    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Audio not supported — fail silently
  }
}

export function XpRewardOverlay({ xpAmount, onClose }: XpRewardOverlayProps) {
  const [phase, setPhase] = useState<'crack' | 'reveal'>('crack');
  const soundPlayed = useRef(false);

  const colors = XP_COLORS[xpAmount] ?? XP_COLORS[1];

  useEffect(() => {
    // Play crack sound
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playSound('/sounds/egg-crack.m4a');
    }
    // Crack for 0.8s, then reveal
    const crackTimer = setTimeout(() => {
      setPhase('reveal');
      playSound('/sounds/xp-chime.m4a');
    }, 800);
    return () => clearTimeout(crackTimer);
  }, []);

  useEffect(() => {
    // Auto-dismiss after 2.5s total
    const dismissTimer = setTimeout(onClose, 2500);
    return () => clearTimeout(dismissTimer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none"
      onClick={onClose}
    >
      <div className="pointer-events-auto">
        {phase === 'crack' ? (
          <div className="relative flex items-center justify-center">
            {/* Cracking egg image */}
            <div className="animate-xp-egg-crack">
              <Image
                src="/eggs/xp-egg.png"
                alt="Egg cracking"
                width={56}
                height={64}
                style={{ filter: 'drop-shadow(0 0 30px #f59e0b50)' }}
                priority
              />
            </div>
            {/* Burst particles */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full animate-egg-burst"
                style={{
                  backgroundColor: i % 2 === 0 ? '#f59e0b' : colors.glow,
                  left: '50%',
                  top: '50%',
                  animationDelay: `${i * 0.08}s`,
                  transform: `rotate(${i * 60}deg) translateX(${30 + Math.random() * 20}px)`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="animate-xp-pop text-center">
            {/* Cracked egg image */}
            <div className="mb-2">
              <Image
                src="/eggs/xp-egg-cracked.png"
                alt="Opened egg"
                width={48}
                height={56}
                className="mx-auto opacity-60"
              />
            </div>
            <div
              className={`text-4xl font-black ${colors.text}`}
              style={{
                textShadow: `0 0 20px ${colors.glow}60, 0 0 40px ${colors.glow}30`,
              }}
            >
              +{xpAmount} XP
            </div>
            {xpAmount >= 10 && (
              <div className="mt-1 text-xs text-white/50 font-medium">Lucky find!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
