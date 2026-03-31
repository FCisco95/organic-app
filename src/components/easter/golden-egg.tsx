'use client';

import { useState, useEffect } from 'react';
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
    // Random position within safe content area
    const x = 15 + Math.random() * 65; // 15-80%
    const y = 25 + Math.random() * 45; // 25-70%
    setPosition({ x, y });
    setMounted(true);
  }, []);

  if (!mounted || !element) return null;

  // Skip on mobile
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
        {/* Outer glow — no pointer events */}
        <div
          className="absolute -inset-6 rounded-full blur-xl opacity-50 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${element.colorFrom}40, ${element.colorTo}20, transparent)`,
          }}
        />

        {/* Egg body */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: 4 }}
        >
          <div
            className="h-14 w-11 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-2xl animate-egg-float hover:scale-125 transition-transform duration-200"
            style={{
              background: `linear-gradient(135deg, ${element.colorFrom}, ${element.colorTo})`,
              boxShadow: `0 0 20px ${element.colorAccent}40, 0 0 40px ${element.colorFrom}20`,
            }}
          >
            {/* Shine effect */}
            <div className="absolute top-2 left-2 h-3 w-2 rounded-full bg-white/30 blur-sm pointer-events-none" />
            {/* Element emoji */}
            <div className="flex items-center justify-center h-full text-xl pointer-events-none">
              {element.emoji}
            </div>
          </div>
        </div>

        {/* Sparkle particles — no pointer events */}
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
