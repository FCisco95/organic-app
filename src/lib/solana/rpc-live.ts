import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaRpc, TokenHolder } from './rpc';
import { parseProvidersFromEnv, type RpcProvider } from './providers';
import { RpcPool } from './rpc-pool';
import { ConsensusVerifier } from './rpc-consensus';

let cachedConnection: { rpcUrl: string; connection: Connection } | null = null;
let cachedOrgMint: { mintAddress: string; mint: PublicKey } | null = null;
let cachedPool: RpcPool | null = null;
let cachedConsensus: ConsensusVerifier | null = null;
// cachedProviders is set once per module lifetime. Cleared only on module
// reload (vi.resetModules() in tests; process restart in prod). Mutating
// NEXT_PUBLIC_SOLANA_RPC_URL at runtime without a module reload has no effect.
let cachedProviders: ReadonlyArray<RpcProvider> | null = null;

const TOKEN_BALANCE_CACHE_TTL_MS = 15 * 1000;
const TOKEN_HOLDERS_CACHE_TTL_MS = 5 * 60 * 1000;
const HEAVY_OP_TIMEOUT_MS = 10_000;

const tokenBalanceCache = new Map<string, { balance: number; timestamp: number }>();
const tokenHoldersCache = new Map<
  string,
  { holders: Array<{ address: string; balance: number }>; timestamp: number }
>();

function poolDisabled(): boolean {
  return process.env.SOLANA_RPC_POOL_DISABLED === 'true';
}

function getProviders(): ReadonlyArray<RpcProvider> {
  if (cachedProviders) return cachedProviders;
  cachedProviders = parseProvidersFromEnv();
  return cachedProviders;
}

/** @internal — exported for tests only. */
export function __getPool(): RpcPool | null {
  if (poolDisabled()) return null;
  if (cachedPool) return cachedPool;
  cachedPool = new RpcPool(getProviders());
  return cachedPool;
}

/** @internal — exported for tests only. */
export function __getConsensus(): ConsensusVerifier | null {
  if (poolDisabled()) return null;
  if (cachedConsensus) return cachedConsensus;
  const pool = __getPool();
  if (!pool) return null;
  cachedConsensus = new ConsensusVerifier(getProviders(), pool);
  return cachedConsensus;
}

/**
 * @internal — test-only hook. Clears all module-level caches so tests can
 * re-parse env and rebuild providers/pool/consensus between scenarios.
 */
export function __resetRpcCachesForTests(): void {
  cachedConnection = null;
  cachedOrgMint = null;
  cachedPool = null;
  cachedConsensus = null;
  cachedProviders = null;
}

export function getConnection(): Connection {
  // Legacy callers still depend on a direct Connection object. In PR 1 we
  // return the primary provider's connection, which is identical to the
  // current behavior. PR 4 migrates these callers to proxy routes.
  const providers = getProviders();
  const primary = providers[0];
  if (!primary) {
    throw new Error('No RPC providers configured');
  }
  if (cachedConnection?.rpcUrl === primary.connection.rpcEndpoint) {
    return cachedConnection.connection;
  }
  cachedConnection = {
    rpcUrl: primary.connection.rpcEndpoint,
    connection: primary.connection,
  };
  return primary.connection;
}

export function getOrgTokenMint(): PublicKey {
  const mintAddress =
    process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || 'DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk';
  if (cachedOrgMint?.mintAddress === mintAddress) return cachedOrgMint.mint;
  const mint = new PublicKey(mintAddress);
  cachedOrgMint = { mintAddress, mint };
  return mint;
}

export const ORG_TOKEN_MINT = getOrgTokenMint();

async function runRead<T>(
  label: string,
  operation: (connection: Connection) => Promise<T>,
  timeoutMs?: number
): Promise<T> {
  const pool = __getPool();
  if (pool) {
    return pool.call(operation, { label, timeoutMs });
  }
  // Kill-switch path: legacy direct-Connection, no retry, no breaker.
  return operation(getConnection());
}

export async function getTokenBalance(
  walletAddress: string,
  mintAddress: PublicKey = ORG_TOKEN_MINT,
  options?: { skipCache?: boolean }
): Promise<number> {
  const cacheKey = `${walletAddress}:${mintAddress.toBase58()}`;
  const now = Date.now();
  const cachedBalance = tokenBalanceCache.get(cacheKey);
  if (
    !options?.skipCache &&
    cachedBalance &&
    now - cachedBalance.timestamp < TOKEN_BALANCE_CACHE_TTL_MS
  ) {
    return cachedBalance.balance;
  }

  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenAccounts = await runRead('getTokenBalance', (connection) =>
      connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    const tokenAccount = tokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === mintAddress.toBase58()
    );

    if (!tokenAccount) {
      tokenBalanceCache.set(cacheKey, { balance: 0, timestamp: now });
      return 0;
    }

    const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    const normalizedBalance = balance || 0;
    tokenBalanceCache.set(cacheKey, { balance: normalizedBalance, timestamp: now });

    if (tokenBalanceCache.size > 1000) {
      const cutoff = now - TOKEN_BALANCE_CACHE_TTL_MS;
      for (const [key, value] of tokenBalanceCache.entries()) {
        if (value.timestamp < cutoff) tokenBalanceCache.delete(key);
      }
    }

    return normalizedBalance;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    if (cachedBalance) return cachedBalance.balance;
    return 0;
  }
}

export async function isOrgHolder(
  walletAddress: string,
  options?: { skipCache?: boolean }
): Promise<boolean> {
  const balance = await getTokenBalance(walletAddress, ORG_TOKEN_MINT, options);
  return balance > 0;
}

/**
 * Authoritative fresh holder check against a specific `Connection`.
 *
 * Unlike `isOrgHolder`, this helper bypasses both the module-level TTL cache
 * and the pool's retry/breaker layer. It is designed to be invoked by the
 * `ConsensusVerifier` once per provider in parallel — each provider must
 * observe its own independent read so disagreements are not masked by cache
 * hits or shared pool state.
 */
export async function isOrgHolderUsingConnection(
  walletAddress: string,
  connection: Connection,
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<boolean> {
  const walletKey = new PublicKey(walletAddress);
  const accounts = await connection.getParsedTokenAccountsByOwner(walletKey, {
    programId: TOKEN_PROGRAM_ID,
  });
  const match = accounts.value.find(
    (a) => a.account.data.parsed.info.mint === mintAddress.toBase58()
  );
  if (!match) return false;
  const ui = match.account.data.parsed.info.tokenAmount.uiAmount;
  return (ui ?? 0) > 0;
}

/**
 * Authoritative fresh holder-set read against a specific `Connection`.
 *
 * Mirrors `getAllTokenHolders` for consensus fanout: bypasses the module
 * TTL cache and the `RpcPool`'s retry/breaker layer so each provider's
 * read is independent. Normalization (dedup-by-owner, sum balances) must
 * match `compareHolderSet` and the cached `getAllTokenHolders` result
 * shape, so a consensus-winning value is structurally identical to the
 * historical DB-persisted shape.
 *
 * Does NOT log per-row parse failures by design — the comparator will
 * surface any cross-provider shape drift. Malformed accounts are filtered
 * silently.
 */
export async function getAllTokenHoldersUsingConnection(
  connection: Connection,
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<Array<{ address: string; balance: number }>> {
  const accounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mintAddress.toBase58() } },
    ],
  });
  const holderBalances = new Map<string, number>();
  for (const account of accounts) {
    const data = account.account.data;
    if (!('parsed' in data)) continue;
    const tokenData = data.parsed.info;
    const balance = tokenData.tokenAmount?.uiAmount;
    if (balance && balance > 0) {
      const owner = tokenData.owner as string;
      const previous = holderBalances.get(owner) ?? 0;
      holderBalances.set(owner, previous + balance);
    }
  }
  return Array.from(holderBalances.entries()).map(([address, balance]) => ({
    address,
    balance,
  }));
}

export async function getAllTokenHolders(
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<Array<{ address: string; balance: number }>> {
  const mintKey = mintAddress.toBase58();
  const now = Date.now();
  const cachedHolders = tokenHoldersCache.get(mintKey);
  if (cachedHolders && now - cachedHolders.timestamp < TOKEN_HOLDERS_CACHE_TTL_MS) {
    return cachedHolders.holders;
  }

  try {
    const accounts = await runRead(
      'getAllTokenHolders',
      (connection) =>
        connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mintAddress.toBase58() } },
          ],
        }),
      HEAVY_OP_TIMEOUT_MS
    );

    const holderBalances = new Map<string, number>();
    for (const account of accounts) {
      try {
        const data = account.account.data;
        if ('parsed' in data) {
          const tokenData = data.parsed.info;
          const balance = tokenData.tokenAmount?.uiAmount;
          if (balance && balance > 0) {
            const owner = tokenData.owner as string;
            const previous = holderBalances.get(owner) || 0;
            holderBalances.set(owner, previous + balance);
          }
        }
      } catch (err) {
        console.error('Error parsing account:', err);
      }
    }

    const holders = Array.from(holderBalances.entries()).map(([address, balance]) => ({
      address,
      balance,
    }));
    tokenHoldersCache.set(mintKey, { holders, timestamp: now });
    return holders;
  } catch (error) {
    console.error('Error fetching all token holders:', error);
    if (cachedHolders) return cachedHolders.holders;
    return [];
  }
}

export class LiveSolanaRpc implements SolanaRpc {
  async getTokenBalance(walletAddress: string, mintAddress?: PublicKey): Promise<number> {
    return getTokenBalance(walletAddress, mintAddress);
  }
  async getAllTokenHolders(mintAddress?: PublicKey): Promise<TokenHolder[]> {
    return getAllTokenHolders(mintAddress);
  }
  async isOrgHolder(walletAddress: string): Promise<boolean> {
    return isOrgHolder(walletAddress);
  }
}
