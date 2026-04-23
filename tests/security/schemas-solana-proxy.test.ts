import { describe, it, expect } from 'vitest';
import { walletQuerySchema, txSignatureQuerySchema, topNSchema } from '@/features/solana-proxy/schemas';

describe('walletQuerySchema', () => {
  it('accepts a valid base58 wallet address', () => {
    const good = '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6';
    expect(walletQuerySchema.parse({ wallet: good })).toEqual({ wallet: good });
  });

  it('rejects empty string', () => {
    expect(() => walletQuerySchema.parse({ wallet: '' })).toThrow();
  });

  it('rejects non-base58 characters', () => {
    expect(() => walletQuerySchema.parse({ wallet: '0x1234' })).toThrow();
  });

  it('rejects string longer than 44 chars', () => {
    expect(() => walletQuerySchema.parse({ wallet: 'a'.repeat(45) })).toThrow();
  });
});

describe('txSignatureQuerySchema', () => {
  it('accepts 88-char base58 signature', () => {
    const sig = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
    expect(txSignatureQuerySchema.parse({ signature: sig })).toEqual({ signature: sig });
  });

  it('rejects short string', () => {
    expect(() => txSignatureQuerySchema.parse({ signature: 'abc' })).toThrow();
  });

  it('rejects string longer than 88 chars (max base58 signature length)', () => {
    expect(() => txSignatureQuerySchema.parse({ signature: 'a'.repeat(89) })).toThrow();
  });
});

describe('topNSchema', () => {
  it('accepts integer in 1..100', () => {
    expect(topNSchema.parse('10')).toBe(10);
  });

  it('rejects 0 and negatives', () => {
    expect(() => topNSchema.parse('0')).toThrow();
    expect(() => topNSchema.parse('-1')).toThrow();
  });

  it('rejects values > 100', () => {
    expect(() => topNSchema.parse('101')).toThrow();
  });

  it('undefined returns undefined (optional)', () => {
    expect(topNSchema.optional().parse(undefined)).toBeUndefined();
  });
});
