import { describe, it, expect, afterEach, vi } from 'vitest';

describe('rpc-live pool wiring', () => {
  const originalMode = process.env.SOLANA_RPC_MODE;
  const originalDisabled = process.env.SOLANA_RPC_POOL_DISABLED;
  const originalUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, val: string | undefined) => {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    };
    restore('SOLANA_RPC_MODE', originalMode);
    restore('SOLANA_RPC_POOL_DISABLED', originalDisabled);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalUrl);
    vi.resetModules();
  });

  it('getConnection() returns a Connection object — API preserved', async () => {
    delete process.env.SOLANA_RPC_MODE;
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://example.test';
    vi.resetModules();
    const { getConnection } = await import('../rpc-live');
    const { Connection } = await import('@solana/web3.js');
    expect(getConnection()).toBeInstanceOf(Connection);
  });

  it('getSolanaRpc() returns FixtureSolanaRpc when SOLANA_RPC_MODE=fixture (pool bypassed)', async () => {
    process.env.SOLANA_RPC_MODE = 'fixture';
    vi.resetModules();
    const { getSolanaRpc } = await import('../index');
    const { FixtureSolanaRpc } = await import('../rpc-fixture');
    expect(getSolanaRpc()).toBeInstanceOf(FixtureSolanaRpc);
  });

  it('exposes __getPool() only when SOLANA_RPC_POOL_DISABLED is unset', async () => {
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    vi.resetModules();
    const mod = await import('../rpc-live');
    expect(typeof mod.__getPool).toBe('function');
    expect(mod.__getPool()).not.toBeNull();
  });

  it('returns null from __getPool() when SOLANA_RPC_POOL_DISABLED=true', async () => {
    process.env.SOLANA_RPC_POOL_DISABLED = 'true';
    vi.resetModules();
    const mod = await import('../rpc-live');
    expect(mod.__getPool()).toBeNull();
  });
});

describe('public export surface (regression)', () => {
  it('index.ts exports the exact symbols existing callers depend on', async () => {
    vi.resetModules();
    const mod = await import('../index');
    const expected = [
      'getSolanaRpc',
      'getConnection',
      'getOrgTokenMint',
      'ORG_TOKEN_MINT',
      'getTokenBalance',
      'getAllTokenHolders',
      'isOrgHolder',
    ];
    for (const name of expected) {
      expect(mod).toHaveProperty(name);
    }
  });

  it('SolanaRpc interface contract: LiveSolanaRpc implements required methods', async () => {
    const { LiveSolanaRpc } = await import('../rpc-live');
    const inst = new LiveSolanaRpc();
    expect(typeof inst.getTokenBalance).toBe('function');
    expect(typeof inst.isOrgHolder).toBe('function');
    expect(typeof inst.getAllTokenHolders).toBe('function');
  });
});
