import type { SolanaRpc } from './rpc';
import { LiveSolanaRpc } from './rpc-live';
import { FixtureSolanaRpc } from './rpc-fixture';

export type { SolanaRpc, TokenHolder } from './rpc';
export {
  getConnection,
  getOrgTokenMint,
  ORG_TOKEN_MINT,
  getTokenBalance,
  getAllTokenHolders,
  isOrgHolder,
} from './rpc-live';

let cached: SolanaRpc | null = null;

export function getSolanaRpc(): SolanaRpc {
  if (cached) return cached;
  cached =
    process.env.SOLANA_RPC_MODE === 'fixture'
      ? new FixtureSolanaRpc()
      : new LiveSolanaRpc();
  return cached;
}
