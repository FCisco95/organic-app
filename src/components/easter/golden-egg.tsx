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
    const x = 10 + Math.random() * 75; // 10-85%
    const y = 25 + Math.random() * 50; // 25-75%
    setPosition({ x, y });
    setMounted(true);
  }, []);

  if (!mounted || !element) return null;

  // Skip on mobile
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <div
      className="fixed z-50 cursor-pointer"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onClick={onClaim}
      role="button"
      aria-label="A mysterious golden egg"
    >
      <div className="relative group">
        {/* Outer glow */}
        <div
          className="absolute -inset-6 rounded-full blur-xl opacity-50 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${element.colorFrom}40, ${element.colorTo}20, transparent)`,
          }}
        />

        {/* Egg body */}
        <div
          className="relative h-12 w-10 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-2xl animate-egg-float group-hover:scale-110 transition-transform duration-200"
          style={{
            background: `linear-gradient(135deg, ${element.colorFrom}, ${element.colorTo})`,
            boxShadow: `0 0 20px ${element.colorAccent}40, 0 0 40px ${element.colorFrom}20`,
          }}
        >
          {/* Shine effect */}
          <div className="absolute top-2 left-2 h-3 w-2 rounded-full bg-white/30 blur-sm" />
          {/* Element emoji */}
          <div className="absolute inset-0 flex items-center justify-center text-lg opacity-80">
            {element.emoji}
          </div>
        </div>

        {/* Sparkle particles */}
        <div
          className="absolute -top-2 -right-1 h-1.5 w-1.5 rounded-full animate-egg-sparkle-1"
          style={{ backgroundColor: element.colorAccent }}
        />
        <div
          className="absolute top-1 -left-2 h-1 w-1 rounded-full animate-egg-sparkle-2"
          style={{ backgroundColor: element.colorFrom }}
        />
        <div
          className="absolute -bottom-1 right-0 h-1 w-1 rounded-full animate-egg-sparkle-3"
          style={{ backgroundColor: element.colorTo }}
        />
      </div>
    </div>
  );
}
