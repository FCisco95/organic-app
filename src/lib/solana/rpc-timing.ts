/**
 * Shared timing helpers for the Solana RPC transport layer.
 *
 * `withTimeout` races a promise against a timer so that slow providers
 * cannot block the call. It is shared by RpcPool (per-attempt deadline)
 * and ConsensusVerifier (per-provider fanout deadline).
 */

export async function withTimeout<T>(
  op: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Ensure a late rejection from op (after the timeout wins) is observed
  // and doesn't trip Node's unhandled-rejection handler.
  op.catch(() => {});
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([op, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
