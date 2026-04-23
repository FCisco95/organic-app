interface HolderEntry {
  address: string;
  balance: number;
}

interface HolderCountCache {
  count: number;
  top: HolderEntry[];
  ts: number;
}

export type { HolderEntry, HolderCountCache };

export const STALE_CAP_MS = 10 * 60_000;

let holderCountCache: HolderCountCache | null = null;

export function getHolderCountCache(): HolderCountCache | null {
  return holderCountCache;
}

export function setHolderCountCache(value: HolderCountCache): void {
  holderCountCache = value;
}

export function __resetHolderCountCacheForTests(): void {
  holderCountCache = null;
}
