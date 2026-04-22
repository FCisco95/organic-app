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

export type BreakerState = 'closed' | 'open' | 'half-open';

interface Sample {
  ok: boolean;
  at: number;
}

const WINDOW_MS = 60_000;
const MIN_SAMPLES = 20;
const OPEN_THRESHOLD = 0.5;
const HALF_OPEN_AFTER_MS = 30_000;

export class CircuitBreaker {
  private samples: Sample[] = [];
  private openedAt: number | null = null;
  private probeInFlight = false;

  recordSuccess(): void {
    const now = Date.now();
    this.prune(now);
    this.samples.push({ ok: true, at: now });
    if (this.probeInFlight) {
      // Half-open probe succeeded → close.
      this.openedAt = null;
      this.probeInFlight = false;
      this.samples = [];
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.prune(now);
    this.samples.push({ ok: false, at: now });
    if (this.probeInFlight) {
      // Half-open probe failed → reopen for another 30s.
      this.openedAt = now;
      this.probeInFlight = false;
      return;
    }
    if (this.shouldOpen()) {
      this.openedAt = now;
    }
  }

  canAttempt(): boolean {
    const s = this.state();
    if (s === 'closed') return true;
    if (s === 'open') return false;
    // half-open: allow exactly one in-flight probe.
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  state(): BreakerState {
    const now = Date.now();
    this.prune(now);

    if (this.openedAt !== null) {
      if (now - this.openedAt >= HALF_OPEN_AFTER_MS) return 'half-open';
      return 'open';
    }

    if (this.shouldOpen()) {
      this.openedAt = now;
      return 'open';
    }

    return 'closed';
  }

  private prune(now: number): void {
    const cutoff = now - WINDOW_MS;
    this.samples = this.samples.filter((s) => s.at >= cutoff);
  }

  private shouldOpen(): boolean {
    if (this.samples.length < MIN_SAMPLES) return false;
    const failures = this.samples.filter((s) => !s.ok).length;
    return failures / this.samples.length > OPEN_THRESHOLD;
  }
}

export interface ProviderHealthSnapshot {
  successCount: number;
  failureCount: number;
  lastErrorMessage: string | null;
  latencySamples: number[];
}

const MAX_LATENCY_SAMPLES = 100;

export class ProviderHealthTracker {
  private successes = 0;
  private failures = 0;
  private lastError: string | null = null;
  private latencies: number[] = [];

  recordOutcome(outcome: { ok: boolean; latencyMs: number; errorMessage?: string }): void {
    if (outcome.ok) {
      this.successes += 1;
    } else {
      this.failures += 1;
      this.lastError = outcome.errorMessage ?? null;
    }
    this.latencies.push(outcome.latencyMs);
    if (this.latencies.length > MAX_LATENCY_SAMPLES) {
      this.latencies.splice(0, this.latencies.length - MAX_LATENCY_SAMPLES);
    }
  }

  snapshot(): ProviderHealthSnapshot {
    return {
      successCount: this.successes,
      failureCount: this.failures,
      lastErrorMessage: this.lastError,
      latencySamples: [...this.latencies],
    };
  }
}
