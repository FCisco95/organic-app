import { NextResponse } from 'next/server';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getTokenBalance } from '@/lib/solana';
import { createAnonClient } from '@/lib/supabase/server';
import { TOKEN_CONFIG, TREASURY_ALLOCATIONS } from '@/config/token';
import type { TreasuryTransaction } from '@/features/treasury/types';
import { logger } from '@/lib/logger';
import {
  DEFAULT_SETTLEMENT_EMISSION_PERCENT,
  DEFAULT_SETTLEMENT_FIXED_CAP,
  MAX_SETTLEMENT_CARRYOVER_SPRINTS,
} from '@/features/rewards/settlement';
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

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

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
    const supabase = createAnonClient();

    const [
      solBalance,
      orgBalance,
      solPriceSnapshot,
      orgPriceSnapshot,
      transactions,
      orgConfigResult,
      latestSettlementResult,
    ] = await Promise.all([
      connection.getBalance(pubkey),
      getTokenBalance(wallet),
      getMarketPriceSnapshot('sol_price'),
      getMarketPriceSnapshot('org_price'),
      getRecentTransactionsWithTimeout(wallet),
      supabase
        .from('orgs')
        .select('rewards_config')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sprints')
        .select(
          'id, reward_settlement_status, reward_settlement_committed_at, reward_settlement_kill_switch_at, settlement_blocked_reason, reward_emission_cap, reward_carryover_amount, updated_at'
        )
        .not('reward_settlement_status', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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

    const rewardsConfig =
      orgConfigResult.data?.rewards_config && typeof orgConfigResult.data.rewards_config === 'object'
        ? (orgConfigResult.data.rewards_config as Record<string, unknown>)
        : {};

    const settlementEmissionPercentRaw = parseNumeric(rewardsConfig.settlement_emission_percent);
    const settlementFixedCapRaw = parseNumeric(rewardsConfig.settlement_fixed_cap_per_sprint);
    const settlementCarryoverRaw = parseNumeric(rewardsConfig.settlement_carryover_sprint_cap);

    const settlementCarryoverCap =
      settlementCarryoverRaw != null
        ? Math.max(1, Math.min(MAX_SETTLEMENT_CARRYOVER_SPRINTS, Math.trunc(settlementCarryoverRaw)))
        : MAX_SETTLEMENT_CARRYOVER_SPRINTS;

    const latestSettlement = latestSettlementResult.data;

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
      trust: {
        emission_policy: {
          settlement_emission_percent:
            settlementEmissionPercentRaw != null
              ? settlementEmissionPercentRaw
              : DEFAULT_SETTLEMENT_EMISSION_PERCENT,
          settlement_fixed_cap_per_sprint:
            settlementFixedCapRaw != null ? settlementFixedCapRaw : DEFAULT_SETTLEMENT_FIXED_CAP,
          settlement_carryover_sprint_cap: settlementCarryoverCap,
        },
        latest_settlement: {
          sprint_id: latestSettlement?.id ?? null,
          status: (latestSettlement?.reward_settlement_status as
            | 'pending'
            | 'committed'
            | 'held'
            | 'killed'
            | null) ?? null,
          committed_at: latestSettlement?.reward_settlement_committed_at ?? null,
          kill_switch_at: latestSettlement?.reward_settlement_kill_switch_at ?? null,
          blocked_reason: latestSettlement?.settlement_blocked_reason ?? null,
          emission_cap: latestSettlement?.reward_emission_cap ?? null,
          carryover_amount: latestSettlement?.reward_carryover_amount ?? null,
        },
        audit_log_link: '/admin/settings',
        updated_at: new Date().toISOString(),
        refresh_interval_seconds: 60,
      },
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
