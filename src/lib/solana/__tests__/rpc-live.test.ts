import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Connection, PublicKey } from '@solana/web3.js';

describe('rpc-live pool wiring', () => {
  const originalMode = process.env.SOLANA_RPC_MODE;
  const originalDisabled = process.env.SOLANA_RPC_POOL_DISABLED;
  const originalUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;

  afterEach(() => {
    const restore = (key: string, val: string | undefined) => {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    };
    restore('SOLANA_RPC_MODE', originalMode);
    restore('SOLANA_RPC_POOL_DISABLED', originalDisabled);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalUrl);
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    vi.resetModules();
  });

  it('getConnection() returns a Connection object — API preserved', async () => {
    delete process.env.SOLANA_RPC_MODE;
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://example.test';
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
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://example.test';
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

  it('returns null from __getConsensus() when SOLANA_RPC_POOL_DISABLED=true', async () => {
    process.env.SOLANA_RPC_POOL_DISABLED = 'true';
    vi.resetModules();
    const mod = await import('../rpc-live');
    expect(mod.__getConsensus()).toBeNull();
  });

  it('returns a ConsensusVerifier from __getConsensus() when pool is not disabled', async () => {
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://example.test';
    vi.resetModules();
    const mod = await import('../rpc-live');
    const { ConsensusVerifier } = await import('../rpc-consensus');
    const consensus = mod.__getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus).toBeInstanceOf(ConsensusVerifier);
  });

  it('getSolanaConsensus() mirrors __getConsensus() behavior', async () => {
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://example.test';
    vi.resetModules();
    const { getSolanaConsensus } = await import('../index');
    const { ConsensusVerifier } = await import('../rpc-consensus');
    expect(getSolanaConsensus()).toBeInstanceOf(ConsensusVerifier);

    process.env.SOLANA_RPC_POOL_DISABLED = 'true';
    vi.resetModules();
    const reimport = await import('../index');
    expect(reimport.getSolanaConsensus()).toBeNull();
  });
});

describe('isOrgHolderUsingConnection', () => {
  type ParsedTokenAccount = {
    account: {
      data: {
        parsed: {
          info: {
            mint: string;
            tokenAmount: { uiAmount: number | null };
          };
        };
      };
    };
  };

  function mockConnectionReturning(
    accounts: ReadonlyArray<ParsedTokenAccount>
  ): { connection: Connection; spy: ReturnType<typeof vi.fn> } {
    const spy = vi.fn(async (_owner: PublicKey, _opts: { programId: PublicKey }) => ({
      value: accounts,
    }));
    const connection = {
      getParsedTokenAccountsByOwner: spy,
    } as unknown as Connection;
    return { connection, spy };
  }

  it('returns true when a matching mint account has a positive uiAmount', async () => {
    const { isOrgHolderUsingConnection, ORG_TOKEN_MINT } = await import('../rpc-live');
    const { connection, spy } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: ORG_TOKEN_MINT.toBase58(),
                tokenAmount: { uiAmount: 123 },
              },
            },
          },
        },
      },
    ]);

    const result = await isOrgHolderUsingConnection(
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      connection
    );

    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns false when no token account matches the mint', async () => {
    const { isOrgHolderUsingConnection } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: 'SomeOtherMintAddressAAAAAAAAAAAAAAAAAAAAAAA',
                tokenAmount: { uiAmount: 500 },
              },
            },
          },
        },
      },
    ]);

    const result = await isOrgHolderUsingConnection(
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      connection
    );

    expect(result).toBe(false);
  });

  it('returns false when the matching account has zero balance', async () => {
    const { isOrgHolderUsingConnection, ORG_TOKEN_MINT } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: ORG_TOKEN_MINT.toBase58(),
                tokenAmount: { uiAmount: 0 },
              },
            },
          },
        },
      },
    ]);

    const result = await isOrgHolderUsingConnection(
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      connection
    );

    expect(result).toBe(false);
  });

  it('returns false when the matching account reports null uiAmount', async () => {
    const { isOrgHolderUsingConnection, ORG_TOKEN_MINT } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: ORG_TOKEN_MINT.toBase58(),
                tokenAmount: { uiAmount: null },
              },
            },
          },
        },
      },
    ]);

    const result = await isOrgHolderUsingConnection(
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      connection
    );

    expect(result).toBe(false);
  });
});

describe('getAllTokenHoldersUsingConnection', () => {
  type ParsedProgramAccount = {
    account: {
      data:
        | {
            parsed: {
              info: {
                owner: string;
                tokenAmount: { uiAmount: number | null };
              };
            };
          }
        | { data: Buffer };
    };
  };

  function mockConnectionReturning(
    accounts: ReadonlyArray<ParsedProgramAccount>
  ): { connection: Connection; spy: ReturnType<typeof vi.fn> } {
    const spy = vi.fn(async (_programId: PublicKey, _config: unknown) => accounts);
    const connection = {
      getParsedProgramAccounts: spy,
    } as unknown as Connection;
    return { connection, spy };
  }

  it('sums balances for two accounts owned by the same wallet', async () => {
    const { getAllTokenHoldersUsingConnection } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerWalletAAA',
                tokenAmount: { uiAmount: 100 },
              },
            },
          },
        },
      },
      {
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerWalletAAA',
                tokenAmount: { uiAmount: 250 },
              },
            },
          },
        },
      },
    ]);

    const holders = await getAllTokenHoldersUsingConnection(connection);

    expect(holders).toHaveLength(1);
    expect(holders[0]).toEqual({ address: 'OwnerWalletAAA', balance: 350 });
  });

  it('excludes accounts with zero balance', async () => {
    const { getAllTokenHoldersUsingConnection } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerWalletAAA',
                tokenAmount: { uiAmount: 0 },
              },
            },
          },
        },
      },
      {
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerWalletBBB',
                tokenAmount: { uiAmount: 42 },
              },
            },
          },
        },
      },
    ]);

    const holders = await getAllTokenHoldersUsingConnection(connection);

    expect(holders).toHaveLength(1);
    expect(holders[0]).toEqual({ address: 'OwnerWalletBBB', balance: 42 });
  });

  it("skips non-'parsed' accounts without throwing", async () => {
    const { getAllTokenHoldersUsingConnection } = await import('../rpc-live');
    const { connection } = mockConnectionReturning([
      {
        account: {
          data: { data: Buffer.from([0x01, 0x02, 0x03]) },
        },
      },
      {
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerWalletAAA',
                tokenAmount: { uiAmount: 7 },
              },
            },
          },
        },
      },
    ]);

    const holders = await getAllTokenHoldersUsingConnection(connection);

    expect(holders).toHaveLength(1);
    expect(holders[0]).toEqual({ address: 'OwnerWalletAAA', balance: 7 });
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
      'getAllTokenHoldersUsingConnection',
      'isOrgHolder',
      'isOrgHolderUsingConnection',
      'getSolanaConsensus',
      'ConsensusError',
      'compareBoolean',
      'compareLamports',
      'compareHolderSet',
      'compareTxConfirmation',
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
