'use client';

import { useState, useEffect } from 'react';
import { SniperGame } from './sniper-game';

export function FunOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // default true to avoid flash

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setEnabled((v) => !v)}
        className="fixed bottom-4 right-4 z-[1002] bg-[var(--surface)] border border-[hsl(var(--border))] rounded-full w-10 h-10 flex items-center justify-center text-lg hover:border-[var(--orange)] transition-colors"
        title={enabled ? 'Disable fun mode' : 'Enable fun mode'}
      >
        {enabled ? '🎮' : '🕹️'}
      </button>

      {enabled && <SniperGame />}
    </>
  );
}
