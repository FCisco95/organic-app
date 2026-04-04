'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { ShimmerEffect } from './shimmer-effect';
import { GoldenEgg } from './golden-egg';
import { DiscoveryOverlay } from './discovery-overlay';
import { XpEgg } from './xp-egg';
import { XpRewardOverlay } from './xp-reward-overlay';
import { showXpEggToast, showGoldenEggToast, showXpRewardToast } from './mobile-egg-toast';
import type { EggCheckResponse } from '@/features/easter/schemas';

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

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

  // XP egg state
  const [xpEgg, setXpEgg] = useState<{ token: string; xpAmount: number; isShiny: boolean } | null>(null);
  const [xpReward, setXpReward] = useState<{ xpAmount: number } | null>(null);

  // Stable refs
  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);
  const claimingRef = useRef(false);

  const spawnedEggRef = useRef(spawnedEgg);
  spawnedEggRef.current = spawnedEgg;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const xpEggRef = useRef(xpEgg);
  xpEggRef.current = xpEgg;

  // ── Claim handlers (defined first, referenced by checkForEggs via refs) ──

  const claimGoldenEgg = useCallback(async () => {
    const egg = spawnedEggRef.current;
    if (!egg || claimingRef.current) return;
    claimingRef.current = true;
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

      setSpawnedEgg(null);
      setDiscovery({
        eggNumber: egg.number,
        shareUrl: res.ok ? (data.share_url ?? '') : '',
        tweetText: res.ok ? (data.tweet_text ?? '') : '',
        xpAwarded: res.ok ? (data.xp_awarded ?? 100) : 0,
      });
    } catch {
      const egg2 = spawnedEggRef.current;
      setSpawnedEgg(null);
      if (egg2) {
        setDiscovery({ eggNumber: egg2.number, shareUrl: '', tweetText: '', xpAwarded: 0 });
      }
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }, []);

  const claimXpEgg = useCallback(async () => {
    const egg = xpEggRef.current;
    if (!egg || claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setXpEgg(null);

    try {
      const res = await fetch('/api/easter/xp-egg-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: egg.token }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.is_shiny && data.egg_number) {
          setDiscovery({
            eggNumber: data.egg_number,
            shareUrl: data.share_url ?? '',
            tweetText: data.tweet_text ?? '',
            xpAwarded: 100,
          });
        } else if (isMobile()) {
          showXpRewardToast(data.xp_amount ?? egg.xpAmount);
        } else {
          setXpReward({ xpAmount: data.xp_amount ?? egg.xpAmount });
        }
      }
    } catch {
      // Silently fail — egg already dismissed
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }, []);

  // Stable refs for claim functions (used in toast callbacks)
  const claimGoldenEggRef = useRef(claimGoldenEgg);
  claimGoldenEggRef.current = claimGoldenEgg;

  const claimXpEggRef = useRef(claimXpEgg);
  claimXpEggRef.current = claimXpEgg;

  // ── Egg check (called on route changes) ──

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
        // Golden egg takes priority
        setShimmerActive(false);
        setXpEgg(null);

        if (isMobile()) {
          const eggData = data.egg;
          spawnedEggRef.current = eggData;
          showGoldenEggToast(eggData.number, () => claimGoldenEggRef.current());
        } else {
          setSpawnedEgg(data.egg);
        }
      } else if (data.xp_egg) {
        // XP egg spawned
        setSpawnedEgg(null);
        const xpEggData = {
          token: data.xp_egg.token,
          xpAmount: data.xp_egg.xp_amount,
          isShiny: data.xp_egg.is_shiny,
        };

        if (isMobile()) {
          xpEggRef.current = xpEggData;
          showXpEggToast(() => claimXpEggRef.current());
        } else {
          setXpEgg(xpEggData);
        }

        if (data.shimmer) {
          setShimmerActive(true);
          setTimeout(() => setShimmerActive(false), 2000);
        } else {
          setShimmerActive(false);
        }
      } else if (data.shimmer) {
        setShimmerActive(true);
        setSpawnedEgg(null);
        setXpEgg(null);
        setTimeout(() => setShimmerActive(false), 2000);
      } else {
        setShimmerActive(false);
        setSpawnedEgg(null);
        setXpEgg(null);
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

  const handleCloseDiscovery = useCallback(() => {
    setDiscovery(null);
  }, []);

  const handleCloseXpReward = useCallback(() => {
    setXpReward(null);
  }, []);

  return (
    <>
      <ShimmerEffect active={shimmerActive} />
      {spawnedEgg && !claiming && (
        <GoldenEgg eggNumber={spawnedEgg.number} onClaim={claimGoldenEgg} />
      )}
      {xpEgg && !spawnedEgg && !claiming && (
        <XpEgg onClaim={claimXpEgg} />
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
      {xpReward && (
        <XpRewardOverlay
          xpAmount={xpReward.xpAmount}
          onClose={handleCloseXpReward}
        />
      )}
    </>
  );
}
