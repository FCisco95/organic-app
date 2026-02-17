import { NextResponse } from 'next/server';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getTokenBalance } from '@/lib/solana';
import { TOKEN_CONFIG, TREASURY_ALLOCATIONS } from '@/config/token';
import type { TreasuryTransaction } from '@/features/treasury/types';
import { logger } from '@/lib/logger';
import {
  buildMarketDataHeaders,
  getMarketPriceSnapshot,
} from '@/features/market-data/server/service';

export const dynamic = 'force-dynamic';

let cached: { data: unknown; timestamp: number; marketHeaders: Record<string, string> } | null = null;
let cachedTransactions: { data: TreasuryTransaction[]; timestamp: number } | null = null;
let transactionsBackoffUntilMs = 0;
const CACHE_TTL = 60_000;
const TRANSACTION_CACHE_TTL = 10 * 60_000;
const TRANSACTION_RATE_LIMIT_BACKOFF_MS = 5 * 60_000;
const TRANSACTION_FETCH_TIMEOUT_MS = 2_500;
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

function isRpcRateLimitError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('429');
  }

  if (error instanceof Error) {
    return error.message.includes('429');
  }

  return false;
}

async function fetchRecentTransactions(walletAddress: string): Promise<TreasuryTransaction[]> {
  const connection = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const signatures = await connection.getSignaturesForAddress(pubkey, {
    limit: 5,
  });

  if (signatures.length === 0) return [];

  return signatures.map((sig) => ({
    signature: sig.signature,
    block_time: sig.blockTime ?? null,
    slot: sig.slot,
    type: 'unknown' as const,
    amount: null,
    token: null,
    direction: 'in' as const,
  }));
}

async function getRecentTransactions(walletAddress: string): Promise<TreasuryTransaction[]> {
  const now = Date.now();
  if (cachedTransactions && now - cachedTransactions.timestamp < TRANSACTION_CACHE_TTL) {
    return cachedTransactions.data;
  }

  if (transactionsBackoffUntilMs > now) {
    return cachedTransactions?.data ?? [];
  }

  try {
    const transactions = await fetchRecentTransactions(walletAddress);
    cachedTransactions = { data: transactions, timestamp: now };
    transactionsBackoffUntilMs = 0;
    return transactions;
  } catch (error) {
    if (isRpcRateLimitError(error)) {
      transactionsBackoffUntilMs = now + TRANSACTION_RATE_LIMIT_BACKOFF_MS;
      logger.warn('Treasury transaction fetch hit RPC 429, entering backoff', {
        backoff_ms: TRANSACTION_RATE_LIMIT_BACKOFF_MS,
      });
      return cachedTransactions?.data ?? [];
    }

    logger.error('Error fetching treasury transactions:', error);
    return cachedTransactions?.data ?? [];
  }
}

async function getRecentTransactionsWithTimeout(
  walletAddress: string
): Promise<TreasuryTransaction[]> {
  const fallback = cachedTransactions?.data ?? [];
  return Promise.race([
    getRecentTransactions(walletAddress),
    new Promise<TreasuryTransaction[]>((resolve) =>
      setTimeout(() => resolve(fallback), TRANSACTION_FETCH_TIMEOUT_MS)
    ),
  ]);
}

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': RESPONSE_CACHE_CONTROL,
          ...cached.marketHeaders,
        },
      });
    }

    const wallet = TOKEN_CONFIG.treasuryWallet;
    const connection = getConnection();
    const pubkey = new PublicKey(wallet);

    const [solBalance, orgBalance, solPriceSnapshot, orgPriceSnapshot, transactions] = await Promise.all([
      connection.getBalance(pubkey),
      getTokenBalance(wallet),
      getMarketPriceSnapshot('sol_price'),
      getMarketPriceSnapshot('org_price'),
      getRecentTransactionsWithTimeout(wallet),
    ]);

    const solPrice = solPriceSnapshot.value;
    const orgPrice = orgPriceSnapshot.value;
    const solAmount = solBalance / LAMPORTS_PER_SOL;
    const solUsd = solPrice != null ? solAmount * solPrice : null;
    const orgUsd = orgPrice != null ? orgBalance * orgPrice : null;
    const totalUsd = solUsd != null && orgUsd != null ? solUsd + orgUsd : null;

    const allocations = TREASURY_ALLOCATIONS.map((a) => ({
      key: a.key,
      label: a.key,
      percentage: a.percentage,
      color: a.color,
      amount_usd: totalUsd != null ? (totalUsd * a.percentage) / 100 : null,
    }));

    const data = {
      balances: {
        sol: solAmount,
        sol_usd: solUsd,
        org: orgBalance,
        org_usd: orgUsd,
        total_usd: totalUsd,
      },
      allocations,
      transactions,
      wallet_address: wallet,
    };

    const response = { data };
    const marketHeaders = buildMarketDataHeaders([solPriceSnapshot, orgPriceSnapshot]);
    cached = { data: response, timestamp: now, marketHeaders };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': RESPONSE_CACHE_CONTROL,
        ...marketHeaders,
      },
    });
  } catch (error) {
    logger.error('Treasury API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
