'use client';

import { useEffect, useState } from 'react';

interface ShimmerEffectProps {
  active: boolean;
}

export function ShimmerEffect({ active }: ShimmerEffectProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;

    // Random position within the viewport
    const x = 15 + Math.random() * 70; // 15-85% from left
    const y = 20 + Math.random() * 60; // 20-80% from top

    setPosition({ x, y });
    setVisible(true);

    // Fade out after 1.5s
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  // Skip on mobile
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <div
      className="fixed pointer-events-none z-40"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className="relative">
        {/* Core shimmer */}
        <div className="h-3 w-3 rounded-full bg-orange-400/60 animate-egg-shimmer" />
        {/* Outer glow */}
        <div className="absolute -inset-3 rounded-full bg-orange-400/20 blur-md animate-egg-shimmer-glow" />
        {/* Sparkle particles */}
        <div className="absolute -top-1 -left-1 h-1 w-1 rounded-full bg-white/80 animate-egg-sparkle-1" />
        <div className="absolute -top-2 right-0 h-0.5 w-0.5 rounded-full bg-yellow-300/90 animate-egg-sparkle-2" />
        <div className="absolute bottom-0 -right-1 h-1 w-1 rounded-full bg-orange-300/70 animate-egg-sparkle-3" />
      </div>
    </div>
  );
}
