import { Connection, clusterApiUrl } from '@solana/web3.js';
import { z } from 'zod';

export type ProviderTier = 'primary' | 'secondary' | 'fallback';

export interface RpcProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly connection: Connection;
  readonly timeoutMs: number;
}

export const DEFAULT_TIMEOUT_MS = 5_000;
export const DEFAULT_FALLBACK_URL = 'https://api.mainnet-beta.solana.com';

const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'must be a valid http(s) URL' }
  );

function readEnvUrl(envKey: string): string | undefined {
  const raw = process.env[envKey];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const result = httpUrlSchema.safeParse(trimmed);
  if (!result.success) {
    throw new Error(
      `${envKey} is invalid: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return result.data;
}

function legacyPublicUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
}

export function parseProvidersFromEnv(): RpcProvider[] {
  const primaryUrl = readEnvUrl('SOLANA_RPC_PRIMARY_URL');
  const secondaryUrl = readEnvUrl('SOLANA_RPC_SECONDARY_URL');
  const fallbackUrlOverride = readEnvUrl('SOLANA_RPC_FALLBACK_URL');

  // Transitional: if none of the new tier vars are set, honor the legacy
  // NEXT_PUBLIC_SOLANA_RPC_URL (or the Solana cluster default) as the sole
  // primary. PR 5 removes this fallback entirely.
  if (!primaryUrl && !secondaryUrl && !fallbackUrlOverride) {
    const legacy = legacyPublicUrl() ?? clusterApiUrl('mainnet-beta');
    return [buildProvider('primary', 'primary', legacy)];
  }

  // At least one tier var was set. Primary is required in this branch —
  // without it we cannot honor tier semantics (secondary must follow a
  // primary; fallback alone is not a valid configuration).
  if (!primaryUrl) {
    throw new Error(
      'SOLANA_RPC_PRIMARY_URL is required when SOLANA_RPC_SECONDARY_URL or SOLANA_RPC_FALLBACK_URL is set'
    );
  }

  const fallbackUrl = fallbackUrlOverride ?? DEFAULT_FALLBACK_URL;

  const ordered: Array<{ name: string; tier: ProviderTier; url: string }> = [
    { name: 'primary', tier: 'primary', url: primaryUrl },
  ];
  if (secondaryUrl) ordered.push({ name: 'secondary', tier: 'secondary', url: secondaryUrl });
  ordered.push({ name: 'fallback', tier: 'fallback', url: fallbackUrl });

  const seen = new Set<string>();
  const deduped = ordered.filter((entry) => {
    const key = entry.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.map((entry) => buildProvider(entry.name, entry.tier, entry.url));
}

function buildProvider(name: string, tier: ProviderTier, url: string): RpcProvider {
  return {
    name,
    tier,
    connection: new Connection(url, 'finalized'),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
