import { describe, it, expect, afterEach, vi } from 'vitest';

describe('parseProvidersFromEnv', () => {
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;
  const originalSecondary = process.env.SOLANA_RPC_SECONDARY_URL;
  const originalFallback = process.env.SOLANA_RPC_FALLBACK_URL;
  const originalPublic = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  // NODE_ENV is typed as readonly on NodeJS.ProcessEnv; cast through a mutable
  // shape so strict tsc accepts the assignment in tests that must exercise
  // the production-mode code path in providers.ts.
  const setNodeEnv = (value: string | undefined): void => {
    if (value === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string | undefined>).NODE_ENV = value;
    }
  };

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    restore('SOLANA_RPC_SECONDARY_URL', originalSecondary);
    restore('SOLANA_RPC_FALLBACK_URL', originalFallback);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalPublic);
    setNodeEnv(originalNodeEnv);
    vi.resetModules();
  });

  it('uses mainnet-beta cluster default when no tier URLs are set (dev ergonomics)', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    setNodeEnv('test');
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_TIMEOUT_MS } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('primary');
    expect(providers[0].tier).toBe('primary');
    expect(providers[0].timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });

  it('ignores NEXT_PUBLIC_SOLANA_RPC_URL entirely (browser URL stays browser-only)', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://browser-only.example.com';
    setNodeEnv('test');
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].connection.rpcEndpoint).not.toContain('browser-only.example.com');
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });

  it('throws a clear error in production when no tier URLs are set', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    setNodeEnv('production');
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL/);
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
});

describe('tier resolution', () => {
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

  it('returns [primary, default fallback] when only primary is set', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.tier)).toEqual(['primary', 'fallback']);
    expect(providers.map((p) => p.name)).toEqual(['primary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://primary.example');
    expect(providers[1].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('returns [primary, secondary, default fallback] when primary+secondary are set', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.tier)).toEqual(['primary', 'secondary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://primary.example');
    expect(providers[1].connection.rpcEndpoint).toBe('https://secondary.example');
    expect(providers[2].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('uses SOLANA_RPC_FALLBACK_URL to override the default fallback', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://fallback.example';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.connection.rpcEndpoint)).toEqual([
      'https://primary.example',
      'https://secondary.example',
      'https://fallback.example',
    ]);
  });

  it('throws a clear error when SOLANA_RPC_SECONDARY_URL is set but primary is not', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL is required/);
  });

  it('throws when only SOLANA_RPC_FALLBACK_URL is set without primary', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://fallback.example';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL is required/);
  });
});

describe('deduplication', () => {
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

  it('deduplicates when primary and secondary share the same URL', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://same.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://same.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.name)).toEqual(['primary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://same.example');
    expect(providers[1].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('deduplicates case-insensitively when primary and fallback collide', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://Host.Example/rpc';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://host.example/rpc';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].tier).toBe('primary');
  });
});
