import { createClient } from '@/lib/supabase/server';
import { TOKEN_CONFIG, TREASURY_ALLOCATIONS } from './token';
import type { OrgConfig } from './token';

let orgConfigCache: { data: OrgConfig; timestamp: number } | null = null;
const ORG_CONFIG_TTL = 60_000; // 60 seconds

/**
 * Fetch org config from DB (server-side only). Falls back to static config on error.
 * Caches for 60 seconds to avoid repeated DB hits.
 */
export async function getOrgConfig(): Promise<OrgConfig> {
  const now = Date.now();
  if (orgConfigCache && now - orgConfigCache.timestamp < ORG_CONFIG_TTL) {
    return orgConfigCache.data;
  }

  try {
    const supabase = await createClient();

    const { data: org } = await supabase
      .from('orgs')
      .select(
        'token_symbol, token_mint, token_decimals, token_total_supply, treasury_wallet, treasury_allocations'
      )
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (org) {
      const config: OrgConfig = {
        symbol: org.token_symbol,
        mint: org.token_mint ?? '',
        decimals: org.token_decimals,
        totalSupply: org.token_total_supply,
        treasuryWallet: org.treasury_wallet ?? TOKEN_CONFIG.treasuryWallet,
        treasuryAllocations: (org.treasury_allocations as OrgConfig['treasuryAllocations']) ?? [
          ...TREASURY_ALLOCATIONS,
        ],
      };
      orgConfigCache = { data: config, timestamp: now };
      return config;
    }
  } catch {
    // Fallback silently on DB errors
  }

  return {
    symbol: TOKEN_CONFIG.symbol,
    mint: TOKEN_CONFIG.mint,
    decimals: TOKEN_CONFIG.decimals,
    totalSupply: TOKEN_CONFIG.totalSupply,
    treasuryWallet: TOKEN_CONFIG.treasuryWallet,
    treasuryAllocations: [...TREASURY_ALLOCATIONS],
  };
}
