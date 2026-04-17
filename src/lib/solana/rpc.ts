import type { PublicKey } from '@solana/web3.js';

export interface TokenHolder {
  address: string;
  balance: number;
}

export interface SolanaRpc {
  getTokenBalance(walletAddress: string, mintAddress?: PublicKey): Promise<number>;
  getAllTokenHolders(mintAddress?: PublicKey): Promise<TokenHolder[]>;
  isOrgHolder(walletAddress: string): Promise<boolean>;
}
