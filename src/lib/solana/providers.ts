import { Connection, clusterApiUrl } from '@solana/web3.js';

export type ProviderTier = 'primary' | 'secondary' | 'fallback';

export interface RpcProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly connection: Connection;
  readonly timeoutMs: number;
}

export const DEFAULT_TIMEOUT_MS = 5_000;

function resolvePrimaryUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return clusterApiUrl('mainnet-beta');
}

export function parseProvidersFromEnv(): RpcProvider[] {
  const url = resolvePrimaryUrl();
  return [
    {
      name: 'primary',
      tier: 'primary',
      connection: new Connection(url, 'finalized'),
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
  ];
}
