# Solana RPC Resilience — PR 2: Env-Driven Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce tier-based server-only env vars (`SOLANA_RPC_PRIMARY_URL`, `SOLANA_RPC_SECONDARY_URL`, `SOLANA_RPC_FALLBACK_URL`) to power `parseProvidersFromEnv()`, validate them with Zod, deduplicate, and keep a transitional fallback to `NEXT_PUBLIC_SOLANA_RPC_URL` so unsetting the three new vars restores pre-PR-2 behavior exactly.

**Architecture:** Single-file change inside `src/lib/solana/providers.ts` — no changes to `rpc-pool.ts` or `rpc-live.ts` consumers (the pool already accepts `ReadonlyArray<RpcProvider>`, so scaling from 1 → N providers is transparent). `.env.local.example` gains the three new vars with inline comments; the existing `NEXT_PUBLIC_SOLANA_RPC_URL` stays documented as "transitional — retiring in PR 5". Tests cover every resolution branch: all new vars unset → legacy fallback; primary alone; primary+secondary; primary+secondary+explicit fallback override; default fallback URL when only primary+secondary are set; invalid URL rejected by Zod; duplicate URLs deduplicated; fixture-mode short-circuit unaffected.

**Tech Stack:** TypeScript (strict, no `any`), `@solana/web3.js` `Connection`, Zod for URL validation, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §5 (Environment Variables — added + retained), §6 (Provider Pool shape — unchanged contract), §12.2 (Migration PR 2 description).

**Scope — in:**
- Modify: `src/lib/solana/providers.ts`
- Modify: `src/lib/solana/__tests__/providers.test.ts`
- Modify: `.env.local.example`

**Scope — out (do not plan here):**
- Consensus verifier — PR 3.
- Browser proxy routes — PR 4.
- Removing `NEXT_PUBLIC_SOLANA_RPC_URL` server-side read path / domain-restricting the browser key — PR 5.
- Any behavioral change to `rpc-pool.ts` or `rpc-live.ts` (the provider-array contract stays identical; these files should be no-ops for this PR).
- Secondary/fallback `Connection` commitment tuning, custom RPC headers, rate-limit middleware.

**Hard constraints:**
1. **Revertable by env.** Unsetting `SOLANA_RPC_PRIMARY_URL`, `SOLANA_RPC_SECONDARY_URL`, `SOLANA_RPC_FALLBACK_URL` must restore exact pre-PR-2 behavior: a single `primary` provider derived from `NEXT_PUBLIC_SOLANA_RPC_URL` (or `clusterApiUrl('mainnet-beta')` if that too is unset). No redeploy required.
2. **Fixture mode & pool kill-switch preserved.** `SOLANA_RPC_MODE=fixture` and `SOLANA_RPC_POOL_DISABLED=true` paths are not touched in this PR; tests must demonstrate fixture code path is unaffected by the new env vars.
3. **Zod for external input.** New URL env vars are validated (scheme `http:` or `https:`, parseable URL). Invalid → thrown error with a clear message. This follows `.claude/rules/common/coding-style.md` "Input Validation" guidance.
4. **No `any`.** Use typed helpers. Let TypeScript infer inside the module; export shapes stay as today.
5. **No behavior change on the existing `NEXT_PUBLIC_SOLANA_RPC_URL` code path.** Existing tests in `providers.test.ts` must still pass (possibly reordered/re-described, but the fallback branch remains).
6. **Server-only.** The three new vars are **not** `NEXT_PUBLIC_*` — they must never appear in the client bundle. Do not reference them from any client component.

**Execution order:** Sequential. Commit after every task. Implementer should run `npx vitest run src/lib/solana/__tests__/providers.test.ts` between steps 2/4 in each test→impl→verify cycle.

**Pre-flight (once, before Task 1):**

Confirm base state:

```bash
git status                                          # clean, on phase/rpc-pool-env-providers
git log --oneline -1                                # 1dde2a7 docs(rpc): add Solana RPC resilience design spec
npx vitest run src/lib/solana/__tests__/providers.test.ts
```

Expected: working tree clean, existing 3 `parseProvidersFromEnv` tests pass.

Then read these files once:
- `src/lib/solana/providers.ts` (current impl — 32 lines)
- `src/lib/solana/__tests__/providers.test.ts` (current tests — 45 lines)
- `.env.local.example` (the `# Solana` section)
- `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §5

---

## Task 1: Introduce Zod-validated URL helper and env-read scaffolding

**Why this exists:** Before `parseProvidersFromEnv()` can resolve three env vars, we need (a) a single place that validates + trims env URLs so the same rules apply to every tier, and (b) a deterministic way to read each env var. Extracting this into small helpers keeps the dispatch logic in `parseProvidersFromEnv()` legible and gives us a clean test surface for the invalid-URL branch.

**Files:**
- Modify: `src/lib/solana/providers.ts`
- Modify: `src/lib/solana/__tests__/providers.test.ts`

- [ ] **Step 1: Write failing tests for URL validation and env reading**

Add to `src/lib/solana/__tests__/providers.test.ts`, alongside the existing `describe('parseProvidersFromEnv', …)` block, a new block:

```typescript
describe('env URL validation', () => {
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;
  const originalSecondary = process.env.SOLANA_RPC_SECONDARY_URL;
  const originalFallback = process.env.SOLANA_RPC_FALLBACK_URL;
  const originalPublic = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    restore('SOLANA_RPC_SECONDARY_URL', originalSecondary);
    restore('SOLANA_RPC_FALLBACK_URL', originalFallback);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalPublic);
    vi.resetModules();
  });

  it('rejects an invalid SOLANA_RPC_PRIMARY_URL with a clear error', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'not a url';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL/);
  });

  it('rejects a non-http(s) scheme', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'ftp://example.test';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL/);
  });

  it('accepts http:// and https:// URLs', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'http://localhost:8899';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers[0].connection.rpcEndpoint).toBe('http://localhost:8899');
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx vitest run src/lib/solana/__tests__/providers.test.ts
```

Expected: the three new tests fail (no `SOLANA_RPC_PRIMARY_URL` wiring yet). Existing tests still pass.

- [ ] **Step 3: Implement the URL validator and env-read helper**

Replace the full contents of `src/lib/solana/providers.ts` with:

```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { z } from 'zod';

export type ProviderTier = 'primary' | 'secondary' | 'fallback';

export interface RpcProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly connection: Connection;
  readonly timeoutMs: number;
}

export const DEFAULT_TIMEOUT_MS = 5_000;
export const DEFAULT_FALLBACK_URL = 'https://api.mainnet-beta.solana.com';

const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'must be a valid http(s) URL' }
  );

function readEnvUrl(envKey: string): string | undefined {
  const raw = process.env[envKey];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const result = httpUrlSchema.safeParse(trimmed);
  if (!result.success) {
    throw new Error(
      `${envKey} is invalid: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return result.data;
}

function legacyPublicUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
}

export function parseProvidersFromEnv(): RpcProvider[] {
  const primaryUrl = readEnvUrl('SOLANA_RPC_PRIMARY_URL');
  const secondaryUrl = readEnvUrl('SOLANA_RPC_SECONDARY_URL');
  const fallbackUrlOverride = readEnvUrl('SOLANA_RPC_FALLBACK_URL');

  // Transitional: if none of the new tier vars are set, honor the legacy
  // NEXT_PUBLIC_SOLANA_RPC_URL (or the Solana cluster default) as the sole
  // primary. PR 5 removes this fallback entirely.
  if (!primaryUrl && !secondaryUrl && !fallbackUrlOverride) {
    const legacy = legacyPublicUrl() ?? clusterApiUrl('mainnet-beta');
    return [buildProvider('primary', 'primary', legacy)];
  }

  // At least one tier var was set. Primary is required in this branch —
  // without it we cannot honor tier semantics (secondary must follow a
  // primary; fallback alone is not a valid configuration).
  if (!primaryUrl) {
    throw new Error(
      'SOLANA_RPC_PRIMARY_URL is required when SOLANA_RPC_SECONDARY_URL or SOLANA_RPC_FALLBACK_URL is set'
    );
  }

  const fallbackUrl = fallbackUrlOverride ?? DEFAULT_FALLBACK_URL;

  const ordered: Array<{ name: string; tier: ProviderTier; url: string }> = [
    { name: 'primary', tier: 'primary', url: primaryUrl },
  ];
  if (secondaryUrl) ordered.push({ name: 'secondary', tier: 'secondary', url: secondaryUrl });
  ordered.push({ name: 'fallback', tier: 'fallback', url: fallbackUrl });

  const seen = new Set<string>();
  const deduped = ordered.filter((entry) => {
    const key = entry.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.map((entry) => buildProvider(entry.name, entry.tier, entry.url));
}

function buildProvider(name: string, tier: ProviderTier, url: string): RpcProvider {
  return {
    name,
    tier,
    connection: new Connection(url, 'finalized'),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run src/lib/solana/__tests__/providers.test.ts
```

Expected: all existing 3 tests + all 3 new tests pass (6/6 green). No skipped tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solana/providers.ts src/lib/solana/__tests__/providers.test.ts
git commit -m "feat(solana): validate new RPC tier env URLs with Zod"
```

---

## Task 2: Primary / secondary / explicit-fallback resolution tests + verify dispatch

**Why this exists:** Task 1 wired the parser structurally, but we haven't asserted the end-to-end tier-resolution matrix: (a) primary alone, (b) primary + secondary, (c) primary + secondary + explicit fallback, (d) primary + secondary with default fallback kicking in, (e) missing-primary-when-others-set error. These are the behaviors PR 2 actually ships.

**Files:**
- Modify: `src/lib/solana/__tests__/providers.test.ts`

- [ ] **Step 1: Write failing tests for tier resolution**

Append to `src/lib/solana/__tests__/providers.test.ts` a new block after `describe('env URL validation', …)`:

```typescript
describe('tier resolution', () => {
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;
  const originalSecondary = process.env.SOLANA_RPC_SECONDARY_URL;
  const originalFallback = process.env.SOLANA_RPC_FALLBACK_URL;
  const originalPublic = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    restore('SOLANA_RPC_SECONDARY_URL', originalSecondary);
    restore('SOLANA_RPC_FALLBACK_URL', originalFallback);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalPublic);
    vi.resetModules();
  });

  it('returns [primary, default fallback] when only primary is set', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.tier)).toEqual(['primary', 'fallback']);
    expect(providers.map((p) => p.name)).toEqual(['primary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://primary.example');
    expect(providers[1].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('returns [primary, secondary, default fallback] when primary+secondary are set', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.tier)).toEqual(['primary', 'secondary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://primary.example');
    expect(providers[1].connection.rpcEndpoint).toBe('https://secondary.example');
    expect(providers[2].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('uses SOLANA_RPC_FALLBACK_URL to override the default fallback', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://primary.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://fallback.example';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.connection.rpcEndpoint)).toEqual([
      'https://primary.example',
      'https://secondary.example',
      'https://fallback.example',
    ]);
  });

  it('throws a clear error when SOLANA_RPC_SECONDARY_URL is set but primary is not', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://secondary.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL is required/);
  });

  it('throws when only SOLANA_RPC_FALLBACK_URL is set without primary', async () => {
    delete process.env.SOLANA_RPC_PRIMARY_URL;
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://fallback.example';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    expect(() => parseProvidersFromEnv()).toThrow(/SOLANA_RPC_PRIMARY_URL is required/);
  });
});
```

- [ ] **Step 2: Run tests — confirm they pass (no implementation change needed)**

```bash
npx vitest run src/lib/solana/__tests__/providers.test.ts
```

Expected: all pre-existing 6 tests + new 5 tests pass (11/11 green). Task 1 already implemented the logic these tests exercise — the purpose of Task 2 is to lock the behavior in test form.

If any test fails, **do not modify the tests to make them pass** — the spec and the implementer-facing plan describe the intended behavior. Fix `providers.ts` so it matches, then re-run.

- [ ] **Step 3: Commit**

```bash
git add src/lib/solana/__tests__/providers.test.ts
git commit -m "test(solana): cover primary/secondary/fallback env resolution"
```

---

## Task 3: Deduplication + legacy-fallback transition tests

**Why this exists:** Two remaining behaviors need explicit coverage so they don't regress:
1. **Deduplication** — if two tier vars point at the same URL (e.g. primary and fallback both set to the same Helius endpoint during staged rollout), we should not build two `Connection` objects for the same endpoint. The circuit breaker is per-provider-name, so duplicate URLs across tiers dilute the signal and waste connection slots. Dedupe is case-insensitive on the full URL string (query-string/path preserved), because Solana RPC providers often return identical endpoints with minor case variance in path segments.
2. **Legacy fallback transition** — when none of the three new vars are set we must return exactly one provider derived from `NEXT_PUBLIC_SOLANA_RPC_URL` (or cluster default). This is already covered at the top of the file but we add explicit cross-interaction coverage: new tier vars present → legacy ignored, which is the invariant PR 5 depends on.

**Files:**
- Modify: `src/lib/solana/__tests__/providers.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/solana/__tests__/providers.test.ts` a new block after `describe('tier resolution', …)`:

```typescript
describe('deduplication and legacy interaction', () => {
  const originalPrimary = process.env.SOLANA_RPC_PRIMARY_URL;
  const originalSecondary = process.env.SOLANA_RPC_SECONDARY_URL;
  const originalFallback = process.env.SOLANA_RPC_FALLBACK_URL;
  const originalPublic = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('SOLANA_RPC_PRIMARY_URL', originalPrimary);
    restore('SOLANA_RPC_SECONDARY_URL', originalSecondary);
    restore('SOLANA_RPC_FALLBACK_URL', originalFallback);
    restore('NEXT_PUBLIC_SOLANA_RPC_URL', originalPublic);
    vi.resetModules();
  });

  it('deduplicates when primary and secondary share the same URL', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://same.example';
    process.env.SOLANA_RPC_SECONDARY_URL = 'https://same.example';
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv, DEFAULT_FALLBACK_URL } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers.map((p) => p.name)).toEqual(['primary', 'fallback']);
    expect(providers[0].connection.rpcEndpoint).toBe('https://same.example');
    expect(providers[1].connection.rpcEndpoint).toBe(DEFAULT_FALLBACK_URL);
  });

  it('deduplicates case-insensitively when primary and fallback collide', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://Host.Example/rpc';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    process.env.SOLANA_RPC_FALLBACK_URL = 'https://host.example/rpc';
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    expect(providers).toHaveLength(1);
    expect(providers[0].tier).toBe('primary');
  });

  it('ignores NEXT_PUBLIC_SOLANA_RPC_URL when any tier var is set', async () => {
    process.env.SOLANA_RPC_PRIMARY_URL = 'https://tiered.example';
    delete process.env.SOLANA_RPC_SECONDARY_URL;
    delete process.env.SOLANA_RPC_FALLBACK_URL;
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://legacy.example';
    vi.resetModules();
    const { parseProvidersFromEnv } = await import('../providers');
    const providers = parseProvidersFromEnv();
    const endpoints = providers.map((p) => p.connection.rpcEndpoint);
    expect(endpoints).toContain('https://tiered.example');
    expect(endpoints).not.toContain('https://legacy.example');
  });
});
```

- [ ] **Step 2: Run tests — confirm they pass**

```bash
npx vitest run src/lib/solana/__tests__/providers.test.ts
```

Expected: all prior tests + new 3 tests pass (14/14 green).

If the dedupe tests fail, the implementation from Task 1 needs a case-insensitive dedupe. The code in Task 1 already implements `seen.has(key.toLowerCase())` — re-read `providers.ts` and confirm.

- [ ] **Step 3: Commit**

```bash
git add src/lib/solana/__tests__/providers.test.ts
git commit -m "test(solana): cover provider dedupe and legacy fallback interaction"
```

---

## Task 4: Sanity-check pool + live consumers (no behavioral change)

**Why this exists:** The pool (`rpc-pool.ts`) and live wiring (`rpc-live.ts`) accept `ReadonlyArray<RpcProvider>` from `parseProvidersFromEnv()`. Scaling the returned array from 1 provider (pre-PR-2) to 2–3 providers (post-PR-2) is supposed to be a no-op — the pool already iterates providers in order, trips breakers per-provider, and fails over. This task is a **read-only verification** that no code path assumes `providers.length === 1`.

**Files:**
- Read (no modification expected): `src/lib/solana/rpc-pool.ts`
- Read (no modification expected): `src/lib/solana/rpc-live.ts`
- Read (no modification expected): `src/lib/solana/__tests__/rpc-pool.test.ts`
- Read (no modification expected): `src/lib/solana/__tests__/rpc-live.test.ts`

- [ ] **Step 1: Audit `rpc-pool.ts` for length-1 assumptions**

Grep and reason about:

```bash
grep -n "providers\[0\]\|length\s*===\s*1\|length < 2\|length > 0" src/lib/solana/rpc-pool.ts
```

Expected: only `providers.length === 0` as a guard (line ~255); no assumption of exactly 1. If any `providers[0]`-only path is found, STOP and escalate — that's a planning gap.

- [ ] **Step 2: Audit `rpc-live.ts` for length-1 assumptions**

```bash
grep -n "providers\[0\]\|primary\s*=\s*providers" src/lib/solana/rpc-live.ts
```

Expected: `providers[0]` is referenced inside `getConnection()` only (lines 47–59). That's intentional — legacy callers of `getConnection()` want a single `Connection` object; we give them the primary. This behavior is correct for PR 2 (primary is always index 0 by construction of `parseProvidersFromEnv()`).

Document in your internal notes: `getConnection()` still returns the primary tier only. This is an intentional hold-over until PR 4 migrates those callers through proxy routes. **Do not "fix" it in this PR.**

- [ ] **Step 3: Confirm existing pool/live tests still pass with multi-provider env**

Run the full solana suite:

```bash
npx vitest run src/lib/solana/__tests__/
```

Expected: all existing tests pass without modification. If any pool/live test fails, the Task 1/2/3 implementation or test env vars leaked across suites — fix the leak, not the pool.

- [ ] **Step 4: No-op commit is unnecessary**

This task produces zero file changes. Move on to Task 5.

---

## Task 5: Document new env vars in `.env.local.example`

**Why this exists:** `.env.local.example` is the only place an onboarding developer or ops engineer learns about runtime env vars. The new tier vars need clear inline guidance: what they do, server-only status, and that `NEXT_PUBLIC_SOLANA_RPC_URL` is in retirement (still read transitionally for PR 1 → PR 4, removed in PR 5).

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Update the `# Solana` block**

Locate the existing `# Solana` section (currently lines 6–9 of `.env.local.example`):

```env
# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_ORG_TOKEN_MINT=DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk
```

Replace with:

```env
# Solana — RPC provider pool (server-only, never exposed to the browser).
# Primary is required in production once any tier var below is set.
# Leaving all three unset falls back to NEXT_PUBLIC_SOLANA_RPC_URL (transitional — removed in PR 5).
SOLANA_RPC_PRIMARY_URL=
# Optional but strongly recommended: second paid provider for failover.
SOLANA_RPC_SECONDARY_URL=
# Optional: defaults to https://api.mainnet-beta.solana.com when unset.
SOLANA_RPC_FALLBACK_URL=

# Solana — browser-facing config (wallet adapter reads NEXT_PUBLIC_SOLANA_RPC_URL).
# Transitional: also read by server code as a fallback until PR 5 retires it.
# In PR 5, rotate this to a domain-restricted wallet-adapter-only key.
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_ORG_TOKEN_MINT=DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs(env): document SOLANA_RPC_PRIMARY/SECONDARY/FALLBACK_URL"
```

---

## Task 6: Full verification — vitest, lint, build

**Why this exists:** Before opening the PR, the full change set must pass the validation matrix in `CLAUDE.md` for server-logic changes (vitest on touched modules + lint + build).

**Files:** none modified.

- [ ] **Step 1: Full solana test suite**

```bash
npx vitest run src/lib/solana/__tests__/
```

Expected: all tests green, no skips added. Count should be ≥ 14 for `providers.test.ts` (3 original + 3 validation + 5 tier + 3 dedupe) plus the pre-existing `rpc-pool.test.ts`, `rpc-factory.test.ts`, and `rpc-live.test.ts` counts unchanged.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: zero errors, zero warnings on `src/lib/solana/providers.ts` and `src/lib/solana/__tests__/providers.test.ts`.

- [ ] **Step 3: Type-check via build**

```bash
npm run build
```

Expected: build completes. No type errors.

If any step fails: fix root causes, never mask. Re-run the full matrix after each fix.

- [ ] **Step 4: Env-flip smoke test (manual, informal)**

Optional but recommended. In a scratch shell:

```bash
# Case A: all three unset → legacy single-primary (pre-PR-2 behavior).
env -u SOLANA_RPC_PRIMARY_URL -u SOLANA_RPC_SECONDARY_URL -u SOLANA_RPC_FALLBACK_URL \
  node -e "console.log(require('./src/lib/solana/providers').parseProvidersFromEnv().map(p => p.name))"

# Case B: primary set → [primary, fallback].
SOLANA_RPC_PRIMARY_URL=https://primary.test \
  node -e "console.log(require('./src/lib/solana/providers').parseProvidersFromEnv().map(p => p.name))"
```

Note: direct `node -e` may not resolve TS imports; if so, skip. The vitest suite exercises the same code paths.

- [ ] **Step 5: No commit**

This task is verification-only.

---

## Task 7: Push branch and open PR 2

**Why this exists:** PR 2 is ready to merge when verification is green and the branch is pushed. The description must reference the spec, list env-var knobs, and tell the reviewer how to revert.

**Files:** no file changes.

- [ ] **Step 1: Push**

```bash
git push -u origin phase/rpc-pool-env-providers
```

- [ ] **Step 2: Create the PR**

```bash
gh pr create --base main --head phase/rpc-pool-env-providers \
  --title "feat(solana): env-driven RPC providers (PR 2 of 5)" \
  --body "$(cat <<'EOF'
## Summary
- Introduces tier-based server-only env vars — `SOLANA_RPC_PRIMARY_URL`, `SOLANA_RPC_SECONDARY_URL`, `SOLANA_RPC_FALLBACK_URL` — parsed, URL-validated with Zod, and deduplicated by `parseProvidersFromEnv()` into the `RpcPool` consumed by `rpc-live.ts`.
- Legacy `NEXT_PUBLIC_SOLANA_RPC_URL` remains read as a transitional fallback when none of the three tier vars are set. Removed in PR 5.
- Documents the new knobs in `.env.local.example` with inline comments. No runtime behavior change when tier vars are unset.

## Why
Spec §5 (Environment Variables) + §12.2 (Migration PR 2). This is step 2 of 5 in the crypto-sensitive staged rollout: reliability through real failover requires real providers, and that requires server-only env plumbing.

Design: `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md`
Plan: `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-2-env-providers.md`

## Revert plan
Unset all three env vars in the environment (Vercel / prod config). On next cold boot, `parseProvidersFromEnv()` returns a single `primary` provider derived from `NEXT_PUBLIC_SOLANA_RPC_URL` — exact pre-PR-2 behavior. No redeploy required for the env change itself.

If a code-level revert is needed: `git revert` this PR is safe — no schema changes, no shared contract changes.

## Test plan
- [x] `npm run build` green locally
- [x] `npm run lint` green locally
- [x] `npx vitest run src/lib/solana/__tests__/` green locally
- [x] Env-flip smoke: all three unset → 1 provider (primary from NEXT_PUBLIC); primary set alone → 2 providers (primary + default fallback); primary+secondary+fallback-override → 3 providers, no duplication
- [x] `SOLANA_RPC_POOL_DISABLED=true` kill switch path untouched
- [x] `SOLANA_RPC_MODE=fixture` path untouched

## Files changed
- `src/lib/solana/providers.ts` — Zod URL schema + tier resolution + dedupe
- `src/lib/solana/__tests__/providers.test.ts` — expanded coverage
- `.env.local.example` — documented the three new vars
EOF
)"
```

- [ ] **Step 3: Verify PR was created**

```bash
gh pr view --json url,state,title,baseRefName,headRefName
```

Expected: returns JSON with the new PR's URL and state `OPEN`.

---

## Self-Review Checklist

Before handing off:

1. **Spec coverage** — §5 "Added" vars all present? ✔ PRIMARY, SECONDARY, FALLBACK covered. §5 "Retained with changed semantics" — NEXT_PUBLIC_SOLANA_RPC_URL still documented as transitional? ✔ Task 5. §12.2 "Secondary + fallback providers" migration step? ✔ Entire PR.
2. **Non-goals respected** — No consensus code. No proxy routes. No lockdown of legacy var. ✔
3. **Placeholders** — None. All code blocks are complete and compilable.
4. **Type consistency** — `ProviderTier`, `RpcProvider`, `DEFAULT_TIMEOUT_MS` names match existing exports. `DEFAULT_FALLBACK_URL` is new but referenced consistently in tests and impl.
5. **Revert contract** — Task 1 impl preserves the legacy fallback branch under the same condition (`!primaryUrl && !secondaryUrl && !fallbackUrlOverride`). Verified by the "all unset" test case (pre-existing `falls back to clusterApiUrl` test still passes).
6. **No `any`** — `readEnvUrl()` uses `z.infer` implicitly via `.safeParse().data` — typed `string`. All internal types explicit.
7. **Server-only** — New vars never prefixed `NEXT_PUBLIC_`. Not referenced from any `.tsx`. Confirmed in Task 1.
