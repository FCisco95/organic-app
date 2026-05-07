import { getAllTokenHolders, getOrgTokenMint, getTokenMintInfo } from '@/lib/solana';

export interface TokenTrust {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  /**
   * Total holder count from `getAllTokenHolders`. `null` when the holder
   * scan failed or timed out — the UI hides the holders pill in that case
   * but still renders the mint + freeze authority pills.
   */
  holderCount: number | null;
  fetchedAt: string;
}

const TRUST_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedTrust: { trust: TokenTrust; timestamp: number } | null = null;

/**
 * Fetches on-chain trust signals for the configured org token: whether the
 * mint and freeze authorities have been revoked, and the current holder
 * count. Cached server-side for 5 minutes.
 *
 * Mint authority + freeze authority are cheap single-account reads. The
 * holder scan (`getAllTokenHolders`) is a heavy `getParsedProgramAccounts`
 * call that can time out under load. We use `Promise.allSettled` so a
 * holder-count failure does NOT poison the cheap authority reads —
 * `holderCount` becomes `null` in that case and the UI hides only the
 * holders pill.
 *
 * Returns `null` only when the mint env var isn't configured, when the
 * mint account can't be read, and no stale cache is available.
 */
export async function getTokenTrust(): Promise<TokenTrust | null> {
  const now = Date.now();
  if (cachedTrust && now - cachedTrust.timestamp < TRUST_CACHE_TTL_MS) {
    return cachedTrust.trust;
  }

  if (!process.env.NEXT_PUBLIC_ORG_TOKEN_MINT) return null;

  try {
    const mint = getOrgTokenMint();
    const [mintInfoResult, holdersResult] = await Promise.allSettled([
      getTokenMintInfo(mint),
      getAllTokenHolders(mint),
    ]);

    const mintInfo =
      mintInfoResult.status === 'fulfilled' ? mintInfoResult.value : null;

    if (!mintInfo) {
      if (mintInfoResult.status === 'rejected') {
        console.error('Error fetching token mint info:', mintInfoResult.reason);
      }
      if (cachedTrust) return cachedTrust.trust;
      return null;
    }

    let holderCount: number | null = null;
    if (holdersResult.status === 'fulfilled') {
      holderCount = holdersResult.value.length;
    } else {
      console.error('Error fetching token holders:', holdersResult.reason);
    }

    const trust: TokenTrust = {
      mintAuthorityRevoked: mintInfo.mintAuthority === null,
      freezeAuthorityRevoked: mintInfo.freezeAuthority === null,
      holderCount,
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
