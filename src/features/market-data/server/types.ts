export const MARKET_PRICE_KEYS = ['org_price', 'sol_price'] as const;

export type MarketPriceKey = (typeof MARKET_PRICE_KEYS)[number];

export type MarketDataSource = 'fresh' | 'stale' | 'fallback';

export type MarketProvider = 'jupiter' | 'coingecko' | 'cache' | 'none';

export type MarketPriceSnapshot = {
  key: MarketPriceKey;
  value: number | null;
  source: MarketDataSource;
  provider: MarketProvider;
  fetchedAt: string | null;
  ageSeconds: number | null;
};

export type MarketPriceOptions = {
  forceRefresh?: boolean;
};
