import { TOKEN_CONFIG } from '@/config/token';
import { logger } from '@/lib/logger';
import type { MarketPriceKey, MarketProvider } from './types';

type ProviderFailureReason = 'not_configured' | 'not_found' | 'rate_limited' | 'http_error' | 'network_error';

type ProviderResult =
  | { ok: true; provider: MarketProvider; price: number }
  | { ok: false; provider: MarketProvider; reason: ProviderFailureReason; status?: number };

const RETRY_DELAYS_MS = [0, 300, 900] as const;
const FETCH_TIMEOUT_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

async function fetchJsonWithRetries(url: string): Promise<{ ok: true; json: unknown } | { ok: false; status?: number }> {
  let lastStatus: number | undefined;

  for (const [index, delayMs] of RETRY_DELAYS_MS.entries()) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        return { ok: true, json };
      }

      lastStatus = response.status;
      const isRetriable = response.status === 429 || response.status >= 500;
      const isLastAttempt = index === RETRY_DELAYS_MS.length - 1;
      if (!isRetriable || isLastAttempt) {
        return { ok: false, status: response.status };
      }
    } catch (error) {
      const isLastAttempt = index === RETRY_DELAYS_MS.length - 1;
      if (isLastAttempt) {
        logger.warn('Market provider request failed after retries', { url, error });
        return { ok: false };
      }
    }
  }

  return { ok: false, status: lastStatus };
}

function getJupiterId(key: MarketPriceKey): string | null {
  if (key === 'sol_price') {
    return 'So11111111111111111111111111111111111111112';
  }

  if (!TOKEN_CONFIG.mint) {
    return null;
  }

  return TOKEN_CONFIG.mint;
}

export async function fetchPriceFromJupiter(key: MarketPriceKey): Promise<ProviderResult> {
  const id = getJupiterId(key);
  if (!id) {
    return { ok: false, provider: 'jupiter', reason: 'not_configured' };
  }

  const response = await fetchJsonWithRetries(`https://api.jup.ag/price/v2?ids=${id}`);
  if (!response.ok) {
    if (response.status === 429) {
      return { ok: false, provider: 'jupiter', reason: 'rate_limited', status: 429 };
    }

    return {
      ok: false,
      provider: 'jupiter',
      reason: response.status ? 'http_error' : 'network_error',
      status: response.status,
    };
  }

  const payload = response.json as { data?: Record<string, { price?: number | string }> };
  const price = parseNumber(payload?.data?.[id]?.price);

  if (price == null) {
    return { ok: false, provider: 'jupiter', reason: 'not_found' };
  }

  return { ok: true, provider: 'jupiter', price };
}

export async function fetchPriceFromCoinGecko(key: MarketPriceKey): Promise<ProviderResult> {
  if (key === 'sol_price') {
    const response = await fetchJsonWithRetries(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );

    if (!response.ok) {
      if (response.status === 429) {
        return { ok: false, provider: 'coingecko', reason: 'rate_limited', status: 429 };
      }

      return {
        ok: false,
        provider: 'coingecko',
        reason: response.status ? 'http_error' : 'network_error',
        status: response.status,
      };
    }

    const payload = response.json as { solana?: { usd?: number | string } };
    const price = parseNumber(payload?.solana?.usd);
    if (price == null) {
      return { ok: false, provider: 'coingecko', reason: 'not_found' };
    }

    return { ok: true, provider: 'coingecko', price };
  }

  if (!TOKEN_CONFIG.mint) {
    return { ok: false, provider: 'coingecko', reason: 'not_configured' };
  }

  const response = await fetchJsonWithRetries(
    `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${TOKEN_CONFIG.mint}&vs_currencies=usd`
  );

  if (!response.ok) {
    if (response.status === 429) {
      return { ok: false, provider: 'coingecko', reason: 'rate_limited', status: 429 };
    }

    return {
      ok: false,
      provider: 'coingecko',
      reason: response.status ? 'http_error' : 'network_error',
      status: response.status,
    };
  }

  const payload = response.json as Record<string, { usd?: number | string }>;
  const mintKey = TOKEN_CONFIG.mint.toLowerCase();
  const price = parseNumber(payload?.[mintKey]?.usd);
  if (price == null) {
    return { ok: false, provider: 'coingecko', reason: 'not_found' };
  }

  return { ok: true, provider: 'coingecko', price };
}
