# Solana RPC Resilience — PR 4: Browser Proxy Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the canonical `/api/solana/*` server routes so browser code never reaches a Solana RPC directly. All server-backed Solana reads go through these proxies; paid provider keys stop leaking into the browser bundle. Wallet adapter keeps its own browser-reachable RPC URL (separate concern, handled in PR 5).

**Architecture:** Four narrow GET routes (`token-balance`, `is-holder`, `holder-count`, `tx-status`). Each validates input with Zod, enforces auth where spec requires it, calls through to the existing `RpcPool` or `ConsensusVerifier` (both landed in PR 1 + PR 3), surfaces `{ stale: true }` when returning from cache after pool exhaustion, and respects the project's rate-limit registry. Migrates `profile-wallet-tab.tsx` to the new `/api/solana/token-balance` route; wallet adapter stays on `NEXT_PUBLIC_SOLANA_RPC_URL`.

**Tech Stack:** Next.js App Router (`src/app/api/solana/*`), TypeScript strict, Zod, existing `@/lib/rate-limit` helpers, `RpcPool` (PR 1), `ConsensusVerifier` (PR 3). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §8 (full — proxy routes), §9 (caching + stale-ok), §10 (observability), §11 (integration + security tests), §12 step 4 (migration order).

---

## Scope — in

- Create: `src/app/api/solana/token-balance/route.ts` — `pool.call` wrapping `getTokenBalance`, GET with Zod-validated `wallet` query param. 15s cache hit (reuses existing `tokenBalanceCache`). Surfaces `{ stale: true }` when pool exhausts and cached balance served.
- Create: `src/app/api/solana/is-holder/route.ts` — `consensus.verify` wrapping `isOrgHolderUsingConnection`. Returns 503 on `ConsensusError` (fail-closed — this is a critical read).
- Create: `src/app/api/solana/holder-count/route.ts` — `pool.call` wrapping `getAllTokenHolders`, 5-min cache hit. Optional `?top=N` query param returns top-N by balance.
- Create: `src/app/api/solana/tx-status/route.ts` — default `pool.call` on `getParsedTransaction`. When `?consensus=true` query is set (donation verification path), switches to `consensus.verify` with `compareTxConfirmation`.
- Create: `src/features/solana-proxy/schemas.ts` — shared Zod schemas (wallet pubkey regex, tx signature base58 check, top-N bounded integer).
- Modify: `src/components/profile/profile-wallet-tab.tsx` — swap `/api/organic-id/balance` call for `/api/solana/token-balance?wallet=...`.
- Modify: `src/lib/rate-limit.ts` — add a new bucket `solanaProxy` (read-tier limits — 100 req/min per IP, 300/min per authed user).
- Modify: `src/middleware.ts` — add `/api/solana/*` routes to `getApiRateLimitPolicy`'s map.
- Create: `src/app/api/solana/__tests__/token-balance.test.ts`, `is-holder.test.ts`, `holder-count.test.ts`, `tx-status.test.ts` — unit tests per route.
- Create: `tests/security/solana-rpc-resilience.test.ts` — end-to-end security coverage per spec §11:
  - Primary + secondary both unavailable → proxy returns stale cache with flag.
  - Lying provider returns wrong holder status → `/is-holder` returns 503, no DB mutation.
  - Lying provider returns wrong tx confirmation → `/tx-status?consensus=true` returns `{ verified: false }`.

## Scope — out (deferred)

- Deprecating `/api/organic-id/balance` — keep it for one release cycle so any external callers (scripts, docs) don't break. PR 5 removes it.
- Enabling `SOLANA_RPC_CONSENSUS_ENABLED=true` in prod — still default-off. PR 5 flips it after a preview observation window.
- Rotating / domain-restricting `NEXT_PUBLIC_SOLANA_RPC_URL` — PR 5.
- Admin UI surfacing `RpcPool.getHealth()` (spec §14 follow-up).
- MSW / nock integration-test harness — can use the existing `vi.mock('@/lib/solana', ...)` pattern from PR 3's route tests; adding MSW is infrastructure work beyond this PR.

## Hard constraints

1. **Revertable by env.** Setting `SOLANA_RPC_POOL_DISABLED=true` reverts every proxy route to the legacy direct-`Connection` path. Setting `SOLANA_RPC_CONSENSUS_ENABLED=false` (default) makes `/is-holder` and `/tx-status?consensus=true` behave exactly like their non-consensus counterparts. Both kill switches were landed in PR 1 and PR 3; this PR must not regress them.
2. **Zod validation on every query param.** Wallet addresses and tx signatures are user input — must be shape-validated before hitting the pool. Bad input returns 400, not 500.
3. **Auth posture per spec §8.** `/token-balance`, `/holder-count`, `/tx-status` are publicly cacheable reads (no auth required, rate-limited per IP). `/is-holder` requires an authenticated session because it exposes an endpoint that reveals whether arbitrary wallets pass the Organic ID gate — denying anon access prevents enumeration attacks. Check current session via `createClient().auth.getUser()` at the route top.
4. **TypeScript strict, no `any`.** Use the `ApiResponse<T>` envelope pattern from `src/lib/api-response.ts` (if absent, use `{ data, error }` inline consistently across all four routes).
5. **Response Cache-Control headers.** Match spec §9: `Cache-Control: public, s-maxage=15, stale-while-revalidate=60` on `/token-balance`, `s-maxage=300` on `/holder-count`. `/is-holder` and `/tx-status` should be `no-store` because their correctness varies per-wallet and per-tx.
6. **Rate limits.** Every route returns 429 on limit. New `solanaProxy` bucket. `/is-holder` uses scope `user` (tighter 20/min); others use scope `ip` with the read tier.
7. **No new `console.log`.** Use `logger` for 500 paths. 4xx responses carry user-safe error strings only.

## Execution order

Sequential. Task 1 builds shared Zod schemas + rate-limit plumbing (everything else depends on it). Tasks 2-5 add each proxy route one at a time (one commit per route, revertable in isolation). Task 6 migrates `profile-wallet-tab.tsx`. Task 7 writes the consolidated security test. Task 8 verifies + opens PR.

## Pre-flight (once, before Task 1)

```bash
git switch main && git pull --ff-only
# PR 3 should be merged before starting PR 4; if not, rebase on phase/rpc-consensus-verifier.
git switch -c phase/rpc-proxy-routes
npx vitest run src/lib/solana/__tests__/ src/app/api/**/__tests__/ tests/security/
```

Expected: PR 1 + PR 2 + PR 3 tests green.

Confirm the rate-limit registry is where the plan expects it:

```bash
grep -n "export const RATE_LIMITS" src/lib/rate-limit.ts
grep -n "getApiRateLimitPolicy" src/middleware.ts
```

Expected: `RATE_LIMITS` object at `src/lib/rate-limit.ts:380`, `getApiRateLimitPolicy` referenced in `src/middleware.ts`.

Confirm `getSolanaConsensus`, `isOrgHolderUsingConnection`, and `compareTxConfirmation` are exported from `@/lib/solana`:

```bash
grep -n "^export" src/lib/solana/index.ts
```

Expected: all three named exports.

---

## Task 1: Shared Zod schemas + rate-limit bucket

**Why this exists:** Every proxy route validates wallet / tx-signature inputs. Co-locate the schemas so all routes use the same regex — drift between routes is a security bug (e.g., one accepts a too-long string that bypasses a hidden assumption).

**Files:**
- Create: `src/features/solana-proxy/schemas.ts`
- Modify: `src/lib/rate-limit.ts` — add `solanaProxy` bucket
- Create: `src/features/solana-proxy/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

`src/features/solana-proxy/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { walletQuerySchema, txSignatureQuerySchema, topNSchema } from '../schemas';

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

  it('rejects string longer than 44 chars (max base58 pubkey length)', () => {
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
```

Vitest needs to pick this up — `src/features/solana-proxy/__tests__/` is NOT in the current `vitest.config.ts` include list. Either move the test to `tests/security/schemas-solana-proxy.test.ts`, OR add `'src/features/solana-proxy/__tests__/**/*.test.ts'` to include. Recommendation: move to `tests/` to avoid growing the include list (the PR 3 donations test followed this pattern in commit `277e19a`).

- [ ] **Step 2: Run test to confirm FAIL**

Run: `npx vitest run tests/security/schemas-solana-proxy.test.ts`
Expected: module not found.

- [ ] **Step 3: Write `src/features/solana-proxy/schemas.ts`**

```typescript
import { z } from 'zod';

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const walletQuerySchema = z.object({
  wallet: z
    .string()
    .trim()
    .min(32, { message: 'wallet must be a base58 pubkey' })
    .max(44, { message: 'wallet must be a base58 pubkey' })
    .regex(BASE58_REGEX, { message: 'wallet must be base58' }),
});

export const txSignatureQuerySchema = z.object({
  signature: z
    .string()
    .trim()
    .min(64, { message: 'signature must be a base58 tx signature' })
    .max(88, { message: 'signature must be a base58 tx signature' })
    .regex(BASE58_REGEX, { message: 'signature must be base58' }),
});

export const topNSchema = z
  .string()
  .regex(/^\d+$/, { message: 'top must be a positive integer' })
  .transform((v) => Number.parseInt(v, 10))
  .refine((n) => n >= 1 && n <= 100, { message: 'top must be 1..100' });

export type WalletQuery = z.infer<typeof walletQuerySchema>;
export type TxSignatureQuery = z.infer<typeof txSignatureQuerySchema>;
```

- [ ] **Step 4: Add rate-limit bucket**

Modify `src/lib/rate-limit.ts` (around line 390, after `sensitive`):

```typescript
  /** Solana proxy reads: 100/min per IP (anon), 300/min per authed user */
  solanaProxy: { limit: 100, windowMs: 60_000 },
  solanaProxyUser: { limit: 300, windowMs: 60_000 },
```

- [ ] **Step 5: Add routes to the policy map in `src/middleware.ts`**

Find the registry block (search for `bucket:` in `src/middleware.ts`) and add entries for each of the four upcoming routes. Example shape (adjust to match existing style):

```typescript
{ path: '/api/solana/token-balance', method: 'GET', bucket: 'solanaProxy', scope: 'ip', config: RATE_LIMITS.solanaProxy },
{ path: '/api/solana/is-holder',     method: 'GET', bucket: 'solanaProxyUser', scope: 'user', config: RATE_LIMITS.solanaProxyUser },
{ path: '/api/solana/holder-count',  method: 'GET', bucket: 'solanaProxy', scope: 'ip', config: RATE_LIMITS.solanaProxy },
{ path: '/api/solana/tx-status',     method: 'GET', bucket: 'solanaProxy', scope: 'ip', config: RATE_LIMITS.solanaProxy },
```

Read the current policy registry shape first — it may differ slightly from the sketch above.

- [ ] **Step 6: Run tests, confirm green**

Run: `npx vitest run tests/security/schemas-solana-proxy.test.ts`
Expected: PASS, 9 tests.

Run: `npx vitest run` (full suite) — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/solana-proxy/schemas.ts \
        src/lib/rate-limit.ts \
        src/middleware.ts \
        tests/security/schemas-solana-proxy.test.ts
git commit -m "feat(solana-proxy): add shared Zod schemas + rate-limit bucket"
```

---

## Task 2: `/api/solana/token-balance` route

**Why this exists:** The most-called proxy. Browser balance checks go here. Uses the existing 15s cache; surfaces `stale` when pool exhausts.

**Files:**
- Create: `src/app/api/solana/token-balance/route.ts`
- Create: `src/app/api/solana/token-balance/__tests__/route.test.ts`

- [ ] **Step 1: Write failing route test**

`src/app/api/solana/token-balance/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/solana', () => ({
  getTokenBalance: vi.fn(),
}));

import { getTokenBalance } from '@/lib/solana';
import { GET } from '../route';

function buildRequest(query: Record<string, string>): NextRequest {
  const url = new URL('http://test.local/api/solana/token-balance');
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.mocked(getTokenBalance).mockReset();
});

describe('GET /api/solana/token-balance', () => {
  it('returns 400 on missing wallet', async () => {
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed wallet', async () => {
    const res = await GET(buildRequest({ wallet: 'not-base58!' }));
    expect(res.status).toBe(400);
  });

  it('returns the balance on success', async () => {
    vi.mocked(getTokenBalance).mockResolvedValueOnce(42);
    const res = await GET(buildRequest({ wallet: '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.balance).toBe(42);
    expect(body.data.stale).toBe(false);
  });

  it('returns stale cached balance when pool exhausts', async () => {
    // First call warms the cache.
    vi.mocked(getTokenBalance).mockResolvedValueOnce(100);
    await GET(buildRequest({ wallet: '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6' }));

    // Second call: pool exhausted.
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({ wallet: '6Qm8JYsDxh7Fq2k4mD9vuJbRNw1Z5c9VbTzfxBKz1kD6' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.balance).toBe(100);
    expect(body.data.stale).toBe(true);
  });

  it('returns 500 with no data on pool exhaustion + cold cache', async () => {
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('exhausted'));
    const res = await GET(buildRequest({ wallet: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test, confirm FAIL**

Run: `npx vitest run src/app/api/solana/token-balance/__tests__/route.test.ts`
Expected: file not found.

- [ ] **Step 3: Implement `src/app/api/solana/token-balance/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance } from '@/lib/solana';
import { walletQuerySchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Module-level stale cache for pool-exhaustion fallback.
const staleCache = new Map<string, { balance: number; ts: number }>();
const STALE_CAP_MS = 5 * 60_000;

export async function GET(request: NextRequest) {
  const parsed = walletQuerySchema.safeParse({
    wallet: request.nextUrl.searchParams.get('wallet') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid wallet parameter' },
      { status: 400 }
    );
  }

  const { wallet } = parsed.data;

  try {
    const balance = await getTokenBalance(wallet);
    staleCache.set(wallet, { balance, ts: Date.now() });
    return NextResponse.json(
      { data: { balance, stale: false }, error: null },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } }
    );
  } catch (error) {
    const cached = staleCache.get(wallet);
    if (cached && Date.now() - cached.ts < STALE_CAP_MS) {
      logger.warn('token-balance proxy: pool exhausted, serving stale', { wallet });
      return NextResponse.json(
        { data: { balance: cached.balance, stale: true }, error: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    logger.error('token-balance proxy: pool exhausted with no cache', { wallet, error });
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run tests, green**

Run: `npx vitest run src/app/api/solana/token-balance/__tests__/route.test.ts`
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/solana/token-balance/route.ts \
        src/app/api/solana/token-balance/__tests__/route.test.ts
git commit -m "feat(solana-proxy): /api/solana/token-balance with stale-cache fallback"
```

---

## Task 3: `/api/solana/is-holder` route (consensus, authed)

**Why this exists:** The only critical-read proxy route. Requires auth to prevent holder-status enumeration. Wraps `isOrgHolderUsingConnection` in consensus when available.

**Files:**
- Create: `src/app/api/solana/is-holder/route.ts`
- Create: `src/app/api/solana/is-holder/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

Test the three branches:
1. Unauthenticated → 401.
2. Valid wallet, consensus agree → `{ isHolder: true }`.
3. Valid wallet, `ConsensusError` → 503.
4. Malformed wallet → 400.

Use the partial-mock-plus-importActual pattern from `tests/security/solana-consensus.test.ts`:

```typescript
vi.mock('@/lib/solana', async () => {
  const actual = await vi.importActual<typeof import('@/lib/solana')>('@/lib/solana');
  return {
    ...actual,
    getSolanaConsensus: vi.fn(),
    isOrgHolder: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));
```

Fill in the full test file following the same structure as `src/app/api/treasury/__tests__/consensus-balance.test.ts`.

- [ ] **Step 2: Run, confirm FAIL** (route not implemented).

- [ ] **Step 3: Implement `src/app/api/solana/is-holder/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  getSolanaConsensus,
  isOrgHolder,
  isOrgHolderUsingConnection,
  ConsensusError,
  compareBoolean,
} from '@/lib/solana';
import { walletQuerySchema } from '@/features/solana-proxy/schemas';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Require auth to prevent holder-enumeration.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const parsed = walletQuerySchema.safeParse({
    wallet: request.nextUrl.searchParams.get('wallet') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid wallet parameter' },
      { status: 400 }
    );
  }

  const { wallet } = parsed.data;
  const consensus = getSolanaConsensus();

  try {
    let isHolder: boolean;
    if (consensus) {
      isHolder = await consensus.verify(
        (connection) => isOrgHolderUsingConnection(wallet, connection),
        { label: 'isOrgHolder.proxy', compare: compareBoolean }
      );
    } else {
      isHolder = await isOrgHolder(wallet, { skipCache: true });
    }
    return NextResponse.json(
      { data: { isHolder }, error: null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error('is-holder proxy: consensus disagreement', {
        label: err.label,
        wallet,
        userId: user.id,
      });
      return NextResponse.json(
        { data: null, error: 'On-chain verification is temporarily inconsistent. Please retry shortly.' },
        { status: 503 }
      );
    }
    logger.error('is-holder proxy: unexpected error', { wallet, err });
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run, green.**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(solana-proxy): /api/solana/is-holder with consensus fail-closed"
```

---

## Task 4: `/api/solana/holder-count` route

**Why this exists:** Browser analytics widgets want a total holder count without every client hammering a paid RPC.

**Files:**
- Create: `src/app/api/solana/holder-count/route.ts`
- Create: `src/app/api/solana/holder-count/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

Branches:
1. No auth required (it's a public stat).
2. `?top=10` returns a `top` array in addition to `count`.
3. `?top=0` → 400.
4. `?top=101` → 400.
5. Pool exhausted + no cache → 500.
6. Pool exhausted + cache → 200 with `stale: true`.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllTokenHolders } from '@/lib/solana';
import { topNSchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HolderCountCache {
  count: number;
  top: Array<{ address: string; balance: number }>;
  ts: number;
}
let holderCountCache: HolderCountCache | null = null;
const STALE_CAP_MS = 10 * 60_000;

export async function GET(request: NextRequest) {
  const rawTop = request.nextUrl.searchParams.get('top');
  let topN: number | undefined;
  if (rawTop !== null) {
    const parsed = topNSchema.safeParse(rawTop);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid top parameter' },
        { status: 400 }
      );
    }
    topN = parsed.data;
  }

  try {
    const holders = await getAllTokenHolders();
    const sorted = [...holders].sort((a, b) => b.balance - a.balance);
    const count = holders.length;
    const top = topN ? sorted.slice(0, topN) : [];
    holderCountCache = { count, top: sorted.slice(0, 100), ts: Date.now() };
    return NextResponse.json(
      {
        data: { count, top: topN ? top : undefined, stale: false },
        error: null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (error) {
    if (holderCountCache && Date.now() - holderCountCache.ts < STALE_CAP_MS) {
      const top = topN ? holderCountCache.top.slice(0, topN) : undefined;
      return NextResponse.json(
        {
          data: { count: holderCountCache.count, top, stale: true },
          error: null,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    logger.error('holder-count proxy: exhausted + cold cache', { error });
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run, green.**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(solana-proxy): /api/solana/holder-count with optional top-N"
```

---

## Task 5: `/api/solana/tx-status` route

**Why this exists:** Donation flow polls tx status from the browser. Spec requires consensus when `?consensus=true` is set (the donation path); generic use (e.g., UI display of a user's tx) uses `pool.call`.

**Files:**
- Create: `src/app/api/solana/tx-status/route.ts`
- Create: `src/app/api/solana/tx-status/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

Branches:
1. Missing signature → 400.
2. Malformed signature → 400.
3. `?consensus=true` + ConsensusError → 503.
4. `?consensus=true` + agree → returns `{ slot, status, meta }`.
5. No `consensus` query → pool.call path, returns tx even on single-provider.
6. Not found (tx returns null) → 200 with `{ status: 'not_found' }`.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { GetVersionedTransactionConfig, ParsedTransactionWithMeta } from '@solana/web3.js';
import {
  getConnection,
  getSolanaConsensus,
  ConsensusError,
  compareTxConfirmation,
} from '@/lib/solana';
import { txSignatureQuerySchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const options: GetVersionedTransactionConfig = {
  maxSupportedTransactionVersion: 0,
  commitment: 'finalized',
};

function summarizeTx(
  tx: ParsedTransactionWithMeta | null
): { slot: number; status: string } | null {
  if (!tx) return null;
  return { slot: tx.slot, status: 'finalized' };
}

export async function GET(request: NextRequest) {
  const parsed = txSignatureQuerySchema.safeParse({
    signature: request.nextUrl.searchParams.get('signature') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid signature parameter' },
      { status: 400 }
    );
  }

  const { signature } = parsed.data;
  const wantConsensus = request.nextUrl.searchParams.get('consensus') === 'true';
  const consensus = wantConsensus ? getSolanaConsensus() : null;

  try {
    let tx: ParsedTransactionWithMeta | null;
    if (consensus) {
      tx = await consensus.verify<ParsedTransactionWithMeta | null>(
        (connection) => connection.getParsedTransaction(signature, options),
        {
          label: 'tx-status.proxy',
          compare: (a, b) => compareTxConfirmation(summarizeTx(a), summarizeTx(b)),
        }
      );
    } else {
      tx = await getConnection().getParsedTransaction(signature, options);
    }

    if (!tx) {
      return NextResponse.json(
        { data: { status: 'not_found' }, error: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        data: {
          slot: tx.slot,
          status: tx.meta?.err ? 'failed' : 'finalized',
          block_time: tx.blockTime ?? null,
        },
        error: null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error('tx-status proxy: consensus disagreement', { label: err.label, signature });
      return NextResponse.json(
        { data: null, error: 'Transaction confirmation is inconsistent across providers' },
        { status: 503 }
      );
    }
    logger.error('tx-status proxy: unexpected error', { signature, err });
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run, green.**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(solana-proxy): /api/solana/tx-status with optional consensus"
```

---

## Task 6: Migrate `profile-wallet-tab.tsx`

**Why this exists:** The only browser component doing balance fetches. Swap it to the new canonical proxy so `/api/organic-id/balance` can retire in PR 5.

**Files:**
- Modify: `src/components/profile/profile-wallet-tab.tsx` (line 54 — the `fetch('/api/organic-id/balance', ...)` call)

- [ ] **Step 1: Change the fetch to use the new route**

Current (`profile-wallet-tab.tsx:54-59`):
```typescript
const response = await fetch('/api/organic-id/balance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress }),
  signal: controller.signal,
});
```

Replace with:
```typescript
const qs = new URLSearchParams({ wallet: walletAddress });
const response = await fetch(`/api/solana/token-balance?${qs.toString()}`, {
  method: 'GET',
  signal: controller.signal,
});
```

And update the response-shape handling. Current:
```typescript
const data = await response.json();
const balance = data.balance || 0;
```

Replace with:
```typescript
const json = await response.json();
const balance = json.data?.balance ?? 0;
```

- [ ] **Step 2: Verify the TTL reasoning**

The client-side `BALANCE_CACHE_TTL_MS = 15_000` comment (line 12) still holds — the new route's `s-maxage=15` matches it. No change needed.

- [ ] **Step 3: Manual smoke**

1. `npm run dev`
2. Log in as `claude-test@organic-dao.dev`.
3. Navigate to `/profile`, open the Wallet tab.
4. Observe the balance renders correctly and the network panel shows `GET /api/solana/token-balance?wallet=...` returning 200 with `{ data: { balance, stale: false } }`.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(profile): migrate wallet-tab balance to /api/solana/token-balance"
```

---

## Task 7: Security tests (end-to-end)

**File:** Create `tests/security/solana-rpc-resilience.test.ts` (mentioned in spec §4 file layout — still needed from earlier PRs but never landed).

Tests per spec §11:

1. **Pool exhaustion → stale flag.** Mock `@/lib/solana`'s `getTokenBalance` to resolve first (warm cache), then reject. Hit `/api/solana/token-balance` twice and assert the second response has `stale: true`. Already covered in Task 2; restate here for auditor clarity.
2. **`/is-holder` consensus disagreement → 503 + no DB mutation.** Stub `getSolanaConsensus` to return a verifier that throws `ConsensusError`. Hit the route with a valid session. Assert 503.
3. **`/tx-status?consensus=true` + disagreement → 503.** Same pattern as Task 6's donation consensus test.
4. **Auth enforcement.** Call `/is-holder` without a session → 401. Call other routes without a session → 200 / 400 (they're public).
5. **Rate-limit.** Stub the rate-limiter in middleware and assert 429 when a route is hit 101 times in 60s. NOTE: this requires the middleware to run in a test harness, which is infrastructure work. If the project has no middleware test harness today, make this a source-grep assertion on the middleware policy registry instead ("every route in the registry for `/api/solana/*` has a `solanaProxy*` bucket").

Commit:
```bash
git commit -m "test(security): end-to-end coverage for solana proxy routes"
```

---

## Task 8: Verify, push, open PR

- [ ] `npx vitest run` — all green, no skips added.
- [ ] `npm run test` (node --test) — green.
- [ ] `npm run lint` — zero warnings.
- [ ] `npm run build` — success.
- [ ] `git push -u origin phase/rpc-proxy-routes`
- [ ] `gh pr create --base main --head phase/rpc-proxy-routes` with body:
  - **Summary:** Four canonical `/api/solana/*` GET routes + wallet-tab migration. Paid RPC keys no longer in the browser bundle (wallet adapter excepted, which is handled in PR 5).
  - **Why:** spec §8 + §12 step 4.
  - **Revert plan:** `SOLANA_RPC_POOL_DISABLED=true` falls back to legacy direct-Connection. `SOLANA_RPC_CONSENSUS_ENABLED=false` (default) disables the `/is-holder` and `/tx-status?consensus=true` consensus paths. Individual routes can be reverted commit-by-commit.
  - **Test plan:** unit per route, security file, manual smoke on `/profile` wallet tab.
  - **Follow-ups:** retire `/api/organic-id/balance` (PR 5), domain-restrict `NEXT_PUBLIC_SOLANA_RPC_URL` (PR 5), wire admin UI for `RpcPool.getHealth()` (spec §14 follow-up).
  - **Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §8.

---

## Self-review checklist (run before closing out PR 4)

1. **Spec §8 coverage:** all four routes built with their documented backend (`pool.call` vs `consensus.verify`)? ✔
2. **Cache-Control headers match spec §9:** `s-maxage=15` on token-balance, `s-maxage=300` on holder-count, `no-store` on is-holder and tx-status? ✔
3. **Rate-limit registry includes every new route?** Check `src/middleware.ts` policy block. ✔
4. **Auth:** `/is-holder` rejects anon with 401? Other routes don't require auth? ✔
5. **Zod on every query param** (wallet + signature + top-N)? ✔
6. **Kill switches preserved?** `SOLANA_RPC_POOL_DISABLED=true` reverts proxies to direct-Connection; `SOLANA_RPC_CONSENSUS_ENABLED=false` (default) makes consensus paths behave like pool.call. ✔
7. **No `any`, no `console.log`, no `@ts-expect-error` in new code?** ✔
8. **`profile-wallet-tab.tsx` migrated and manually smoked?** ✔
9. **`/api/organic-id/balance` still present but not re-wired** (PR 5 removes it)? ✔

---

## Notes carried from PR 3

- `vitest.config.ts` currently includes `src/lib/solana/__tests__/`, `src/app/api/**/__tests__/`, and `tests/security/`. New proxy route tests land under `src/app/api/solana/**/__tests__/` — already covered. New schema tests go into `tests/security/` (avoid growing the include list; see PR 3 commit `277e19a` for precedent).
- `ConsensusError`, `compareBoolean`, `compareTxConfirmation`, `isOrgHolderUsingConnection`, `getSolanaConsensus`, `getTokenBalance`, `getAllTokenHolders`, `getConnection`, `isOrgHolder` are all exported from `@/lib/solana` (see `src/lib/solana/index.ts`). No new exports needed from the solana module for PR 4.
- Handoff `HANDOFF_RPC_PR3.md` (uncommitted on main) documents known gotchas: treasury cache has no TTL guard yet; DB audit table deferred; spec §2/§7 call-site drift reconciled in-code but spec doc not patched.
