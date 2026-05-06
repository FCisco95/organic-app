import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';

vi.mock('@/lib/solana', () => ({
  getOrgTokenMint: vi.fn(),
  getTokenMintInfo: vi.fn(),
  getAllTokenHolders: vi.fn(),
}));

import { getAllTokenHolders, getOrgTokenMint, getTokenMintInfo } from '@/lib/solana';
import { __resetTokenTrustCacheForTests, getTokenTrust } from '@/features/token/onchain';

const FAKE_MINT = new PublicKey('DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk');
const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ORG_TOKEN_MINT;

describe('getTokenTrust', () => {
  beforeEach(() => {
    __resetTokenTrustCacheForTests();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ORG_TOKEN_MINT = FAKE_MINT.toBase58();
    vi.mocked(getOrgTokenMint).mockReturnValue(FAKE_MINT);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ORG_TOKEN_MINT = ORIGINAL_ENV;
  });

  it('returns null when NEXT_PUBLIC_ORG_TOKEN_MINT is not set', async () => {
    delete process.env.NEXT_PUBLIC_ORG_TOKEN_MINT;
    __resetTokenTrustCacheForTests();
    expect(await getTokenTrust()).toBeNull();
    expect(getTokenMintInfo).not.toHaveBeenCalled();
    expect(getAllTokenHolders).not.toHaveBeenCalled();
  });

  it('reports both authorities revoked when null on the mint', async () => {
    vi.mocked(getTokenMintInfo).mockResolvedValue({
      mintAuthority: null,
      freezeAuthority: null,
      decimals: 9,
      supply: '1000000000000000',
    });
    vi.mocked(getAllTokenHolders).mockResolvedValue([
      { address: 'A', balance: 1 },
      { address: 'B', balance: 2 },
      { address: 'C', balance: 3 },
    ]);

    const trust = await getTokenTrust();

    expect(trust).not.toBeNull();
    expect(trust!.mintAuthorityRevoked).toBe(true);
    expect(trust!.freezeAuthorityRevoked).toBe(true);
    expect(trust!.holderCount).toBe(3);
    expect(typeof trust!.fetchedAt).toBe('string');
  });

  it('reports authorities active when present', async () => {
    vi.mocked(getTokenMintInfo).mockResolvedValue({
      mintAuthority: 'SomeAuthorityPubkey',
      freezeAuthority: 'SomeFreezePubkey',
      decimals: 9,
      supply: '1000000000000000',
    });
    vi.mocked(getAllTokenHolders).mockResolvedValue([]);

    const trust = await getTokenTrust();

    expect(trust!.mintAuthorityRevoked).toBe(false);
    expect(trust!.freezeAuthorityRevoked).toBe(false);
    expect(trust!.holderCount).toBe(0);
  });

  it('returns null when mint info cannot be read and no cache exists', async () => {
    vi.mocked(getTokenMintInfo).mockResolvedValue(null);
    vi.mocked(getAllTokenHolders).mockResolvedValue([]);
    expect(await getTokenTrust()).toBeNull();
  });

  it('returns null and swallows errors from underlying RPC reads', async () => {
    vi.mocked(getTokenMintInfo).mockRejectedValue(new Error('rpc down'));
    vi.mocked(getAllTokenHolders).mockResolvedValue([]);
    expect(await getTokenTrust()).toBeNull();
  });

  it('serves the cached value within the 5-minute TTL', async () => {
    vi.mocked(getTokenMintInfo).mockResolvedValue({
      mintAuthority: null,
      freezeAuthority: null,
      decimals: 9,
      supply: '1',
    });
    vi.mocked(getAllTokenHolders).mockResolvedValue([{ address: 'A', balance: 1 }]);

    const first = await getTokenTrust();
    const second = await getTokenTrust();

    expect(first).toEqual(second);
    expect(getTokenMintInfo).toHaveBeenCalledTimes(1);
    expect(getAllTokenHolders).toHaveBeenCalledTimes(1);
  });

  it('falls back to stale cache when a refetch fails after TTL expiry', async () => {
    vi.mocked(getTokenMintInfo).mockResolvedValueOnce({
      mintAuthority: null,
      freezeAuthority: null,
      decimals: 9,
      supply: '1',
    });
    vi.mocked(getAllTokenHolders).mockResolvedValueOnce([{ address: 'A', balance: 1 }]);

    const fresh = await getTokenTrust();
    expect(fresh).not.toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);

    vi.mocked(getTokenMintInfo).mockRejectedValueOnce(new Error('rpc down'));
    const stale = await getTokenTrust();

    expect(stale).toEqual(fresh);
    vi.useRealTimers();
  });
});
