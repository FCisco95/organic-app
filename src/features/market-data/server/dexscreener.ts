/**
 * DexScreener API provider — fetches volume, price change, liquidity, and market data.
 * Free tier: 60 requests/minute, no API key required.
 */

import { TOKEN_CONFIG } from '@/config/token';
import { logger } from '@/lib/logger';

export interface DexScreenerPairData {
  pairAddress: string;
  dexId: string;
  priceUsd: number;
  priceNative: number;
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  txns: {
    h1: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  marketCap: number | null;
  fdv: number | null;
  pairCreatedAt: number | null;
}

export interface DexScreenerMarketData {
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume1h: number;
  volume24h: number;
  txns1h: { buys: number; sells: number };
  txns24h: { buys: number; sells: number };
  liquidity: number;
  marketCap: number | null;
  fdv: number | null;
  dex: string;
  pairAddress: string;
  fetchedAt: string;
}

// In-memory throttle: caps DexScreener load at ~1 request per instance per
// minute, which is comfortably under the 60 req/min free-tier limit. The
// freshness ceiling for users is this TTL plus the CDN s-maxage on the route.
let cache: { data: DexScreenerMarketData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function fetchDexScreenerData(): Promise<DexScreenerMarketData | null> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const mint = TOKEN_CONFIG.mint;
  if (!mint) return null;

  try {
    // `cache: 'no-store'` is mandatory: Next.js caches fetch responses in its
    // Data Cache *by default and indefinitely*, which previously froze price
    // and marketCap for weeks after each deploy. The in-memory TTL above is
    // what actually throttles outbound requests.
    const response = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${mint}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.warn(`DexScreener API returned ${response.status}`);
      return cache?.data ?? null;
    }

    const pairs: Array<Record<string, unknown>> = await response.json();

    if (!Array.isArray(pairs) || pairs.length === 0) {
      logger.warn('DexScreener: no pairs found for token');
      return cache?.data ?? null;
    }

    // Pick the pair with highest liquidity. This matches DexScreener's
    // own UI default, so marketCap/fdv/volume track the pair users verify
    // against. Changing this heuristic will visibly move the displayed price.
    const best = pairs.reduce((a, b) => {
      const aLiq = (a.liquidity as Record<string, number>)?.usd ?? 0;
      const bLiq = (b.liquidity as Record<string, number>)?.usd ?? 0;
      return bLiq > aLiq ? b : a;
    });

    logger.info('DexScreener pair selected', {
      dexId: best.dexId,
      pairAddress: best.pairAddress,
      liquidityUsd: (best.liquidity as Record<string, number>)?.usd ?? null,
      marketCap: best.marketCap ?? null,
      fdv: best.fdv ?? null,
      totalPairs: pairs.length,
    });

    const priceChange = best.priceChange as Record<string, number> | undefined;
    const volume = best.volume as Record<string, number> | undefined;
    const txns = best.txns as Record<string, { buys: number; sells: number }> | undefined;
    const liquidity = best.liquidity as Record<string, number> | undefined;

    const data: DexScreenerMarketData = {
      price: parseFloat(String(best.priceUsd)) || 0,
      priceChange1h: priceChange?.h1 ?? 0,
      priceChange24h: priceChange?.h24 ?? 0,
      volume1h: volume?.h1 ?? 0,
      volume24h: volume?.h24 ?? 0,
      txns1h: txns?.h1 ?? { buys: 0, sells: 0 },
      txns24h: txns?.h24 ?? { buys: 0, sells: 0 },
      liquidity: liquidity?.usd ?? 0,
      marketCap: typeof best.marketCap === 'number' ? best.marketCap : null,
      fdv: typeof best.fdv === 'number' ? best.fdv : null,
      dex: String(best.dexId ?? 'unknown'),
      pairAddress: String(best.pairAddress ?? ''),
      fetchedAt: new Date().toISOString(),
    };

    cache = { data, timestamp: now };
    return data;
  } catch (error) {
    logger.error('DexScreener fetch error:', error);
    return cache?.data ?? null;
  }
}
