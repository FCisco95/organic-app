/**
 * Treasury consensus-read helper.
 *
 * Treasury balance is the one critical read that does graceful-degrade
 * instead of fail-closed (spec §7 — treasury row). On a consensus
 * disagreement, we serve the last-known-good balance and surface a
 * `stale` flag so the UI can render a warning badge; on cold start
 * with no cached value the error propagates to the route-level 500
 * path.
 *
 * Non-consensus errors (e.g., RPC 429, transport failures) bubble up
 * unchanged so the existing route-level stale-header fallback in
 * `GET()` continues to handle them.
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §7.
 */

import type { PublicKey } from '@solana/web3.js';
import {
  ConsensusError,
  compareLamports,
  getConnection,
  getSolanaConsensus,
} from '@/lib/solana';
import { logger } from '@/lib/logger';

export interface SolBalanceResult {
  balance: number;
  stale: boolean;
}

let lastKnownGoodSolBalance: { balance: number; capturedAt: number } | null = null;

/** @internal — for tests only. */
export function __resetTreasuryConsensusCacheForTests(): void {
  lastKnownGoodSolBalance = null;
}

/**
 * Read the treasury SOL balance through the ConsensusVerifier when
 * available, falling back to last-known-good on ConsensusError
 * (graceful-degrade per spec §7 — treasury row).
 */
export async function readTreasurySolBalance(
  pubkey: PublicKey
): Promise<SolBalanceResult> {
  const consensus = getSolanaConsensus();
  if (consensus) {
    try {
      const balance = await consensus.verify(
        (connection) => connection.getBalance(pubkey),
        { label: 'treasury.getBalance', compare: compareLamports }
      );
      lastKnownGoodSolBalance = { balance, capturedAt: Date.now() };
      return { balance, stale: false };
    } catch (err) {
      if (err instanceof ConsensusError) {
        if (lastKnownGoodSolBalance) {
          logger.error(
            'Treasury: consensus disagreement — serving last-known-good with stale=true',
            {
              label: err.label,
              last_captured_at: lastKnownGoodSolBalance.capturedAt,
            }
          );
          return { balance: lastKnownGoodSolBalance.balance, stale: true };
        }
        logger.error(
          'Treasury: consensus disagreement and no cached balance — propagating',
          { label: err.label }
        );
        throw err;
      }
      throw err;
    }
  }

  // Consensus disabled (pool kill-switch / fixture mode). Fall through
  // to the existing direct-Connection path.
  const balance = await getConnection().getBalance(pubkey);
  lastKnownGoodSolBalance = { balance, capturedAt: Date.now() };
  return { balance, stale: false };
}
