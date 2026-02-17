import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Database, Json } from '@/types/database';
import { fetchPriceFromCoinGecko, fetchPriceFromJupiter } from './providers';
import {
  MARKET_PRICE_KEYS,
  type MarketDataSource,
  type MarketPriceKey,
  type MarketPriceOptions,
  type MarketPriceSnapshot,
  type MarketProvider,
} from './types';

const FRESH_TTL_MS = 2 * 60_000;
const STALE_TTL_MS = 30 * 60_000;
const RATE_LIMIT_FAILURE_THRESHOLD = 2;
const CIRCUIT_BREAKER_OPEN_MS = 90_000;
const CIRCUIT_BREAKER_LOG_COOLDOWN_MS = 30_000;
const PERSISTED_STORE_COOLDOWN_MS = 5 * 60_000;

type MarketSnapshotRecord = Pick<
  Database['public']['Tables']['market_snapshots']['Row'],
  'key' | 'payload' | 'provider' | 'fetched_at' | 'expires_at' | 'stale_until' | 'error_count' | 'last_error'
>;

type StoredSnapshot = {
  key: MarketPriceKey;
  value: number | null;
  provider: MarketProvider;
  fetchedAtMs: number;
  expiresAtMs: number;
  staleUntilMs: number;
  errorCount: number;
  lastError: string | null;
};

type CircuitBreakerState = {
  consecutiveRateLimitFailures: number;
  openUntilMs: number;
  lastOpenLogAtMs: number;
};

const inFlightRefreshes = new Map<MarketPriceKey, Promise<MarketPriceSnapshot>>();
const inMemorySnapshots = new Map<MarketPriceKey, StoredSnapshot>();
const circuitBreakerState = new Map<MarketPriceKey, CircuitBreakerState>();
let persistedStoreDisabledUntilMs = 0;

function hasSupabaseServiceConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === 'PGRST205' ||
    (typeof maybeError.message === 'string' && maybeError.message.includes('market_snapshots'))
  );
}

function isPersistedStoreEnabled(): boolean {
  return hasSupabaseServiceConfig() && persistedStoreDisabledUntilMs <= Date.now();
}

function disablePersistedStoreTemporarily(reason: string): void {
  const now = Date.now();
  const previouslyDisabled = persistedStoreDisabledUntilMs > now;
  persistedStoreDisabledUntilMs = now + PERSISTED_STORE_COOLDOWN_MS;

  if (!previouslyDisabled) {
    logger.warn('Market snapshot persisted store disabled temporarily', {
      reason,
      disabled_for_ms: PERSISTED_STORE_COOLDOWN_MS,
    });
  }
}

function shouldSkipExternalCalls(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function toPayload(value: number | null): Json {
  return {
    price_usd: value,
    currency: 'usd',
  };
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

function parseTimestamp(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProvider(value: string | null | undefined): MarketProvider {
  if (value === 'jupiter' || value === 'coingecko' || value === 'cache' || value === 'none') {
    return value;
  }

  return 'none';
}

function parseStoredSnapshot(row: MarketSnapshotRecord): StoredSnapshot {
  const now = Date.now();
  const payload = row.payload as Record<string, unknown> | null;
  const parsedPrice = parseNumber(payload?.price_usd);

  return {
    key: row.key as MarketPriceKey,
    value: parsedPrice,
    provider: normalizeProvider(row.provider),
    fetchedAtMs: parseTimestamp(row.fetched_at, now),
    expiresAtMs: parseTimestamp(row.expires_at, now),
    staleUntilMs: parseTimestamp(row.stale_until, now),
    errorCount: row.error_count ?? 0,
    lastError: row.last_error,
  };
}

function inferSourceFromProvider(provider: MarketProvider): MarketDataSource {
  if (provider === 'coingecko') {
    return 'fallback';
  }

  return 'fresh';
}

function isFresh(snapshot: StoredSnapshot, nowMs: number): boolean {
  return snapshot.expiresAtMs > nowMs;
}

function isWithinStaleWindow(snapshot: StoredSnapshot, nowMs: number): boolean {
  return snapshot.staleUntilMs > nowMs;
}

function toResponseSnapshot(
  snapshot: StoredSnapshot,
  sourceOverride?: MarketDataSource
): MarketPriceSnapshot {
  const now = Date.now();
  const source = sourceOverride ?? inferSourceFromProvider(snapshot.provider);
  const ageSeconds = Math.max(0, Math.floor((now - snapshot.fetchedAtMs) / 1000));

  return {
    key: snapshot.key,
    value: snapshot.value,
    source,
    provider: snapshot.provider,
    fetchedAt: new Date(snapshot.fetchedAtMs).toISOString(),
    ageSeconds,
  };
}

function emptySnapshot(key: MarketPriceKey): MarketPriceSnapshot {
  return {
    key,
    value: null,
    source: 'stale',
    provider: 'none',
    fetchedAt: null,
    ageSeconds: null,
  };
}

async function readSnapshot(key: MarketPriceKey): Promise<StoredSnapshot | null> {
  const inMemory = inMemorySnapshots.get(key);

  if (!isPersistedStoreEnabled()) {
    return inMemory ?? null;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('key, payload, provider, fetched_at, expires_at, stale_until, error_count, last_error')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        disablePersistedStoreTemporarily('missing_table');
        return inMemory ?? null;
      }

      logger.warn('Market snapshot read failed', { key, error });
      return inMemory ?? null;
    }

    if (!data) {
      return inMemory ?? null;
    }

    const parsed = parseStoredSnapshot(data);
    inMemorySnapshots.set(key, parsed);
    return parsed;
  } catch (error) {
    if (isMissingTableError(error)) {
      disablePersistedStoreTemporarily('missing_table');
      return inMemory ?? null;
    }

    logger.warn('Market snapshot read exception', { key, error });
    return inMemory ?? null;
  }
}

async function writeSnapshot(snapshot: StoredSnapshot): Promise<void> {
  inMemorySnapshots.set(snapshot.key, snapshot);

  if (!isPersistedStoreEnabled()) {
    return;
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('market_snapshots').upsert(
      {
        key: snapshot.key,
        payload: toPayload(snapshot.value),
        provider: snapshot.provider,
        fetched_at: new Date(snapshot.fetchedAtMs).toISOString(),
        expires_at: new Date(snapshot.expiresAtMs).toISOString(),
        stale_until: new Date(snapshot.staleUntilMs).toISOString(),
        error_count: snapshot.errorCount,
        last_error: snapshot.lastError,
      },
      { onConflict: 'key' }
    );

    if (error) {
      if (isMissingTableError(error)) {
        disablePersistedStoreTemporarily('missing_table');
        return;
      }

      logger.warn('Market snapshot upsert failed', { key: snapshot.key, error });
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      disablePersistedStoreTemporarily('missing_table');
      return;
    }

    logger.warn('Market snapshot upsert exception', { key: snapshot.key, error });
  }
}

async function storeSnapshotError(
  key: MarketPriceKey,
  message: string,
  existing: StoredSnapshot | null
): Promise<void> {
  const now = Date.now();
  const base = existing ?? inMemorySnapshots.get(key) ?? null;
  const next: StoredSnapshot = {
    key,
    value: base?.value ?? null,
    provider: base?.provider ?? 'none',
    fetchedAtMs: base?.fetchedAtMs ?? now,
    expiresAtMs: base?.expiresAtMs ?? now,
    staleUntilMs: base?.staleUntilMs ?? now + STALE_TTL_MS,
    errorCount: (base?.errorCount ?? 0) + 1,
    lastError: message.slice(0, 500),
  };

  await writeSnapshot(next);
}

function getCircuitState(key: MarketPriceKey): CircuitBreakerState {
  const state = circuitBreakerState.get(key);
  if (state) {
    return state;
  }

  const initial: CircuitBreakerState = {
    consecutiveRateLimitFailures: 0,
    openUntilMs: 0,
    lastOpenLogAtMs: 0,
  };
  circuitBreakerState.set(key, initial);
  return initial;
}

function isCircuitOpen(key: MarketPriceKey): boolean {
  const state = getCircuitState(key);
  return state.openUntilMs > Date.now();
}

function resetRateLimitFailures(key: MarketPriceKey): void {
  const state = getCircuitState(key);
  state.consecutiveRateLimitFailures = 0;
  state.openUntilMs = 0;
}

function registerRateLimitFailure(key: MarketPriceKey): void {
  const now = Date.now();
  const state = getCircuitState(key);
  state.consecutiveRateLimitFailures += 1;

  if (state.consecutiveRateLimitFailures < RATE_LIMIT_FAILURE_THRESHOLD) {
    return;
  }

  state.openUntilMs = now + CIRCUIT_BREAKER_OPEN_MS;
  state.consecutiveRateLimitFailures = 0;

  if (now - state.lastOpenLogAtMs >= CIRCUIT_BREAKER_LOG_COOLDOWN_MS) {
    logger.warn('Market circuit breaker opened after repeated 429 errors', {
      key,
      open_for_ms: CIRCUIT_BREAKER_OPEN_MS,
    });
    state.lastOpenLogAtMs = now;
  }
}

async function refreshSnapshot(key: MarketPriceKey, existing: StoredSnapshot | null): Promise<MarketPriceSnapshot> {
  const jupiterResult = await fetchPriceFromJupiter(key);
  if (jupiterResult.ok) {
    resetRateLimitFailures(key);
    const now = Date.now();
    const snapshot: StoredSnapshot = {
      key,
      value: jupiterResult.price,
      provider: 'jupiter',
      fetchedAtMs: now,
      expiresAtMs: now + FRESH_TTL_MS,
      staleUntilMs: now + STALE_TTL_MS,
      errorCount: 0,
      lastError: null,
    };

    await writeSnapshot(snapshot);
    return toResponseSnapshot(snapshot, 'fresh');
  }

  const fallbackResult = await fetchPriceFromCoinGecko(key);
  if (fallbackResult.ok) {
    resetRateLimitFailures(key);
    const now = Date.now();
    const snapshot: StoredSnapshot = {
      key,
      value: fallbackResult.price,
      provider: 'coingecko',
      fetchedAtMs: now,
      expiresAtMs: now + FRESH_TTL_MS,
      staleUntilMs: now + STALE_TTL_MS,
      errorCount: 0,
      lastError: null,
    };

    await writeSnapshot(snapshot);
    return toResponseSnapshot(snapshot, 'fallback');
  }

  const hitRateLimit =
    jupiterResult.reason === 'rate_limited' || fallbackResult.reason === 'rate_limited';
  if (hitRateLimit) {
    registerRateLimitFailure(key);
  } else {
    resetRateLimitFailures(key);
  }

  const errorSummary = `jupiter=${jupiterResult.reason}; coingecko=${fallbackResult.reason}`;
  await storeSnapshotError(key, errorSummary, existing);

  if (existing && isWithinStaleWindow(existing, Date.now())) {
    return toResponseSnapshot(existing, 'stale');
  }

  return emptySnapshot(key);
}

async function refreshSnapshotWithDedup(
  key: MarketPriceKey,
  existing: StoredSnapshot | null
): Promise<MarketPriceSnapshot> {
  const inFlight = inFlightRefreshes.get(key);
  if (inFlight) {
    return inFlight;
  }

  const pending = refreshSnapshot(key, existing).finally(() => {
    inFlightRefreshes.delete(key);
  });

  inFlightRefreshes.set(key, pending);
  return pending;
}

export async function getMarketPriceSnapshot(
  key: MarketPriceKey,
  options: MarketPriceOptions = {}
): Promise<MarketPriceSnapshot> {
  const now = Date.now();
  const existing = await readSnapshot(key);

  if (existing && !options.forceRefresh && isFresh(existing, now)) {
    return toResponseSnapshot(existing);
  }

  if (shouldSkipExternalCalls()) {
    if (existing && isWithinStaleWindow(existing, now)) {
      return toResponseSnapshot(existing, 'stale');
    }

    return emptySnapshot(key);
  }

  if (isCircuitOpen(key)) {
    if (existing && isWithinStaleWindow(existing, now)) {
      return toResponseSnapshot(existing, 'stale');
    }

    return emptySnapshot(key);
  }

  return refreshSnapshotWithDedup(key, existing);
}

export async function refreshMarketPriceSnapshots(
  keys: readonly MarketPriceKey[] = MARKET_PRICE_KEYS
): Promise<MarketPriceSnapshot[]> {
  return Promise.all(keys.map((key) => getMarketPriceSnapshot(key, { forceRefresh: true })));
}

export function buildMarketDataHeaders(snapshots: MarketPriceSnapshot[]): Record<string, string> {
  const source: MarketDataSource = snapshots.some((snapshot) => snapshot.source === 'stale')
    ? 'stale'
    : snapshots.some((snapshot) => snapshot.source === 'fallback')
      ? 'fallback'
      : 'fresh';

  const maxAgeSeconds = snapshots.reduce<number>(
    (max, snapshot) => (snapshot.ageSeconds == null ? max : Math.max(max, snapshot.ageSeconds)),
    0
  );

  return {
    'X-Data-Source': source,
    'X-Data-Age-Seconds': String(maxAgeSeconds),
  };
}

export { MARKET_PRICE_KEYS };
