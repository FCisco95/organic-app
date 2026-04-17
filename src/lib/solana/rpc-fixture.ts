import type { PublicKey } from '@solana/web3.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SolanaRpc, TokenHolder } from './rpc';

/**
 * Reads fixture holders from the `solana_rpc_fixtures` table.
 * Used only when SOLANA_RPC_MODE=fixture (CI / local dev). The table
 * is created by supabase/seed.sql and does not exist in production DBs.
 */
export class FixtureSolanaRpc implements SolanaRpc {
  private client(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'FixtureSolanaRpc requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async getAllTokenHolders(_mintAddress?: PublicKey): Promise<TokenHolder[]> {
    const { data, error } = await this.client()
      .from('solana_rpc_fixtures')
      .select('wallet_address, balance');
    if (error) {
      throw new Error(`FixtureSolanaRpc.getAllTokenHolders: ${error.message}`);
    }
    return (data ?? []).map((row) => ({
      address: row.wallet_address as string,
      balance: Number(row.balance),
    }));
  }

  async getTokenBalance(walletAddress: string, _mintAddress?: PublicKey): Promise<number> {
    const { data, error } = await this.client()
      .from('solana_rpc_fixtures')
      .select('balance')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (error) {
      throw new Error(`FixtureSolanaRpc.getTokenBalance: ${error.message}`);
    }
    return data ? Number(data.balance) : 0;
  }

  async isOrgHolder(walletAddress: string): Promise<boolean> {
    return (await this.getTokenBalance(walletAddress)) > 0;
  }
}
