import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { consumeWalletNonce } from '../../src/features/auth/nonce';

/**
 * CRIT-3 regression test (Security audit 2026-05-08).
 *
 * The wallet-link route used to invalidate the nonce with a non-atomic
 * UPDATE and explicitly continued even when the update failed:
 *   "Continue even if marking nonce fails - validation was successful"
 * That left a replay window: two requests carrying the same signed message
 * could both pass `used_at IS NULL` and both link the wallet.
 *
 * The fix is `consumeWalletNonce()` which issues a single conditional
 * UPDATE — `.is('used_at', null)` filters atomically and the returned row
 * count is the consume receipt. Zero rows ⇒ caller MUST reject with 409.
 */

type Updater = Parameters<typeof consumeWalletNonce>[0];

function mockClient(opts: {
  returnRows?: Array<{ id: string }>;
  error?: { message: string };
}): Updater {
  const builder = {
    from: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    select: vi.fn(),
  };
  builder.from.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.select.mockResolvedValue({
    data: opts.returnRows ?? null,
    error: opts.error ?? null,
  });
  return builder as unknown as Updater;
}

describe('consumeWalletNonce - atomic invalidation (CRIT-3)', () => {
  it('returns ok=true when one row is updated', async () => {
    const client = mockClient({ returnRows: [{ id: 'nonce-1' }] });
    const res = await consumeWalletNonce(client, 'nonce-1');
    expect(res).toEqual({ ok: true, id: 'nonce-1' });
  });

  it('returns ok=false reason=already-used when no rows are updated', async () => {
    // Race scenario: another request already consumed the nonce, so the
    // .is('used_at', null) filter excludes the row and the update returns [].
    const client = mockClient({ returnRows: [] });
    const res = await consumeWalletNonce(client, 'nonce-1');
    expect(res).toEqual({ ok: false, reason: 'already-used' });
  });

  it('returns ok=false reason=already-used when data is null', async () => {
    const client = mockClient({ returnRows: undefined });
    const res = await consumeWalletNonce(client, 'nonce-1');
    expect(res).toEqual({ ok: false, reason: 'already-used' });
  });

  it('returns ok=false reason=error when supabase reports an error', async () => {
    const client = mockClient({ error: { message: 'connection lost' } });
    const res = await consumeWalletNonce(client, 'nonce-1');
    expect(res).toEqual({ ok: false, reason: 'error', message: 'connection lost' });
  });

  it('issues exactly one UPDATE with the atomic .is(used_at, null) filter', async () => {
    let capturedColumn = '';
    let capturedValue: unknown = undefined;
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            is: (column: string, value: unknown) => {
              capturedColumn = column;
              capturedValue = value;
              return {
                select: async () => ({ data: [{ id: 'n' }], error: null }),
              };
            },
          }),
        }),
      }),
    } as unknown as Updater;
    await consumeWalletNonce(client, 'n');
    expect(capturedColumn).toBe('used_at');
    expect(capturedValue).toBeNull();
  });
});

describe('link-wallet route uses atomic nonce consume (CRIT-3)', () => {
  // Static guard: the dangerous "continue even if invalidation fails" pattern
  // must not return — and the consumeWalletNonce helper must be wired in.
  const routeSource = readFileSync(
    path.resolve(__dirname, '../../src/app/api/auth/link-wallet/route.ts'),
    'utf-8',
  );

  it('imports consumeWalletNonce', () => {
    expect(routeSource).toContain('consumeWalletNonce');
  });

  it('does not contain the swallowed-error comment', () => {
    expect(routeSource).not.toMatch(/Continue even if marking nonce fails/i);
  });

  it('does not contain a non-atomic update missing the used_at-null check', () => {
    // The legacy pattern was:
    //   .update({ used_at: ... })
    //   .eq('id', nonceRecord.id)
    // with no .is('used_at', null) on the same statement.
    // We allow the helper to wrap the call; the route should not use the
    // raw Supabase chain to flip used_at any more.
    const naive = /\.update\(\s*\{\s*used_at:[^}]*\}\s*\)\s*\.eq\([^)]*\)(?!\s*\.is\()/m;
    expect(routeSource).not.toMatch(naive);
  });
});
