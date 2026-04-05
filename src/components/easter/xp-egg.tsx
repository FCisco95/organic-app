'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface XpEggProps {
  onClaim: () => void;
}

export function XpEgg({ onClaim }: XpEggProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const x = 15 + Math.random() * 65;
    const y = 25 + Math.random() * 45;
    setPosition({ x, y });
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Skip on mobile — handled by toast in EggHuntProvider
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <div
      className="fixed cursor-pointer select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: 9998,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClaim();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClaim(); }}
      aria-label="A mysterious egg"
    >
      <div className="relative" style={{ width: 48, height: 56 }}>
        {/* Subtle glow */}
        <div
          className="absolute -inset-4 rounded-full blur-lg opacity-40 animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #f59e0b40, #d9770620, transparent)',
          }}
        />

        {/* Egg image */}
        <div className="absolute inset-0 animate-xp-egg-wobble hover:scale-125 transition-transform duration-200">
          <Image
            src="/eggs/xp-egg.png"
            alt="Mystery egg"
            width={48}
            height={56}
            className="drop-shadow-lg pointer-events-none"
            priority
          />
        </div>
      </div>
    </div>
  );
}
