/**
 * On-chain holder distribution analysis.
 * Uses getAllTokenHolders() + getTokenSupply() to compute concentration metrics
 * against the REAL circulating supply, not the hardcoded total.
 */

import { getAllTokenHolders, getConnection, getOrgTokenMint } from '@/lib/solana';
import { TOKEN_CONFIG } from '@/config/token';
import { createAnonClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface HolderTier {
  label: string;
  min: number;
  max: number | null;
  count: number;
  percentage: number;
  totalBalance: number;
  supplyPercentage: number;
}

export interface TopHolder {
  rank: number;
  address: string;
  balance: number;
  supplyPercentage: number;
}

export interface HolderDistribution {
  totalHolders: number;
  /** Actual on-chain circulating supply (from getTokenSupply) */
  circulatingSupply: number;
  /** Hardcoded max supply from config */
  maxSupply: number;
  /** % of supply held by top 10 wallets */
  top10Concentration: number;
  /** % of supply held by top 50 wallets */
  top50Concentration: number;
  /** Number of wallets holding >= 1% of circulating supply */
  whaleCount: number;
  /** % of supply held by whales (>= 1%) */
  whaleConcentration: number;
  /** Top 20 holders with addresses and percentages */
  topHolders: TopHolder[];
  /** Distribution tiers */
  tiers: HolderTier[];
  /** Median holding size */
  medianBalance: number;
  /** Average holding size */
  averageBalance: number;
  fetchedAt: string;
}

/** Fetch LP vault exclusion list from org settings in database */
async function getLpVaultExclusions(): Promise<Set<string>> {
  try {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('orgs')
      .select('token_analytics_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const config = data?.token_analytics_config as { lp_vault_exclusions?: string[] } | null;
    const exclusions = config?.lp_vault_exclusions ?? [];
    return new Set(exclusions);
  } catch {
    logger.warn('Failed to fetch LP vault exclusions from DB, using empty set');
    return new Set();
  }
}

// Cache
let cache: { data: HolderDistribution; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (RPC call is expensive)

/** Build tier definitions dynamically based on actual circulating supply */
function buildTiers(supply: number): Array<{ label: string; min: number; max: number | null }> {
  return [
    { label: '>1%', min: supply * 0.01, max: null },
    { label: '0.1%–1%', min: supply * 0.001, max: supply * 0.01 },
    { label: '0.01%–0.1%', min: supply * 0.0001, max: supply * 0.001 },
    { label: '<0.01%', min: 0, max: supply * 0.0001 },
  ];
}

/** Fetch actual circulating supply from Solana RPC */
async function getCirculatingSupply(): Promise<number> {
  try {
    const connection = getConnection();
    const mint = getOrgTokenMint();
    const supply = await connection.getTokenSupply(mint);
    return supply.value.uiAmount ?? TOKEN_CONFIG.totalSupply;
  } catch (error) {
    logger.warn('Failed to fetch on-chain token supply, using config fallback:', error);
    return TOKEN_CONFIG.totalSupply;
  }
}

export async function getHolderDistribution(): Promise<HolderDistribution | null> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    // Fetch holders, actual supply, and LP exclusions in parallel
    const [holders, circulatingSupply, lpExclusions] = await Promise.all([
      getAllTokenHolders(),
      getCirculatingSupply(),
      getLpVaultExclusions(),
    ]);

    if (holders.length === 0) {
      return cache?.data ?? null;
    }

    // Filter out LP vaults configured by admin — these are liquidity pools, not real holders
    const realHolders = holders.filter((h) => !lpExclusions.has(h.address));

    // Sort descending by balance
    const sorted = [...realHolders].sort((a, b) => b.balance - a.balance);

    // Use circulating supply as denominator for all % calculations
    const supply = circulatingSupply;

    // Top holder analysis
    const top10Balance = sorted.slice(0, 10).reduce((sum, h) => sum + h.balance, 0);
    const top50Balance = sorted.slice(0, 50).reduce((sum, h) => sum + h.balance, 0);

    const topHolders: TopHolder[] = sorted.slice(0, 20).map((h, i) => ({
      rank: i + 1,
      address: h.address,
      balance: h.balance,
      supplyPercentage: (h.balance / supply) * 100,
    }));

    // Whale analysis (>= 1% of circulating supply)
    const whaleThreshold = supply * 0.01;
    const whales = sorted.filter((h) => h.balance >= whaleThreshold);
    const whaleBalance = whales.reduce((sum, h) => sum + h.balance, 0);

    // Tier breakdown based on circulating supply
    const tierDefs = buildTiers(supply);
    const tiers: HolderTier[] = tierDefs.map((tier) => {
      const inTier = sorted.filter((h) => {
        if (tier.max === null) return h.balance >= tier.min;
        return h.balance >= tier.min && h.balance < tier.max;
      });
      const tierBalance = inTier.reduce((sum, h) => sum + h.balance, 0);
      return {
        label: tier.label,
        min: tier.min,
        max: tier.max,
        count: inTier.length,
        percentage: (inTier.length / sorted.length) * 100,
        totalBalance: tierBalance,
        supplyPercentage: (tierBalance / supply) * 100,
      };
    });

    // Median and average
    const medianIndex = Math.floor(sorted.length / 2);
    const medianBalance = sorted.length > 0 ? sorted[medianIndex].balance : 0;
    const totalBalance = sorted.reduce((sum, h) => sum + h.balance, 0);
    const averageBalance = sorted.length > 0 ? totalBalance / sorted.length : 0;

    const data: HolderDistribution = {
      totalHolders: sorted.length,
      circulatingSupply: supply,
      maxSupply: TOKEN_CONFIG.totalSupply,
      top10Concentration: (top10Balance / supply) * 100,
      top50Concentration: (top50Balance / supply) * 100,
      whaleCount: whales.length,
      whaleConcentration: (whaleBalance / supply) * 100,
      topHolders,
      tiers,
      medianBalance,
      averageBalance,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data, timestamp: now };
    return data;
  } catch (error) {
    logger.error('Holder distribution analysis error:', error);
    return cache?.data ?? null;
  }
}
