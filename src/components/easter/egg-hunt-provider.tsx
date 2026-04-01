'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { ShimmerEffect } from './shimmer-effect';
import { GoldenEgg } from './golden-egg';
import { DiscoveryOverlay } from './discovery-overlay';
import type { EggCheckResponse } from '@/features/easter/schemas';

// Minimum 10 seconds between API calls to avoid rate limiting
const MIN_CHECK_INTERVAL = 10_000;

export function EggHuntProvider() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [shimmerActive, setShimmerActive] = useState(false);
  const [spawnedEgg, setSpawnedEgg] = useState<{ number: number; element: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [discovery, setDiscovery] = useState<{
    eggNumber: number;
    shareUrl: string;
    tweetText: string;
    xpAwarded: number;
  } | null>(null);

  // Stable refs
  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);
  const spawnedEggRef = useRef(spawnedEgg);
  spawnedEggRef.current = spawnedEgg;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const checkForEggs = useCallback(async () => {
    if (!user) return;
    if (checkingRef.current) return;

    const now = Date.now();
    if (now - lastCheckRef.current < MIN_CHECK_INTERVAL) return;
    lastCheckRef.current = now;
    checkingRef.current = true;

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
        setTimeout(() => setShimmerActive(false), 2000);
      } else {
        setShimmerActive(false);
        setSpawnedEgg(null);
      }
    } catch {
      // Silently fail
    } finally {
      checkingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(checkForEggs, 500);
    return () => clearTimeout(timer);
  }, [pathname, checkForEggs]);

  // Claim uses refs to avoid stale closures
  const handleClaim = useCallback(async () => {
    const egg = spawnedEggRef.current;
    if (!egg || claiming) return;
    setClaiming(true);

    try {
      const res = await fetch('/api/easter/egg-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg_number: egg.number,
          found_on_page: pathnameRef.current,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSpawnedEgg(null);
        setDiscovery({
          eggNumber: egg.number,
          shareUrl: data.share_url ?? '',
          tweetText: data.tweet_text ?? '',
          xpAwarded: data.xp_awarded ?? 100,
        });
      } else {
        // Claim failed (already found, hunt disabled, etc) — still show a basic discovery
        setSpawnedEgg(null);
        setDiscovery({
          eggNumber: egg.number,
          shareUrl: '',
          tweetText: '',
          xpAwarded: 0,
        });
      }
    } catch {
      // Network error — still dismiss the egg and show something
      const egg2 = spawnedEggRef.current;
      setSpawnedEgg(null);
      if (egg2) {
        setDiscovery({
          eggNumber: egg2.number,
          shareUrl: '',
          tweetText: '',
          xpAwarded: 0,
        });
      }
    } finally {
      setClaiming(false);
    }
  }, [claiming]);

  const handleCloseDiscovery = useCallback(() => {
    setDiscovery(null);
  }, []);

  return (
    <>
      <ShimmerEffect active={shimmerActive} />
      {spawnedEgg && !claiming && (
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
