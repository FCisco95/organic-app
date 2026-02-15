import { NextResponse } from 'next/server';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getTokenBalance } from '@/lib/solana';
import { TOKEN_CONFIG, TREASURY_ALLOCATIONS } from '@/config/token';
import type { TreasuryTransaction } from '@/features/treasury/types';

let cached: { data: unknown; timestamp: number } | null = null;
let cachedTransactions: { data: TreasuryTransaction[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000;
const TRANSACTION_CACHE_TTL = 10 * 60_000;
const TRANSACTION_FETCH_TIMEOUT_MS = 2_500;
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

async function fetchSolPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112',
      { signal: AbortSignal.timeout(5000), next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.data?.['So11111111111111111111111111111111111111112']?.price;
    return typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

async function fetchOrgPrice(): Promise<number | null> {
  if (!TOKEN_CONFIG.mint) return null;
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${TOKEN_CONFIG.mint}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.data?.[TOKEN_CONFIG.mint]?.price;
    return typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

async function fetchRecentTransactions(walletAddress: string): Promise<TreasuryTransaction[]> {
  const connection = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const signatures = await connection.getSignaturesForAddress(pubkey, {
    limit: 10,
  });

  if (signatures.length === 0) return [];

  const txs = await connection.getParsedTransactions(
    signatures.map((s) => s.signature),
    { maxSupportedTransactionVersion: 0 }
  );

  const results: TreasuryTransaction[] = [];

  for (let i = 0; i < signatures.length; i++) {
    const sig = signatures[i];
    const tx = txs[i];

    let type: TreasuryTransaction['type'] = 'unknown';
    let amount: number | null = null;
    let token: TreasuryTransaction['token'] = null;
    let direction: TreasuryTransaction['direction'] = 'in';

    if (tx?.meta && tx.transaction) {
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed) {
          const parsed = ix.parsed;
          if (parsed.type === 'transfer' && parsed.info) {
            type = 'transfer';
            amount = (parsed.info.lamports as number) / LAMPORTS_PER_SOL;
            token = 'SOL';
            direction = parsed.info.destination === walletAddress ? 'in' : 'out';
            break;
          }
          if (parsed.type === 'transferChecked' && parsed.info) {
            type = 'token_transfer';
            amount = parsed.info.tokenAmount?.uiAmount ?? null;
            token = 'ORG';
            direction = parsed.info.destination === walletAddress ? 'in' : 'out';
            break;
          }
        }
      }
    }

    results.push({
      signature: sig.signature,
      block_time: sig.blockTime ?? null,
      slot: sig.slot,
      type,
      amount,
      token,
      direction,
    });
  }

  return results;
}

async function getRecentTransactions(walletAddress: string): Promise<TreasuryTransaction[]> {
  const now = Date.now();
  if (cachedTransactions && now - cachedTransactions.timestamp < TRANSACTION_CACHE_TTL) {
    return cachedTransactions.data;
  }

  try {
    const transactions = await fetchRecentTransactions(walletAddress);
    cachedTransactions = { data: transactions, timestamp: now };
    return transactions;
  } catch (error) {
    console.error('Error fetching treasury transactions:', error);
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
        headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
      });
    }

    const wallet = TOKEN_CONFIG.treasuryWallet;
    const connection = getConnection();
    const pubkey = new PublicKey(wallet);

    const [solBalance, orgBalance, solPrice, orgPrice, transactions] = await Promise.all([
      connection.getBalance(pubkey),
      getTokenBalance(wallet),
      fetchSolPrice(),
      fetchOrgPrice(),
      getRecentTransactionsWithTimeout(wallet),
    ]);

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
    cached = { data: response, timestamp: now };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Treasury API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
