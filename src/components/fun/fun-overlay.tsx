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
      {/* Toggle button — top-right of main content area, below the top bar */}
      <button
        onClick={() => setEnabled((v) => !v)}
        className="fixed top-[4.25rem] right-6 z-[1002] bg-card border border-border rounded-full w-10 h-10 flex items-center justify-center text-base shadow-md hover:border-primary transition-colors"
        title={enabled ? 'Disable fun mode' : 'Enable fun mode'}
      >
        {enabled ? '🎮' : '🕹️'}
      </button>

      {enabled && <SniperGame />}
    </>
  );
}
