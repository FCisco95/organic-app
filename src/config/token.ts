export const TOKEN_CONFIG = {
  symbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? '$ORG',
  mint: process.env.NEXT_PUBLIC_ORG_TOKEN_MINT ?? '',
  decimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? '9'),
  totalSupply: Number(process.env.NEXT_PUBLIC_TOKEN_TOTAL_SUPPLY ?? '1000000000'),
} as const;

/**
 * Calculate market cap from price using the configured total supply.
 * Returns null if price is null/undefined.
 */
export function calculateMarketCap(price: number | null | undefined): number | null {
  if (price == null) return null;
  return price * TOKEN_CONFIG.totalSupply;
}
