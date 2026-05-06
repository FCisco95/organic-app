import { getAllTokenHolders, getOrgTokenMint, getTokenMintInfo } from '@/lib/solana';

export interface TokenTrust {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  holderCount: number;
  fetchedAt: string;
}

const TRUST_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedTrust: { trust: TokenTrust; timestamp: number } | null = null;

/**
 * Fetches on-chain trust signals for the configured org token: whether the
 * mint and freeze authorities have been revoked, and the current holder
 * count. Cached server-side for 5 minutes.
 *
 * Returns `null` when the mint env var isn't configured, when the mint
 * account can't be read, and no stale cache is available. The dashboard
 * surface hides the trust strip in that case.
 */
export async function getTokenTrust(): Promise<TokenTrust | null> {
  const now = Date.now();
  if (cachedTrust && now - cachedTrust.timestamp < TRUST_CACHE_TTL_MS) {
    return cachedTrust.trust;
  }

  if (!process.env.NEXT_PUBLIC_ORG_TOKEN_MINT) return null;

  try {
    const mint = getOrgTokenMint();
    const [mintInfo, holders] = await Promise.all([
      getTokenMintInfo(mint),
      getAllTokenHolders(mint),
    ]);

    if (!mintInfo) {
      if (cachedTrust) return cachedTrust.trust;
      return null;
    }

    const trust: TokenTrust = {
      mintAuthorityRevoked: mintInfo.mintAuthority === null,
      freezeAuthorityRevoked: mintInfo.freezeAuthority === null,
      holderCount: holders.length,
      fetchedAt: new Date().toISOString(),
    };

    cachedTrust = { trust, timestamp: now };
    return trust;
  } catch (error) {
    console.error('Error fetching token trust:', error);
    if (cachedTrust) return cachedTrust.trust;
    return null;
  }
}

/** @internal — test-only hook. */
export function __resetTokenTrustCacheForTests(): void {
  cachedTrust = null;
}
