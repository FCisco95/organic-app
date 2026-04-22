/**
 * RpcPool — resilient transport for Solana RPC reads.
 *
 * Public surface:
 *   - RpcPool class (call<T>, getHealth)
 *   - classifyRpcError (exported for tests; internal otherwise)
 *
 * See docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §6.
 */

import type { Connection } from '@solana/web3.js';
import type { RpcProvider } from './providers';

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

/** Alias used by tests to construct stub providers. */
export type RpcProviderLike = RpcProvider;

export interface RpcCallOptions {
  timeoutMs?: number;
  label?: string;
}

export class RpcCallError extends Error {
  constructor(
    message: string,
    readonly cause: unknown,
    readonly lastKind: RpcErrorKind
  ) {
    super(message);
    this.name = 'RpcCallError';
  }
}

async function withTimeout<T>(
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

export class RpcPool {
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly health = new Map<string, ProviderHealthTracker>();

  constructor(private readonly providers: ReadonlyArray<RpcProvider>) {
    if (providers.length === 0) {
      throw new Error('RpcPool requires at least one provider');
    }
    for (const p of providers) {
      this.breakers.set(p.name, new CircuitBreaker());
      this.health.set(p.name, new ProviderHealthTracker());
    }
  }

  /**
   * Execute an operation against the provider pool with failover,
   * circuit-breaker gating, and a per-attempt timeout.
   *
   * Error contract:
   * - `empty-ok` errors (account-not-found signals) propagate unwrapped —
   *   caller receives the raw error so stack/metadata are preserved.
   * - `permanent` errors (HTTP 4xx except 429, JSON-RPC -32602) propagate
   *   unwrapped. Retrying won't help; caller decides next steps.
   * - `transient` exhaustion across all providers throws `RpcCallError`
   *   carrying the last underlying error in `cause` and its classification
   *   in `lastKind`.
   */
  async call<T>(
    operation: (connection: Connection) => Promise<T>,
    opts: RpcCallOptions = {}
  ): Promise<T> {
    const label = opts.label ?? 'rpc.call';
    const perAttemptMs = opts.timeoutMs;
    const budgetMs =
      (perAttemptMs ?? Math.max(...this.providers.map((p) => p.timeoutMs))) * 3;
    const deadline = Date.now() + budgetMs;

    let lastError: unknown = new Error('no attempts made');
    let lastKind: RpcErrorKind = 'transient';

    for (const provider of this.providers) {
      if (Date.now() >= deadline) break;
      const breaker = this.breakers.get(provider.name)!;
      const health = this.health.get(provider.name)!;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() >= deadline) break;
        if (!breaker.canAttempt()) break;

        const ms = perAttemptMs ?? provider.timeoutMs;
        const start = Date.now();
        try {
          const value = await withTimeout(operation(provider.connection), ms, label);
          breaker.recordSuccess();
          health.recordOutcome({ ok: true, latencyMs: Date.now() - start });
          return value;
        } catch (err) {
          const kind = classifyRpcError(err);
          lastError = err;
          lastKind = kind;
          const latencyMs = Date.now() - start;
          if (kind === 'empty-ok') {
            breaker.recordSuccess();
            health.recordOutcome({ ok: true, latencyMs });
            throw err;
          }
          breaker.recordFailure();
          health.recordOutcome({
            ok: false,
            latencyMs,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
          if (kind === 'permanent') throw err;
          // transient: retry this provider once, then fall through to next tier.
        }
      }
    }

    throw new RpcCallError(
      `${label} exhausted all providers`,
      lastError,
      lastKind
    );
  }

  getHealth(): Array<{ name: string; tier: RpcProvider['tier']; breaker: BreakerState; stats: ProviderHealthSnapshot }> {
    return this.providers.map((p) => ({
      name: p.name,
      tier: p.tier,
      breaker: this.breakers.get(p.name)!.state(),
      stats: this.health.get(p.name)!.snapshot(),
    }));
  }
}
