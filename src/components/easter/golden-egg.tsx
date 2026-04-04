'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getEggElement } from '@/features/easter/elements';

interface GoldenEggProps {
  eggNumber: number;
  onClaim: () => void;
}

export function GoldenEgg({ eggNumber, onClaim }: GoldenEggProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const element = getEggElement(eggNumber);

  useEffect(() => {
    const x = 15 + Math.random() * 65; // 15-80%
    const y = 25 + Math.random() * 45; // 25-70%
    setPosition({ x, y });
    setMounted(true);
  }, []);

  if (!mounted || !element) return null;

  // Skip on mobile — handled by toast in EggHuntProvider
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <div
      className="fixed cursor-pointer select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: 9999,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClaim();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClaim(); }}
      aria-label="A mysterious golden egg"
    >
      {/* Large invisible click target */}
      <div className="relative" style={{ width: 64, height: 72 }}>
        {/* Outer glow */}
        <div
          className="absolute -inset-6 rounded-full blur-xl opacity-50 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${element.colorFrom}40, ${element.colorTo}20, transparent)`,
          }}
        />

        {/* Egg image */}
        <div className="absolute inset-0 animate-egg-float hover:scale-125 transition-transform duration-200">
          <Image
            src={element.image}
            alt={`${element.element} egg`}
            width={64}
            height={72}
            className="drop-shadow-2xl pointer-events-none"
            priority
          />
        </div>

        {/* Sparkle particles */}
        <div
          className="absolute -top-2 -right-1 h-1.5 w-1.5 rounded-full animate-egg-sparkle-1 pointer-events-none"
          style={{ backgroundColor: element.colorAccent }}
        />
        <div
          className="absolute top-1 -left-2 h-1 w-1 rounded-full animate-egg-sparkle-2 pointer-events-none"
          style={{ backgroundColor: element.colorFrom }}
        />
        <div
          className="absolute -bottom-1 right-0 h-1 w-1 rounded-full animate-egg-sparkle-3 pointer-events-none"
          style={{ backgroundColor: element.colorTo }}
        />
      </div>
    </div>
  );
}
