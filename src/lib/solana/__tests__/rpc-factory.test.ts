import { describe, it, expect, afterEach, vi } from 'vitest';

describe('getSolanaRpc factory', () => {
  const originalMode = process.env.SOLANA_RPC_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.SOLANA_RPC_MODE;
    } else {
      process.env.SOLANA_RPC_MODE = originalMode;
    }
    vi.resetModules();
  });

  it('returns FixtureSolanaRpc when SOLANA_RPC_MODE=fixture', async () => {
    process.env.SOLANA_RPC_MODE = 'fixture';
    vi.resetModules();
    const { getSolanaRpc } = await import('../index');
    const { FixtureSolanaRpc } = await import('../rpc-fixture');
    expect(getSolanaRpc()).toBeInstanceOf(FixtureSolanaRpc);
  });

  it('returns LiveSolanaRpc when SOLANA_RPC_MODE is unset', async () => {
    delete process.env.SOLANA_RPC_MODE;
    vi.resetModules();
    const { getSolanaRpc } = await import('../index');
    const { LiveSolanaRpc } = await import('../rpc-live');
    expect(getSolanaRpc()).toBeInstanceOf(LiveSolanaRpc);
  });
});
