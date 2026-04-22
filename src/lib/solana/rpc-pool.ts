/**
 * RpcPool — resilient transport for Solana RPC reads.
 *
 * Public surface:
 *   - RpcPool class (call<T>, getHealth)
 *   - classifyRpcError (exported for tests; internal otherwise)
 *
 * See docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §6.
 */

export type RpcErrorKind = 'transient' | 'permanent' | 'empty-ok';

const TRANSIENT_NODE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EPIPE',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

const TRANSIENT_RPC_CODES = new Set([-32005, -32603]);
const PERMANENT_RPC_CODES = new Set([-32602]);

const EMPTY_OK_PATTERNS = [
  /could not find account/i,
  /account does not exist/i,
  /account not found/i,
];

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof record.status === 'number') return record.status;
  if (
    typeof record.response === 'object' &&
    record.response !== null &&
    typeof record.response.status === 'number'
  ) {
    return record.response.status;
  }
  return undefined;
}

function extractCode(error: unknown): string | number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as { code?: unknown };
  if (typeof record.code === 'string' || typeof record.code === 'number') {
    return record.code;
  }
  return undefined;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

export function classifyRpcError(error: unknown): RpcErrorKind {
  const message = extractMessage(error);
  if (EMPTY_OK_PATTERNS.some((p) => p.test(message))) return 'empty-ok';

  const code = extractCode(error);
  if (typeof code === 'string' && TRANSIENT_NODE_CODES.has(code)) return 'transient';
  if (typeof code === 'number') {
    if (PERMANENT_RPC_CODES.has(code)) return 'permanent';
    if (TRANSIENT_RPC_CODES.has(code)) return 'transient';
  }

  const status = extractStatus(error);
  if (typeof status === 'number') {
    if (status === 429) return 'transient';
    if (status >= 500 && status < 600) return 'transient';
    if (status >= 400 && status < 500) return 'permanent';
  }

  if (/timeout|timed out/i.test(message)) return 'transient';

  return 'transient';
}
