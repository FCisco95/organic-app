# Solana RPC Resilience — PR 1: Pool Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a provider pool (`RpcPool`) with failover, timeouts, circuit breaker, error classification, and health tracking as the internal transport for all server-side Solana reads, while keeping the public API (`SolanaRpc` interface, `getSolanaRpc()`, `getConnection()`, `getTokenBalance()`, `isOrgHolder()`, `getAllTokenHolders()`) byte-for-byte stable and preserving `SOLANA_RPC_MODE=fixture`.

**Architecture:** Two new files (`providers.ts`, `rpc-pool.ts`) plus an internal rewrite of `rpc-live.ts`. Pool is bypassed entirely when `SOLANA_RPC_MODE=fixture` (test fixture mode) or when the kill-switch env `SOLANA_RPC_POOL_DISABLED=true` is set (operational escape hatch). In PR 1 the pool is populated with a single provider derived from the existing `NEXT_PUBLIC_SOLANA_RPC_URL` (or `clusterApiUrl('mainnet-beta')` when unset) — identical runtime effect to today, but now flowing through pool machinery so PR 2 can add providers without further refactor.

**Tech Stack:** TypeScript (strict, no `any`), `@solana/web3.js` `Connection`, Vitest for unit tests, Zod not required (no external input in PR 1; env parsing is internal).

**Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` — sections §5 (env — read-only `NEXT_PUBLIC_SOLANA_RPC_URL` for PR 1), §6 (Provider Pool — full), §11 (Testing — unit only for this PR).

**Scope — in:**
- `src/lib/solana/providers.ts` (new)
- `src/lib/solana/rpc-pool.ts` (new)
- `src/lib/solana/rpc-live.ts` (reworked internals; exports unchanged)
- `src/lib/solana/__tests__/providers.test.ts` (new)
- `src/lib/solana/__tests__/rpc-pool.test.ts` (new)
- `src/lib/solana/__tests__/rpc-live.test.ts` (new — regression coverage for public API)

**Scope — out (deferred to later PRs):**
- Env var additions (`SOLANA_RPC_PRIMARY_URL` etc.) — PR 2.
- Consensus verifier — PR 3.
- Browser proxy routes (`/api/solana/*`) — PR 4.
- Prod env mutations.

**Hard constraints (from user brief):**
1. **Revertable.** Kill-switch via `SOLANA_RPC_POOL_DISABLED=true` skips the pool entirely and uses the legacy direct-`Connection` path. Single-commit revert must also restore prior behavior — no DB migrations, no cross-module contracts broken.
2. **Fixture mode unchanged.** `SOLANA_RPC_MODE=fixture` bypasses the pool and returns `FixtureSolanaRpc` as today.
3. **TypeScript strict, no `any`.** Use `unknown` for classified errors, generics for `call<T>()`.
4. **Tests required per CLAUDE.md.** Every code change lands with coverage; vitest runs green.
5. **Follow `.claude/rules/`** — `api.md`, `frontend.md`, `typescript/coding-style.md`, `typescript/patterns.md`.

**Execution order:** Tasks are sequential. Do not skip ahead — later tasks reference types, constants, and helpers defined earlier. Commit after every task.

**Pre-flight (once, before Task 1):**

Confirm base state:

```bash
git status                               # clean, on docs/rpc-resilience-design
git log --oneline -1                     # ab55e1e docs(rpc): add Solana RPC resilience design spec
npx vitest run src/lib/solana/__tests__/ # existing rpc-factory.test.ts passes
```

Expected: working tree clean, on `docs/rpc-resilience-design` at `ab55e1e`, one green test (`rpc-factory.test.ts`).

Create the implementation branch off the spec commit (keeps the design PR and the code PR reviewable independently):

```bash
git switch main
git pull --ff-only
git switch -c phase/rpc-pool-foundation
```

> Note: branching off `main` (not `docs/rpc-resilience-design`) keeps the code PR reviewable on its own. The spec PR can merge independently; this PR references it in the description.

---

## Task 1: Scaffold pool types and the provider registry

**Why this exists:** Everything else — circuit breaker, health tracker, pool `call` — depends on a concrete `RpcProvider` shape and a deterministic way to build the provider list from env. Isolating this into `providers.ts` lets us unit-test env parsing with zero dependencies on `@solana/web3.js` network behavior.

**Files:**
- Create: `src/lib/solana/providers.ts`
- Create: `src/lib/solana/__tests__/providers.test.ts`

- [ ] **Step 1: Write failing test — default tier + timeout shape**

Create `src/lib/solana/__tests__/providers.test.ts`:

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('parseProvidersFromEnv', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    } else {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = originalUrl;
    }
    vi.resetModules();
  });

  it('returns a single primary provider from NEXT_PUBLIC_SOLANA_RPC_URL when set', async () => {
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://example-rpc.test';
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('primary');
    expect(providers[0].tier).toBe('primary');
    expect(providers[0].timeoutMs).toBe(5000);
    expect(providers[0].connection.rpcEndpoint).toBe('https://example-rpc.test');
  });

  it('falls back to clusterApiUrl mainnet-beta when env is unset', async () => {
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('primary');
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });

  it('trims whitespace and rejects empty strings, falling back to cluster default', async () => {
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = '   ';
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `npx vitest run src/lib/solana/__tests__/providers.test.ts`
Expected: FAIL with `Cannot find module '../providers'`.

- [ ] **Step 3: Implement `providers.ts`**

Create `src/lib/solana/providers.ts`:

```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';

export type ProviderTier = 'primary' | 'secondary' | 'fallback';

export interface RpcProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly connection: Connection;
  readonly timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 5_000;

function resolvePrimaryUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return clusterApiUrl('mainnet-beta');
}

export function parseProvidersFromEnv(): RpcProvider[] {
  const url = resolvePrimaryUrl();
  return [
    {
      name: 'primary',
      tier: 'primary',
      connection: new Connection(url, 'finalized'),
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
  ];
}
```

- [ ] **Step 4: Run the test — confirm it passes**

Run: `npx vitest run src/lib/solana/__tests__/providers.test.ts`
Expected: all three cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/providers.ts src/lib/solana/__tests__/providers.test.ts
git commit -m "feat(solana): add RpcProvider registry and env parser

First slice of the RPC pool. parseProvidersFromEnv() reads
NEXT_PUBLIC_SOLANA_RPC_URL (trimmed, non-empty) or falls back to
clusterApiUrl('mainnet-beta'), returning a single primary provider.
PR 2 extends this to read SOLANA_RPC_{PRIMARY,SECONDARY,FALLBACK}_URL.

Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §6."
```

---

## Task 2: Error classification

**Why this exists:** The pool's retry, circuit-breaker, and failover logic all key off whether an error is transient (retry), permanent (bubble), or an empty-ok signal (valid answer, don't retry). Wrong classification = infinite retries on bad input, or silent data corruption when "account not found" gets treated as a failure and reinterpreted as 0 by stale-cache fallback.

**Files:**
- Modify: `src/lib/solana/rpc-pool.ts` (new)
- Create: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing test for each classification branch**

Create `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { classifyRpcError, type RpcErrorKind } from '../rpc-pool';

function check(error: unknown, expected: RpcErrorKind): void {
  expect(classifyRpcError(error)).toBe(expected);
}

describe('classifyRpcError', () => {
  it('treats network timeouts as transient', () => {
    check(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), 'transient');
    check(new Error('Request timed out'), 'transient');
  });

  it('treats ECONN* as transient', () => {
    check(Object.assign(new Error('econnreset'), { code: 'ECONNRESET' }), 'transient');
    check(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }), 'transient');
  });

  it('treats HTTP 429 and 5xx as transient', () => {
    check({ status: 429, message: 'rate limited' }, 'transient');
    check({ status: 503, message: 'service unavailable' }, 'transient');
    check({ response: { status: 502 }, message: 'bad gateway' }, 'transient');
  });

  it('treats JSON-RPC -32005 and -32603 as transient', () => {
    check({ code: -32005, message: 'rate limit exceeded' }, 'transient');
    check({ code: -32603, message: 'internal error' }, 'transient');
  });

  it('treats HTTP 4xx (excluding 429) as permanent', () => {
    check({ status: 400, message: 'bad request' }, 'permanent');
    check({ status: 401, message: 'unauthorized' }, 'permanent');
    check({ status: 404, message: 'not found' }, 'permanent');
  });

  it('treats JSON-RPC -32602 invalid params as permanent', () => {
    check({ code: -32602, message: 'invalid params' }, 'permanent');
  });

  it('treats "could not find account" as empty-ok', () => {
    check(new Error('could not find account'), 'empty-ok');
    check(new Error('Account does not exist'), 'empty-ok');
  });

  it('treats POJO errors with empty-ok message text as empty-ok', () => {
    check({ message: 'could not find account', status: 404 }, 'empty-ok');
    check({ message: 'Account does not exist' }, 'empty-ok');
  });

  it('treats unknown errors as transient (fail-open for retry)', () => {
    check(new Error('something weird'), 'transient');
    check('string error', 'transient');
    check(null, 'transient');
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts`
Expected: FAIL — `Cannot find module '../rpc-pool'`.

- [ ] **Step 3: Implement the classifier in `rpc-pool.ts`**

Create `src/lib/solana/rpc-pool.ts` with exactly this content (more will be added in later tasks — do not delete the module docstring):

```typescript
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
```

- [ ] **Step 4: Run tests to confirm green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts`
Expected: all classification cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/rpc-pool.ts src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "feat(solana): add classifyRpcError for pool retry logic

Classifies errors as transient (retry/failover), permanent (bubble up),
or empty-ok (valid answer — account not found). Unknown errors default
to transient so the pool retries once before giving up rather than
bubbling ambiguous failures.

Spec §6 error classification table."
```

---

## Task 3: Circuit breaker

**Why this exists:** When a provider is consistently failing, every request that tries it wastes the per-attempt timeout (5s) before failing over. The breaker short-circuits those calls and lets the provider recover via a single probe, per spec §6 "Circuit breaker (per provider)". This is the machinery that turns degraded-but-alive into silently-skipped, so bugs here mean either trapped in a dead provider or flapping between tiers.

**Files:**
- Modify: `src/lib/solana/rpc-pool.ts`
- Modify: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing breaker tests**

Append to `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker } from '../rpc-pool';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function recordFailures(breaker: CircuitBreaker, count: number): void {
    for (let i = 0; i < count; i++) breaker.recordFailure();
  }

  function recordSuccesses(breaker: CircuitBreaker, count: number): void {
    for (let i = 0; i < count; i++) breaker.recordSuccess();
  }

  it('stays closed below minimum-sample threshold (<20 calls)', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 19);
    expect(breaker.state()).toBe('closed');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('stays closed when failure rate is <=50% even above threshold', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 10);
    recordSuccesses(breaker, 10);
    expect(breaker.state()).toBe('closed');
  });

  it('opens when >50% of last 20+ calls fail', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 11);
    recordSuccesses(breaker, 9);
    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('drops samples older than 60s from the rolling window', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 11);
    recordSuccesses(breaker, 9);
    expect(breaker.state()).toBe('open');

    vi.advanceTimersByTime(61_000);
    // Window drained (samples aged out), but openedAt persists — 61s ≥ 30s
    // half-open threshold, so breaker awaits a probe. Single-probe gating
    // prevents a stampede against a still-possibly-bad provider.
    expect(breaker.state()).toBe('half-open');
    expect(breaker.canAttempt()).toBe(true);  // probe admitted
    expect(breaker.canAttempt()).toBe(false); // subsequent callers blocked
  });

  it('transitions open -> half-open after 30s and allows a single probe', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);

    vi.advanceTimersByTime(30_001);
    expect(breaker.state()).toBe('half-open');
    expect(breaker.canAttempt()).toBe(true); // probe allowed

    // Second immediate probe attempt denied — only one in-flight probe.
    expect(breaker.canAttempt()).toBe(false);
  });

  it('half-open probe success closes the breaker', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    vi.advanceTimersByTime(30_001);
    breaker.canAttempt();
    breaker.recordSuccess();
    expect(breaker.state()).toBe('closed');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('half-open probe failure reopens the breaker for another 30s', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    vi.advanceTimersByTime(30_001);
    breaker.canAttempt();
    breaker.recordFailure();

    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);

    vi.advanceTimersByTime(30_001);
    expect(breaker.state()).toBe('half-open');
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t CircuitBreaker`
Expected: FAIL — `CircuitBreaker is not a constructor` or import error.

- [ ] **Step 3: Implement `CircuitBreaker` in `rpc-pool.ts`**

Append to `src/lib/solana/rpc-pool.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — confirm breaker suite green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t CircuitBreaker`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/rpc-pool.ts src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "feat(solana): add CircuitBreaker for per-provider health

Rolling 60s window, opens when >50% of 20+ samples fail.
Half-open after 30s allowing a single probe; probe success → closed,
probe failure → reopen for another 30s.

Spec §6 Circuit breaker."
```

---

## Task 4: Per-provider health tracker

**Why this exists:** Future admin UI (PR spec §14 follow-ups) and diagnostics need rolling per-provider stats. Keeping this independent of the breaker means we can evolve the UI separately from the retry logic.

**Files:**
- Modify: `src/lib/solana/rpc-pool.ts`
- Modify: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing health-tracker tests**

Append to `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
import { ProviderHealthTracker } from '../rpc-pool';

describe('ProviderHealthTracker', () => {
  it('retains the last 100 latency samples', () => {
    const t = new ProviderHealthTracker();
    for (let i = 0; i < 150; i++) t.recordOutcome({ ok: true, latencyMs: i });
    const snapshot = t.snapshot();
    expect(snapshot.latencySamples).toHaveLength(100);
    expect(snapshot.latencySamples[0]).toBe(50);
    expect(snapshot.latencySamples[99]).toBe(149);
  });

  it('counts failures and stores last error message', () => {
    const t = new ProviderHealthTracker();
    t.recordOutcome({ ok: true, latencyMs: 5 });
    t.recordOutcome({ ok: false, latencyMs: 12, errorMessage: 'boom' });
    const snapshot = t.snapshot();
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.successCount).toBe(1);
    expect(snapshot.lastErrorMessage).toBe('boom');
  });

  it('snapshot is a copy — mutations do not affect tracker state', () => {
    const t = new ProviderHealthTracker();
    t.recordOutcome({ ok: true, latencyMs: 7 });
    const snapshot = t.snapshot();
    snapshot.latencySamples.push(9999);
    expect(t.snapshot().latencySamples).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — confirm failure**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t ProviderHealthTracker`
Expected: FAIL — `ProviderHealthTracker` not exported.

- [ ] **Step 3: Implement `ProviderHealthTracker`**

Append to `src/lib/solana/rpc-pool.ts`:

```typescript
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
```

- [ ] **Step 4: Run — confirm green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t ProviderHealthTracker`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/rpc-pool.ts src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "feat(solana): add ProviderHealthTracker (last-100 latencies)

Per-provider rolling success/failure counts and last 100 latency samples.
Surfaced via RpcPool.getHealth() for future admin UI.

Spec §6 Health tracking."
```

---

## Task 5: RpcPool.call — single-provider timeout enforcement

**Why this exists:** Every `pool.call` MUST have a per-attempt timeout even when only one provider exists, or else a hung RPC stalls the request indefinitely. We start with the one-provider case before layering failover (Task 7), so timeout semantics are pinned down in isolation.

**Files:**
- Modify: `src/lib/solana/rpc-pool.ts`
- Modify: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing timeout tests**

Append to `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
import { RpcPool, type RpcProviderLike } from '../rpc-pool';

function stubProvider(
  name: string,
  tier: 'primary' | 'secondary' | 'fallback',
  handler: () => Promise<unknown>,
  timeoutMs = 50
): RpcProviderLike {
  // Connection is only passed through to handler; tests do not touch it.
  return {
    name,
    tier,
    timeoutMs,
    connection: {} as never,
    __invoke: handler,
  } as unknown as RpcProviderLike;
}

describe('RpcPool.call — single provider', () => {
  beforeEach(() => vi.useRealTimers());

  it('returns the operation result on success', async () => {
    const provider = stubProvider('p', 'primary', async () => 42);
    const pool = new RpcPool([provider]);
    const result = await pool.call(async (_c) => {
      return (provider as unknown as { __invoke: () => Promise<number> }).__invoke();
    });
    expect(result).toBe(42);
  });

  it('enforces per-provider timeoutMs', async () => {
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 500)),
      50
    );
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(async (_c) =>
        (provider as unknown as { __invoke: () => Promise<string> }).__invoke()
      )
    ).rejects.toThrow(/timeout|exhausted/i);
  });

  it('honors opts.timeoutMs override', async () => {
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 200)),
      5_000
    );
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(
        async (_c) =>
          (provider as unknown as { __invoke: () => Promise<string> }).__invoke(),
        { timeoutMs: 25 }
      )
    ).rejects.toThrow(/timeout|exhausted/i);
  });

  it('caps total call time at timeoutMs * 3', async () => {
    // Single provider, transient errors each attempt → budget cap after ~3×timeoutMs.
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 200)),
      60
    );
    const pool = new RpcPool([provider]);
    const started = Date.now();
    await expect(
      pool.call(async (_c) =>
        (provider as unknown as { __invoke: () => Promise<string> }).__invoke()
      )
    ).rejects.toBeInstanceOf(Error);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(400); // 3 × 60 + overhead
  });
});
```

- [ ] **Step 2: Run — confirm failure**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t "RpcPool.call — single provider"`
Expected: FAIL — `RpcPool is not a constructor`.

- [ ] **Step 3: Implement the minimal `RpcPool.call` — single provider, timeout only**

Append to `src/lib/solana/rpc-pool.ts`. (Retries and failover come in later tasks; this task only lands the timeout + budget cap.)

```typescript
import type { Connection } from '@solana/web3.js';
import type { RpcProvider } from './providers';

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
```

- [ ] **Step 4: Run — confirm green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t "RpcPool.call — single provider"`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/rpc-pool.ts src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "feat(solana): RpcPool.call with per-attempt timeout + budget cap

Each attempt bounded by provider.timeoutMs (override via opts.timeoutMs).
Total call time capped at 3× timeout. Unbreakered transients retry once
per provider; empty-ok bubbles as the real answer; permanent fails fast.

Spec §6 Public API, Failover policy."
```

---

## Task 6: Transient / permanent / empty-ok behavior in `call`

**Why this exists:** Task 5 hand-tested timeout; this task locks down the retry branches explicitly — the spec calls out each error kind as a separate failover rule.

**Files:**
- Modify: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing tests for each branch**

Append to `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
describe('RpcPool.call — error branches', () => {
  beforeEach(() => vi.useRealTimers());

  function makeProvider(name: string): RpcProviderLike {
    return {
      name,
      tier: 'primary',
      timeoutMs: 100,
      connection: {} as never,
    } as RpcProviderLike;
  }

  it('retries the same provider once on transient error, then succeeds', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    const result = await pool.call(async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('boom'), { status: 503 });
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry on permanent error (4xx)', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    await expect(
      pool.call(async () => {
        calls += 1;
        throw Object.assign(new Error('bad'), { status: 400 });
      })
    ).rejects.toThrow('bad');
    expect(calls).toBe(1);
  });

  it('propagates empty-ok error as a real answer without retrying', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    await expect(
      pool.call(async () => {
        calls += 1;
        throw new Error('could not find account');
      })
    ).rejects.toThrow(/could not find account/);
    expect(calls).toBe(1);
  });

  it('records success on empty-ok in health stats (not a provider fault)', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(async () => {
        throw new Error('account does not exist');
      })
    ).rejects.toThrow();
    const [health] = pool.getHealth();
    expect(health.stats.successCount).toBe(1);
    expect(health.stats.failureCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run — should already pass (logic was built in Task 5)**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t "RpcPool.call — error branches"`
Expected: 4 tests pass (no new implementation needed — this task pins behavior already implemented).

If any case fails, fix it in `rpc-pool.ts` before continuing. The intended behavior is exactly as stated in the tests.

- [ ] **Step 3: Commit**

```bash
git add src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "test(solana): pin retry semantics per error classification

Transient → retry once per provider. Permanent → fail fast. Empty-ok →
surface as real answer, count as success in health stats (provider is
not faulting — account simply doesn't exist on-chain).

Spec §6 Error classification."
```

---

## Task 7: Multi-provider failover + attempt budget

**Why this exists:** Covers the §6 failover-order rule — primary → secondary → fallback, skipping broken breakers — and the explicit "6 attempts max" budget. These tests construct 2- and 3-provider pools even though PR 1's env parser only produces one provider, so the machinery is proven correct ahead of PR 2.

**Files:**
- Modify: `src/lib/solana/__tests__/rpc-pool.test.ts`

- [ ] **Step 1: Write failing failover tests**

Append to `src/lib/solana/__tests__/rpc-pool.test.ts`:

```typescript
describe('RpcPool.call — failover order', () => {
  beforeEach(() => vi.useRealTimers());

  // Tag each provider's connection with an _id so handlers can tell
  // which provider invoked them without reaching into pool internals.
  function idProvider(
    name: 'primary' | 'secondary' | 'fallback',
    timeoutMs = 100
  ): RpcProviderLike {
    return {
      name,
      tier: name,
      timeoutMs,
      connection: { _id: name } as never,
    } as RpcProviderLike;
  }

  function idOf(c: unknown): string {
    return (c as { _id: string })._id;
  }

  it('fails over primary → secondary when primary keeps throwing transient', async () => {
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);
    const touched: string[] = [];
    const result = await pool.call(async (c) => {
      touched.push(idOf(c));
      if (idOf(c) === 'primary') {
        throw Object.assign(new Error('rate limit'), { status: 429 });
      }
      return 'ok-from-secondary';
    });
    expect(result).toBe('ok-from-secondary');
    // primary: 2 attempts (initial + 1 retry) → secondary: 1 success.
    expect(touched).toEqual(['primary', 'primary', 'secondary']);
  });

  it('skips a provider whose breaker is open', async () => {
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);

    // Prime: 20 rounds where only primary fails; secondary stays healthy.
    for (let i = 0; i < 20; i++) {
      await pool.call(async (c) => {
        if (idOf(c) === 'primary') {
          throw Object.assign(new Error('rl'), { status: 503 });
        }
        return 'ok';
      });
    }
    const health = pool.getHealth();
    expect(health[0].breaker).toBe('open');
    expect(health[1].breaker).toBe('closed');

    const touched: string[] = [];
    const result = await pool.call(async (c) => {
      touched.push(idOf(c));
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(touched).toEqual(['secondary']); // primary skipped entirely
  });

  it('enforces 6-attempt total budget across 3 providers (2 retries each)', async () => {
    const pool = new RpcPool([
      idProvider('primary', 50),
      idProvider('secondary', 50),
      idProvider('fallback', 50),
    ]);
    const touched: string[] = [];
    await expect(
      pool.call(async (c) => {
        touched.push(idOf(c));
        throw Object.assign(new Error('rl'), { status: 503 });
      })
    ).rejects.toBeInstanceOf(Error);
    expect(touched).toEqual([
      'primary',
      'primary',
      'secondary',
      'secondary',
      'fallback',
      'fallback',
    ]);
  });

  it('throws RpcCallError with lastKind when all providers exhaust', async () => {
    const { RpcCallError } = await import('../rpc-pool');
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);
    const err = await pool
      .call(async () => {
        throw Object.assign(new Error('rl'), { status: 503 });
      })
      .then(
        () => null,
        (e: unknown) => e
      );
    expect(err).toBeInstanceOf(RpcCallError);
    expect((err as InstanceType<typeof RpcCallError>).lastKind).toBe('transient');
  });
});
```

- [ ] **Step 2: Run tests — confirm green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-pool.test.ts -t "RpcPool.call — failover order"`
Expected: 4 tests pass. If any fail, the Task 5 implementation needs adjustment — revisit the provider loop and breaker integration until green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/solana/__tests__/rpc-pool.test.ts
git commit -m "test(solana): cover multi-provider failover and attempt budget

Verifies primary→secondary→fallback order, breaker-open skip, the
6-attempt cap (3 providers × 2 retries), and RpcCallError carrying
the last classification on exhaustion.

Spec §6 Failover policy."
```

---

## Task 8: Fixture-mode and kill-switch bypass

**Why this exists:** Two escape hatches are non-negotiable:
1. **Fixture mode** (`SOLANA_RPC_MODE=fixture`) — tests must keep bypassing real RPC entirely.
2. **Kill switch** (`SOLANA_RPC_POOL_DISABLED=true`) — if the pool itself misbehaves in prod, flipping one env variable reverts to the legacy single-`Connection` path without a redeploy. This satisfies the user brief's "revertable via env or single-commit revert" requirement.

**Files:**
- Modify: `src/lib/solana/rpc-live.ts`
- Create: `src/lib/solana/__tests__/rpc-live.test.ts`

- [ ] **Step 1: Write failing tests for the bypass and pool paths**

Create `src/lib/solana/__tests__/rpc-live.test.ts`:

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('rpc-live pool wiring', () => {
  const originalMode = process.env.SOLANA_RPC_MODE;
  const originalDisabled = process.env.SOLANA_RPC_POOL_DISABLED;
  const originalUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, val: string | undefined) => {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    };
    restore('SOLANA_RPC_MODE', originalMode);
    restore('SOLANA_RPC_POOL_DISABLED', originalDisabled);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalUrl);
    vi.resetModules();
  });

  it('getConnection() returns a Connection object — API preserved', async () => {
    delete process.env.SOLANA_RPC_MODE;
    delete process.env.SOLANA_RPC_POOL_DISABLED;
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://example.test';
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
});
```

- [ ] **Step 2: Run — confirm failure**

Run: `npx vitest run src/lib/solana/__tests__/rpc-live.test.ts`
Expected: FAIL on `__getPool` import (not yet exported).

- [ ] **Step 3: Rewire `rpc-live.ts` to use the pool with bypass**

Modify `src/lib/solana/rpc-live.ts`. Replace the module body with the version below. **Preserve all public exports and their signatures** — `getConnection`, `getOrgTokenMint`, `ORG_TOKEN_MINT`, `getTokenBalance`, `isOrgHolder`, `getAllTokenHolders`, `LiveSolanaRpc`. Cache behavior unchanged.

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaRpc, TokenHolder } from './rpc';
import { parseProvidersFromEnv, type RpcProvider } from './providers';
import { RpcPool } from './rpc-pool';

let cachedConnection: { rpcUrl: string; connection: Connection } | null = null;
let cachedOrgMint: { mintAddress: string; mint: PublicKey } | null = null;
let cachedPool: RpcPool | null = null;
// cachedProviders is set once per module lifetime. Cleared only on module
// reload (vi.resetModules() in tests; process restart in prod). Mutating
// NEXT_PUBLIC_SOLANA_RPC_URL at runtime without a module reload has no effect.
let cachedProviders: ReadonlyArray<RpcProvider> | null = null;

const TOKEN_BALANCE_CACHE_TTL_MS = 15 * 1000;
const TOKEN_HOLDERS_CACHE_TTL_MS = 5 * 60 * 1000;
const HEAVY_OP_TIMEOUT_MS = 10_000;

const tokenBalanceCache = new Map<string, { balance: number; timestamp: number }>();
const tokenHoldersCache = new Map<
  string,
  { holders: Array<{ address: string; balance: number }>; timestamp: number }
>();

function poolDisabled(): boolean {
  return process.env.SOLANA_RPC_POOL_DISABLED === 'true';
}

function getProviders(): ReadonlyArray<RpcProvider> {
  if (cachedProviders) return cachedProviders;
  cachedProviders = parseProvidersFromEnv();
  return cachedProviders;
}

/** @internal — exported for tests only. */
export function __getPool(): RpcPool | null {
  if (poolDisabled()) return null;
  if (cachedPool) return cachedPool;
  cachedPool = new RpcPool(getProviders());
  return cachedPool;
}

export function getConnection(): Connection {
  // Legacy callers still depend on a direct Connection object. In PR 1 we
  // return the primary provider's connection, which is identical to the
  // current behavior. PR 4 migrates these callers to proxy routes.
  const providers = getProviders();
  const primary = providers[0];
  if (!primary) {
    throw new Error('No RPC providers configured');
  }
  if (cachedConnection?.rpcUrl === primary.connection.rpcEndpoint) {
    return cachedConnection.connection;
  }
  cachedConnection = {
    rpcUrl: primary.connection.rpcEndpoint,
    connection: primary.connection,
  };
  return primary.connection;
}

export function getOrgTokenMint(): PublicKey {
  const mintAddress =
    process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || 'DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk';
  if (cachedOrgMint?.mintAddress === mintAddress) return cachedOrgMint.mint;
  const mint = new PublicKey(mintAddress);
  cachedOrgMint = { mintAddress, mint };
  return mint;
}

export const ORG_TOKEN_MINT = getOrgTokenMint();

async function runRead<T>(
  label: string,
  operation: (connection: Connection) => Promise<T>,
  timeoutMs?: number
): Promise<T> {
  const pool = __getPool();
  if (pool) {
    return pool.call(operation, { label, timeoutMs });
  }
  // Kill-switch path: legacy direct-Connection, no retry, no breaker.
  return operation(getConnection());
}

export async function getTokenBalance(
  walletAddress: string,
  mintAddress: PublicKey = ORG_TOKEN_MINT,
  options?: { skipCache?: boolean }
): Promise<number> {
  const cacheKey = `${walletAddress}:${mintAddress.toBase58()}`;
  const now = Date.now();
  const cachedBalance = tokenBalanceCache.get(cacheKey);
  if (
    !options?.skipCache &&
    cachedBalance &&
    now - cachedBalance.timestamp < TOKEN_BALANCE_CACHE_TTL_MS
  ) {
    return cachedBalance.balance;
  }

  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenAccounts = await runRead('getTokenBalance', (connection) =>
      connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    const tokenAccount = tokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === mintAddress.toBase58()
    );

    if (!tokenAccount) {
      tokenBalanceCache.set(cacheKey, { balance: 0, timestamp: now });
      return 0;
    }

    const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    const normalizedBalance = balance || 0;
    tokenBalanceCache.set(cacheKey, { balance: normalizedBalance, timestamp: now });

    if (tokenBalanceCache.size > 1000) {
      const cutoff = now - TOKEN_BALANCE_CACHE_TTL_MS;
      for (const [key, value] of tokenBalanceCache.entries()) {
        if (value.timestamp < cutoff) tokenBalanceCache.delete(key);
      }
    }

    return normalizedBalance;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    if (cachedBalance) return cachedBalance.balance;
    return 0;
  }
}

export async function isOrgHolder(
  walletAddress: string,
  options?: { skipCache?: boolean }
): Promise<boolean> {
  const balance = await getTokenBalance(walletAddress, ORG_TOKEN_MINT, options);
  return balance > 0;
}

export async function getAllTokenHolders(
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<Array<{ address: string; balance: number }>> {
  const mintKey = mintAddress.toBase58();
  const now = Date.now();
  const cachedHolders = tokenHoldersCache.get(mintKey);
  if (cachedHolders && now - cachedHolders.timestamp < TOKEN_HOLDERS_CACHE_TTL_MS) {
    return cachedHolders.holders;
  }

  try {
    const accounts = await runRead(
      'getAllTokenHolders',
      (connection) =>
        connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mintAddress.toBase58() } },
          ],
        }),
      HEAVY_OP_TIMEOUT_MS
    );

    const holderBalances = new Map<string, number>();
    for (const account of accounts) {
      try {
        const data = account.account.data;
        if ('parsed' in data) {
          const tokenData = data.parsed.info;
          const balance = tokenData.tokenAmount?.uiAmount;
          if (balance && balance > 0) {
            const owner = tokenData.owner as string;
            const previous = holderBalances.get(owner) || 0;
            holderBalances.set(owner, previous + balance);
          }
        }
      } catch (err) {
        console.error('Error parsing account:', err);
      }
    }

    const holders = Array.from(holderBalances.entries()).map(([address, balance]) => ({
      address,
      balance,
    }));
    tokenHoldersCache.set(mintKey, { holders, timestamp: now });
    return holders;
  } catch (error) {
    console.error('Error fetching all token holders:', error);
    if (cachedHolders) return cachedHolders.holders;
    return [];
  }
}

export class LiveSolanaRpc implements SolanaRpc {
  async getTokenBalance(walletAddress: string, mintAddress?: PublicKey): Promise<number> {
    return getTokenBalance(walletAddress, mintAddress);
  }
  async getAllTokenHolders(mintAddress?: PublicKey): Promise<TokenHolder[]> {
    return getAllTokenHolders(mintAddress);
  }
  async isOrgHolder(walletAddress: string): Promise<boolean> {
    return isOrgHolder(walletAddress);
  }
}
```

- [ ] **Step 4: Run — confirm green**

Run: `npx vitest run src/lib/solana/__tests__/rpc-live.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/rpc-live.ts src/lib/solana/__tests__/rpc-live.test.ts
git commit -m "feat(solana): route rpc-live reads through RpcPool with bypass

- getTokenBalance, isOrgHolder, getAllTokenHolders funnel through
  pool.call with appropriate timeout (heavy ops get 10s).
- getConnection() still returns a Connection — PR 1 preserves the
  legacy export surface for existing callers in treasury, donations,
  and holder-analysis; PR 4 migrates those.
- SOLANA_RPC_POOL_DISABLED=true bypasses the pool (kill switch).
- SOLANA_RPC_MODE=fixture continues to bypass at the factory level.

Spec §6, §12.1."
```

---

## Task 9: Regression coverage for the public API

**Why this exists:** Public consumers (`treasury/route.ts`, `donations/verification.ts`, `holder-analysis.ts`, `profile-wallet-tab.tsx`, `wallet-provider.tsx`) only depend on the contract exposed by `src/lib/solana/index.ts`. We pin that contract with a regression test so any future refactor breaks this test before prod notices.

**Files:**
- Modify: `src/lib/solana/__tests__/rpc-live.test.ts`

- [ ] **Step 1: Write failing public-API regression tests**

Append to `src/lib/solana/__tests__/rpc-live.test.ts`:

```typescript
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
      'isOrgHolder',
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
```

- [ ] **Step 2: Run — should pass**

Run: `npx vitest run src/lib/solana/__tests__/rpc-live.test.ts -t "public export surface"`
Expected: 2 tests pass.

- [ ] **Step 3: Run full solana suite**

Run: `npx vitest run src/lib/solana/__tests__/`
Expected: all tests pass (providers, rpc-pool, rpc-live, existing rpc-factory).

- [ ] **Step 4: Commit**

```bash
git add src/lib/solana/__tests__/rpc-live.test.ts
git commit -m "test(solana): pin public export surface for rpc-live callers

Regression guard — treasury, donations, holder-analysis, and
wallet-provider consume index.ts re-exports. A future rename breaks
this test before prod notices."
```

---

## Task 10: Full validation — lint, build, type-check, all tests

**Why this exists:** The user brief mandates the validation matrix from CLAUDE.md for cross-cutting changes. Pool machinery is cross-cutting even though its surface is narrow.

**Files:** none modified — this task only runs checks.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no new warnings or errors in `src/lib/solana/`.

- [ ] **Step 2: Type-check via build**

Run: `npm run build`
Expected: success. If a type error surfaces in an unrelated file, investigate — do not suppress.

- [ ] **Step 3: Run scoped vitest**

Run: `npx vitest run src/lib/solana/__tests__/`
Expected: all tests in `providers.test.ts`, `rpc-pool.test.ts`, `rpc-live.test.ts`, `rpc-factory.test.ts` pass.

- [ ] **Step 4: Run existing security tests to confirm no regression**

Run: `npx vitest run tests/security/`
Expected: pre-existing pass/fail state matches `main`. (No new security tests in PR 1; PR 3 adds them.)

- [ ] **Step 5: Smoke-test in fixture mode (no network)**

Run: `SOLANA_RPC_MODE=fixture npx vitest run src/lib/solana/__tests__/rpc-factory.test.ts`
Expected: pass — proves fixture path untouched by pool introduction.

- [ ] **Step 6: Smoke-test kill switch path (unit)**

Run: `SOLANA_RPC_POOL_DISABLED=true npx vitest run src/lib/solana/__tests__/rpc-live.test.ts`
Expected: pass — confirms `__getPool()` returns null and legacy path is active.

---

## Task 11: Open the PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin phase/rpc-pool-foundation
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat(solana): RpcPool foundation (PR 1 of 5)" --body "$(cat <<'EOF'
## Summary
- New \`src/lib/solana/providers.ts\` parses env into an \`RpcProvider[]\` (single primary in PR 1 from \`NEXT_PUBLIC_SOLANA_RPC_URL\`, fallback to \`clusterApiUrl('mainnet-beta')\`).
- New \`src/lib/solana/rpc-pool.ts\` implements \`RpcPool\` with per-attempt timeout, transient/permanent/empty-ok error classification, per-provider circuit breaker (>50% failures in last 20+ of 60s window → open; 30s half-open probe), rolling last-100 health stats, and a 6-attempt / 3×timeout budget cap.
- \`src/lib/solana/rpc-live.ts\` now routes \`getTokenBalance\`, \`isOrgHolder\`, and \`getAllTokenHolders\` through \`pool.call\`. Public exports and signatures unchanged.
- Kill switch: \`SOLANA_RPC_POOL_DISABLED=true\` bypasses the pool and restores the legacy direct-\`Connection\` path — revert is an env flip, not a redeploy.
- Fixture mode (\`SOLANA_RPC_MODE=fixture\`) continues to bypass the pool entirely.

## Scope (spec §12.1)
- ✅ PR 1 — pool foundation.
- ❌ PR 2 env vars (\`SOLANA_RPC_PRIMARY_URL\` etc.) — separate PR.
- ❌ PR 3 consensus verifier — separate PR.
- ❌ PR 4 browser proxy routes — separate PR.
- ❌ PR 5 lockdown — separate PR.

## Test plan
- [x] \`npm run lint\`
- [x] \`npm run build\`
- [x] \`npx vitest run src/lib/solana/__tests__/\` — 4 files, all green.
- [x] Fixture-mode smoke test: \`SOLANA_RPC_MODE=fixture\` → factory returns \`FixtureSolanaRpc\`.
- [x] Kill-switch smoke test: \`SOLANA_RPC_POOL_DISABLED=true\` → \`__getPool()\` returns null, legacy path active.
- [x] Public export surface regression locked in \`rpc-live.test.ts\`.

## Rollback
- **Env:** set \`SOLANA_RPC_POOL_DISABLED=true\` → reverts to legacy path within one deploy cycle of env propagation (no redeploy).
- **Revert:** single \`git revert\` undoes all changes cleanly — no DB, no env vars added.

## Follow-up
PR 2 adds \`SOLANA_RPC_PRIMARY_URL\` / \`SECONDARY\` / \`FALLBACK\` env parsing. \`parseProvidersFromEnv\` already returns \`RpcProvider[]\` — no further refactor needed in this file's consumers.

Spec: \`docs/superpowers/specs/2026-04-22-rpc-resilience-design.md\`.
EOF
)"
```

- [ ] **Step 3: Watch checks**

Run: `gh pr checks --watch`
Expected: all checks green.

- [ ] **Step 4: Hand off to user for review and merge**

Do not self-merge. Wait for explicit approval.

---

## Self-review notes (pre-approval)

- **Spec coverage:** Every §6 requirement (config shape, public API, failover order, retry count, error classification, breaker thresholds, half-open logic, health tracking) has a dedicated task and test. §5 is scoped to `NEXT_PUBLIC_SOLANA_RPC_URL` read-only; no env additions. §11 "Unit" coverage is delivered; "Integration" / "Security" sit in later PRs.
- **Type discipline:** No `any`. Public generic `call<T>` preserves caller types. Errors typed as `unknown` and classified through a pure function.
- **Revertability:** Two escape hatches — env kill switch (`SOLANA_RPC_POOL_DISABLED=true`) and single-commit revert. No schema changes, no new env vars, no cross-module contract churn.
- **Fixture mode preserved:** `getSolanaRpc()` factory in `index.ts` untouched; it already short-circuits on `SOLANA_RPC_MODE=fixture` before `LiveSolanaRpc` even constructs.
- **Risks:** Behavioural change — calls that used to fail fast on a single bad RPC response now retry once (up to 2× the old latency on transient errors). This is the intended reliability improvement; call out in PR description so reviewers aren't surprised by latency distribution shifts in staging.
