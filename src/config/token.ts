// Static fallbacks — used when DB is unreachable or on the client side.
export const TOKEN_CONFIG = {
  symbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? '$ORG',
  mint: process.env.NEXT_PUBLIC_ORG_TOKEN_MINT ?? '',
  decimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? '9'),
  totalSupply: Number(process.env.NEXT_PUBLIC_TOKEN_TOTAL_SUPPLY ?? '1000000000'),
  treasuryWallet: 'CuBV7VVq3zSrh1wf5SZCp36JqpFRCGJHvV7he6K8SDJ1',
} as const;

export const TREASURY_ALLOCATIONS = [
  { key: 'development', percentage: 40, color: '#f97316' },
  { key: 'community', percentage: 25, color: '#22c55e' },
  { key: 'operations', percentage: 20, color: '#3b82f6' },
  { key: 'reserve', percentage: 15, color: '#a855f7' },
] as const;

export interface OrgConfig {
  symbol: string;
  mint: string;
  decimals: number;
  totalSupply: number;
  treasuryWallet: string;
  treasuryAllocations: { key: string; percentage: number; color: string }[];
}

/**
 * Calculate market cap from price using the configured total supply.
 * Returns null if price is null/undefined.
 */
export function calculateMarketCap(price: number | null | undefined): number | null {
  if (price == null) return null;
  return price * TOKEN_CONFIG.totalSupply;
}
