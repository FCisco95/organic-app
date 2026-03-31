'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { getEggElement, getRarityLabel } from '@/features/easter/elements';

interface DiscoveryOverlayProps {
  eggNumber: number;
  shareUrl: string;
  tweetText: string;
  xpAwarded: number;
  onClose: () => void;
}

export function DiscoveryOverlay({
  eggNumber,
  shareUrl,
  tweetText,
  xpAwarded,
  onClose,
}: DiscoveryOverlayProps) {
  const [phase, setPhase] = useState<'crack' | 'reveal'>('crack');
  const element = getEggElement(eggNumber);

  useEffect(() => {
    // Crack animation for 1.5s, then reveal
    const timer = setTimeout(() => setPhase('reveal'), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!element) return null;

  const elementName = element.element.charAt(0).toUpperCase() + element.element.slice(1);
  const rarity = getRarityLabel(element.rarityModifier);

  const handleShare = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {phase === 'crack' ? (
        // Cracking animation
        <div className="text-center">
          <div
            className="relative mx-auto h-32 w-28 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] animate-egg-crack"
            style={{
              background: `linear-gradient(135deg, ${element.colorFrom}, ${element.colorTo})`,
              boxShadow: `0 0 60px ${element.colorAccent}60, 0 0 120px ${element.colorFrom}30`,
            }}
          >
            <div className="absolute top-5 left-5 h-8 w-5 rounded-full bg-white/20 blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              {element.emoji}
            </div>
          </div>
          {/* Particle burst */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full animate-egg-burst"
              style={{
                backgroundColor: i % 2 === 0 ? element.colorFrom : element.colorAccent,
                left: '50%',
                top: '50%',
                animationDelay: `${i * 0.1}s`,
                transform: `rotate(${i * 45}deg) translateX(${40 + Math.random() * 40}px)`,
              }}
            />
          ))}
        </div>
      ) : (
        // Reveal
        <div className="text-center max-w-sm mx-auto px-6 animate-fade-up">
          {/* Egg icon */}
          <div
            className="mx-auto mb-6 h-24 w-20 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] flex items-center justify-center text-5xl"
            style={{
              background: `linear-gradient(135deg, ${element.colorFrom}, ${element.colorTo})`,
              boxShadow: `0 0 40px ${element.colorAccent}40, 0 0 80px ${element.colorFrom}20`,
            }}
          >
            {element.emoji}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">
            You found a Golden Egg!
          </h2>
          <p className="mt-2 text-lg font-semibold" style={{ color: element.colorAccent }}>
            {element.emoji} {elementName} Egg — #{eggNumber} of 10
          </p>

          {/* Rarity badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 text-sm text-white/80">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: element.colorFrom }} />
            {rarity}
          </div>

          {/* XP */}
          <p className="mt-4 text-sm text-emerald-400 font-medium">
            +{xpAwarded} XP earned
          </p>

          {/* Mystery teaser */}
          <p className="mt-4 text-sm text-white/50 italic">
            This egg holds a secret. It may hatch into something... someday.
          </p>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Share on X
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
