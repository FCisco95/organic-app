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

describe('env URL validation', () => {
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;
  const originalSecondary = process.env.SOLANA_RPC_SECONDARY_URL;
  const originalFallback = process.env.SOLANA_RPC_FALLBACK_URL;
  const originalPublic = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    restore('SOLANA_RPC_SECONDARY_URL', originalSecondary);
    restore('SOLANA_RPC_FALLBACK_URL', originalFallback);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalPublic);
    vi.resetModules();
  });

  it('rejects an invalid SOLANA_RPC_PRIMARY_URL with a clear error', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'not a url';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL/);
  });

  it('rejects a non-http(s) scheme', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'ftp://example.test';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL/);
  });

  it('accepts http:// and https:// URLs', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'http://localhost:8899';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers[0].connection.rpcEndpoint).toBe('http://localhost:8899');
  });

  it('rejects an invalid NEXT_PUBLIC_SOLANA_RPC_URL on the legacy fallback path', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'not a url';
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/NEXT_PUBLIC_SOLANA_RPC_URL/);
  });
});
