import type { SolanaRpc } from './rpc';
import { LiveSolanaRpc, __getConsensus } from './rpc-live';
import { FixtureSolanaRpc } from './rpc-fixture';
import type { ConsensusVerifier } from './rpc-consensus';

export type { SolanaRpc, TokenHolder } from './rpc';
export {
  getConnection,
  getOrgTokenMint,
  ORG_TOKEN_MINT,
  getTokenBalance,
  getAllTokenHolders,
  isOrgHolder,
  isOrgHolderUsingConnection,
} from './rpc-live';
export {
  ConsensusError,
  compareBoolean,
  compareLamports,
  compareHolderSet,
  compareTxConfirmation,
} from './rpc-consensus';
export type { ConsensusVerifier } from './rpc-consensus';

let cached: SolanaRpc | null = null;

export function getSolanaRpc(): SolanaRpc {
  if (cached) return cached;
  cached =
    process.env.SOLANA_RPC_MODE === 'fixture'
      ? new FixtureSolanaRpc()
      : new LiveSolanaRpc();
  return cached;
}

/**
 * Returns the shared `ConsensusVerifier` for security-critical reads, or
 * `null` when the RPC pool is disabled (kill-switch). Callers must treat a
 * null return as "consensus unavailable — fall back to existing behavior".
 */
export function getSolanaConsensus(): ConsensusVerifier | null {
  return __getConsensus();
}
