// Atomic nonce consumption used by /api/auth/link-wallet (CRIT-3).
//
// The wallet-link flow must mark a nonce as `used_at = now()` exactly once.
// A non-atomic check-then-update lets two requests carrying the same signed
// message both pass the "used_at IS NULL" guard and both succeed in linking
// the wallet — that's the replay window the security audit identified.
//
// `consumeWalletNonce` issues a single conditional UPDATE with
// `.is('used_at', null)` and uses the returned row count as the consume
// receipt. If zero rows come back, another request already consumed the
// nonce (or it was never valid) — caller MUST reject with 409.

type WalletNonceUpdater = {
  from: (table: 'wallet_nonces') => {
    update: (values: { used_at: string }) => {
      eq: (column: 'id', value: string) => {
        is: (column: 'used_at', value: null) => {
          select: (cols: string) => Promise<{
            data: Array<{ id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

export type ConsumeNonceResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'already-used' | 'error'; message?: string };

export async function consumeWalletNonce(
  client: WalletNonceUpdater,
  nonceId: string,
  now: Date = new Date(),
): Promise<ConsumeNonceResult> {
  const { data, error } = await client
    .from('wallet_nonces')
    .update({ used_at: now.toISOString() })
    .eq('id', nonceId)
    .is('used_at', null)
    .select('id');

  if (error) {
    return { ok: false, reason: 'error', message: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'already-used' };
  }
  return { ok: true, id: data[0].id };
}
