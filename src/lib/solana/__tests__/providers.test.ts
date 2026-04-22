import { describe, it, expect, afterEach, vi } from 'vitest';

describe('parseProvidersFromEnv', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    } else {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = originalUrl;
    }
    vi.resetModules();
  });

  it('returns a single primary provider from NEXT_PUBLIC_SOLANA_RPC_URL when set', async () => {
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://example-rpc.test';
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_TIMEOUT_MS } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('primary');
    expect(providers[0].tier).toBe('primary');
    expect(providers[0].timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(providers[0].connection.rpcEndpoint).toBe('https://example-rpc.test');
  });

  it('falls back to clusterApiUrl mainnet-beta when env is unset', async () => {
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('primary');
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });

  it('trims whitespace and rejects empty strings, falling back to cluster default', async () => {
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = '   ';
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });
});
