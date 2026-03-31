'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { ShimmerEffect } from './shimmer-effect';
import { GoldenEgg } from './golden-egg';
import { DiscoveryOverlay } from './discovery-overlay';
import type { EggCheckResponse } from '@/features/easter/schemas';

export function EggHuntProvider() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [shimmerActive, setShimmerActive] = useState(false);
  const [spawnedEgg, setSpawnedEgg] = useState<{ number: number; element: string } | null>(null);
  const [discovery, setDiscovery] = useState<{
    eggNumber: number;
    shareUrl: string;
    tweetText: string;
    xpAwarded: number;
  } | null>(null);

  // Debounce ref to prevent rapid calls
  const lastCheckRef = useRef(0);

  const checkForEggs = useCallback(async () => {
    if (!user) return;

    // Debounce: at least 3s between checks
    const now = Date.now();
    if (now - lastCheckRef.current < 3000) return;
    lastCheckRef.current = now;

    try {
      const res = await fetch('/api/easter/egg-check');
      if (!res.ok) return;

      const data: EggCheckResponse = await res.json();

      if (data.spawn && data.egg) {
        setSpawnedEgg(data.egg);
        setShimmerActive(false);
      } else if (data.shimmer) {
        setShimmerActive(true);
        setSpawnedEgg(null);
        // Reset shimmer after animation
        setTimeout(() => setShimmerActive(false), 2000);
      } else {
        setShimmerActive(false);
        setSpawnedEgg(null);
      }
    } catch {
      // Silently fail — egg hunt should never break the app
    }
  }, [user]);

  // Check on route change
  useEffect(() => {
    checkForEggs();
  }, [pathname, checkForEggs]);

  const handleClaim = useCallback(async () => {
    if (!spawnedEgg) return;

    try {
      const res = await fetch('/api/easter/egg-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg_number: spawnedEgg.number,
          found_on_page: pathname,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setSpawnedEgg(null);
      setDiscovery({
        eggNumber: spawnedEgg.number,
        shareUrl: data.share_url,
        tweetText: data.tweet_text,
        xpAwarded: data.xp_awarded,
      });
    } catch {
      // Silently fail
    }
  }, [spawnedEgg, pathname]);

  const handleCloseDiscovery = useCallback(() => {
    setDiscovery(null);
  }, []);

  return (
    <>
      <ShimmerEffect active={shimmerActive} />
      {spawnedEgg && (
        <GoldenEgg eggNumber={spawnedEgg.number} onClaim={handleClaim} />
      )}
      {discovery && (
        <DiscoveryOverlay
          eggNumber={discovery.eggNumber}
          shareUrl={discovery.shareUrl}
          tweetText={discovery.tweetText}
          xpAwarded={discovery.xpAwarded}
          onClose={handleCloseDiscovery}
        />
      )}
    </>
  );
}
