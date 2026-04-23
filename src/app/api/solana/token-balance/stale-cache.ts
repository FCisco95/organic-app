interface StaleCacheEntry {
  balance: number;
  ts: number;
}

export const staleCache = new Map<string, StaleCacheEntry>();
export const STALE_CAP_MS = 5 * 60_000;

export function __resetStaleCacheForTests(): void {
  staleCache.clear();
}
