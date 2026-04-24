# Solana RPC Resilience — PR 5: Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the Solana RPC resilience rollout. Browser-exposed `NEXT_PUBLIC_SOLANA_RPC_URL` stops being a server-readable fallback; `/api/organic-id/balance` retires; `SOLANA_RPC_CONSENSUS_ENABLED=true` flips in prod after one preview observation cycle. After this PR lands, the only browser-reachable RPC URL is the wallet adapter's — which is explicitly documented as a domain-restricted, wallet-adapter-only key.

**Architecture:** No new modules. Three small code deletions (transitional legacy-URL fallback in `providers.ts`, the retired `/api/organic-id/balance` route, and a `wallet-provider.tsx` comment pointing at the new invariant) plus documentation and env-var updates. Tests updated to match the removed fallback path.

**Tech Stack:** Same as PRs 1–4. No new dependencies. No new files of substance (just an env-doc update and possibly a migration note).

**Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §5 (env var semantics), §12 step 5 (migration — lockdown).

---

## Scope — in

- **Delete:** `src/app/api/organic-id/balance/route.ts` + its tests. Retirement: external callers, docs, and `profile-wallet-tab.tsx` all use `/api/solana/token-balance` after PR 4.
- **Modify:** `src/lib/solana/providers.ts` — remove the transitional legacy-URL fallback at lines 51–57 that honors `NEXT_PUBLIC_SOLANA_RPC_URL` when no tier URLs are set. Replace with a hard error (or, for local dev, `clusterApiUrl('mainnet-beta')` only) so the browser-exposed URL is never used server-side again.
- **Modify:** `src/lib/solana/__tests__/providers.test.ts` — drop/replace the tests that asserted the legacy fallback was honored. Add a test asserting the fallback is gone (attempting to read `NEXT_PUBLIC_SOLANA_RPC_URL` as a pool tier now yields the cluster default only, or throws per the chosen behavior).
- **Modify:** `src/features/auth/wallet-provider.tsx` — add a JSDoc comment above the `endpoint` `useMemo` documenting the invariant: this URL is wallet-adapter-only, must be a domain-restricted public key, and is the ONLY place server-side code reads a browser-exposed Solana RPC URL. No behavior change.
- **Modify:** `.env.local.example` — update documentation block for `NEXT_PUBLIC_SOLANA_RPC_URL` to reflect lockdown semantics (wallet-adapter only, must be domain-restricted, must NOT be set to a paid key without origin restrictions). Add a line confirming `SOLANA_RPC_CONSENSUS_ENABLED=true` is the prod default after this PR.
- **Modify:** `README.md` — replace any "set `NEXT_PUBLIC_SOLANA_RPC_URL` to a Helius/QuickNode URL" guidance with the new tier-URL variables (`SOLANA_RPC_PRIMARY_URL`, etc.) for server config, and emphasize the wallet-adapter-only scoping of the public var.
- **Modify:** `.github/workflows/ci.yml` — remove any `NEXT_PUBLIC_SOLANA_RPC_URL` usage if it was only seeding the transitional fallback path; keep it as a wallet-adapter env if the CI smoke hits the wallet flow.
- **Create:** `HANDOFF_RPC_PR5_READINESS.md` (uncommitted, for the operator) — env-flip checklist: prod sets `SOLANA_RPC_CONSENSUS_ENABLED=true`, preview has been observed ≥ 24h with zero disagreements, wallet-adapter URL rotated to a domain-restricted key, old key revoked after 7 days.

## Scope — out (follow-ups, not this PR)

- Admin UI surfacing `RpcPool.getHealth()` (spec §14).
- Multi-tenant RPC configuration (per-community keys).
- DB-backed audit table for consensus disagreement events (currently logs via `logger.error` → Sentry).
- Treasury stale-cache TTL guard (flagged in `HANDOFF_RPC_PR3.md`).
- Spec-doc patch correcting `§2`/`§7` call-site paths (`src/app/api/organic-id/assign/route.ts`, `src/app/api/proposals/[id]/start-voting/route.ts`).
- Domain-restriction rotation itself is an operational task (ops registers domain restrictions with the RPC provider before this PR merges). Code-wise, only the documentation changes.

## Hard constraints

1. **No silent regressions on browser-side wallet flows.** `wallet-provider.tsx` continues to read `NEXT_PUBLIC_SOLANA_RPC_URL` for `signAndSendTransaction`. The env var is not deleted — only its server-side scope.
2. **`/api/organic-id/balance` deletion is only safe because `profile-wallet-tab.tsx` already migrated in PR 4.** Before executing Task 2 of this plan, `grep -rn "/api/organic-id/balance" src/` must return zero results outside the route file itself. If any caller remains, migrate it first.
3. **Consensus enforcement is an env change, not a code change.** `SOLANA_RPC_CONSENSUS_ENABLED=true` flips in prod only after a preview observation window confirms zero disagreement rate on the critical-read allowlist. This plan documents the flip; it does not ship code that assumes consensus is always on.
4. **Transitional fallback removal must keep dev ergonomics.** Local development without any `SOLANA_RPC_*_URL` configured should still boot — fall back to `clusterApiUrl('mainnet-beta')` (public, rate-limited) for dev only. Error out in production when no tier URL is set.
5. **TypeScript strict. No `any`, no `@ts-expect-error`, no `console.log`.** Keep the `logger.error(msg, ctx, err)` signature (error as 3rd positional arg) for Sentry compatibility.
6. **No `--no-verify`, no `--force`, no self-merge.**

## Execution order

Sequential. Task 1 removes the legacy fallback and updates provider tests. Task 2 deletes `/api/organic-id/balance` after confirming no callers remain. Task 3 updates wallet-provider.tsx (docs-only, no behavior change). Task 4 updates env docs. Task 5 verifies everything, opens PR, and produces the operator-facing env-flip checklist.

## Pre-flight (once, before Task 1)

```bash
git switch main && git pull --ff-only
# PR 4 (#71) must be merged before PR 5 starts.
git switch -c phase/rpc-lockdown
npx vitest run && npm run test && npm run lint && npm run build
```

Expected: 343 + 93 tests green, lint clean, build succeeds.

Confirm the transitional fallback is still present:

```bash
grep -n "NEXT_PUBLIC_SOLANA_RPC_URL" src/lib/solana/providers.ts
```

Expected: line 52/55 — the legacy fallback. If already gone, this PR is partially obsolete; stop and reassess.

Confirm `/api/organic-id/balance` has no in-repo callers:

```bash
grep -rn "/api/organic-id/balance" src/ tests/
```

Expected: only `src/app/api/organic-id/balance/route.ts` itself (its own module internals). If any consumer is grep'd out, migrate before deleting.

---

## Task 1: Remove the transitional legacy-URL fallback in `providers.ts`

**Why this exists:** PR 2 kept a fallback so the repo worked during the transition: if no tier URL was set, the pool would read the old browser-exposed `NEXT_PUBLIC_SOLANA_RPC_URL` as its sole primary. Now that tier URLs are populated in every environment, the fallback is no longer needed and actively harms the "browser RPC URLs never touch server code" invariant.

**Files:**
- Modify: `src/lib/solana/providers.ts`
- Modify: `src/lib/solana/__tests__/providers.test.ts`

### Steps

- [ ] **Step 1: Update failing provider tests first**

Open `src/lib/solana/__tests__/providers.test.ts` and locate the tests asserting the legacy fallback is honored (search for `NEXT_PUBLIC_SOLANA_RPC_URL`). Mark them expected-fail after the code change, OR edit them to assert the new behavior:

```typescript
it('uses mainnet-beta cluster default when no tier URLs are set (dev ergonomics)', () => {
  // Unset every URL variable.
  delete process.env.SOLANA_RPC_PRIMARY_URL;
  delete process.env.SOLANA_RPC_SECONDARY_URL;
  delete process.env.SOLANA_RPC_FALLBACK_URL;
  delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const providers = buildProviders();
  expect(providers).toHaveLength(1);
  expect(providers[0].tier).toBe('primary');
  // Public cluster default, not the legacy env var.
  expect(providers[0].connection.rpcEndpoint).toContain('mainnet-beta');
});

it('ignores NEXT_PUBLIC_SOLANA_RPC_URL entirely (browser URL stays browser-only)', () => {
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://browser-only.example.com';
  delete process.env.SOLANA_RPC_PRIMARY_URL;
  delete process.env.SOLANA_RPC_SECONDARY_URL;
  delete process.env.SOLANA_RPC_FALLBACK_URL;
  const providers = buildProviders();
  expect(providers[0].connection.rpcEndpoint).not.toContain('browser-only.example.com');
});
```

Run: `npx vitest run src/lib/solana/__tests__/providers.test.ts` — expect failures.

- [ ] **Step 2: Patch `providers.ts`**

Remove lines 51–57 (the transitional legacy-URL block). Replace with:

```typescript
  // No tier URLs configured. In production this is a misconfiguration —
  // set at least SOLANA_RPC_PRIMARY_URL. For local dev, fall back to the
  // public cluster default so the app boots without requiring a paid key.
  if (!primaryUrl && !secondaryUrl && !fallbackUrlOverride) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Solana RPC providers are not configured. Set SOLANA_RPC_PRIMARY_URL (and recommended SOLANA_RPC_SECONDARY_URL).'
      );
    }
    return [buildProvider('primary', 'primary', clusterApiUrl('mainnet-beta'))];
  }
```

Do NOT read `NEXT_PUBLIC_SOLANA_RPC_URL` anywhere in this file. Drop the import of `readEnvUrl('NEXT_PUBLIC_SOLANA_RPC_URL')` in this specific branch.

- [ ] **Step 3: Run tests, confirm green**

Run: `npx vitest run src/lib/solana/__tests__/providers.test.ts` → pass.
Run: `npx vitest run` → all green. No regressions across the 343-test baseline.

- [ ] **Step 4: Commit**

```bash
git add src/lib/solana/providers.ts src/lib/solana/__tests__/providers.test.ts
git commit -m "feat(solana): remove transitional NEXT_PUBLIC_SOLANA_RPC_URL fallback

Server-side provider config no longer reads the browser-exposed
RPC URL. Unconfigured prod now errors loudly; dev falls back to
mainnet-beta cluster default. Browser wallet adapter continues to
own NEXT_PUBLIC_SOLANA_RPC_URL (domain-restricted, wallet-only)."
```

---

## Task 2: Retire `/api/organic-id/balance`

**Why this exists:** After PR 4, `profile-wallet-tab.tsx` uses `/api/solana/token-balance`. The old POST endpoint is unused in-repo. Leaving it alive is a maintenance tax and a second source of truth for browser balance reads.

**Files:**
- Delete: `src/app/api/organic-id/balance/route.ts`
- Delete (if exists): `src/app/api/organic-id/balance/__tests__/*.test.ts`
- Modify: `src/middleware.ts` — remove `/api/organic-id/balance` from `DASHBOARD_READ_RATE_LIMIT_PATHS` (line 44).

### Steps

- [ ] **Step 1: Confirm zero callers**

```bash
grep -rn "/api/organic-id/balance" src/ tests/ scripts/ 2>/dev/null
```

Expected: only self-references inside the route file. If any caller exists outside the route, STOP — migrate that caller first (probably using the same pattern as `profile-wallet-tab.tsx:53-62`).

- [ ] **Step 2: Delete the route + any test files**

```bash
rm -rf src/app/api/organic-id/balance/
```

- [ ] **Step 3: Patch middleware**

Remove `'/api/organic-id/balance'` from the `DASHBOARD_READ_RATE_LIMIT_PATHS` Set in `src/middleware.ts` (currently around line 44). Keep the Set itself.

- [ ] **Step 4: Verify**

```bash
npx vitest run
npm run test
npm run lint
npm run build
```

Build must still succeed — this is the critical check. A broken dependency on the deleted route will surface here.

- [ ] **Step 5: Commit**

```bash
git add -u src/app/api/organic-id/balance/ src/middleware.ts
git commit -m "feat(solana-proxy): retire /api/organic-id/balance

All in-repo callers migrated to GET /api/solana/token-balance in
PR 4 (#71). Rate-limit registry cleaned up to match."
```

---

## Task 3: Document wallet-adapter invariant in `wallet-provider.tsx`

**Why this exists:** Future contributors need to understand that `NEXT_PUBLIC_SOLANA_RPC_URL` is deliberately wallet-adapter-only post-lockdown. A comment here is the shortest path; a doc elsewhere will drift.

**File:** `src/features/auth/wallet-provider.tsx`

### Steps

- [ ] **Step 1: Add JSDoc above the `endpoint` useMemo**

At the location currently around lines 9–12:

```tsx
  /**
   * Wallet adapter endpoint. This is the ONLY place server-adjacent code
   * reads NEXT_PUBLIC_SOLANA_RPC_URL — the paid-provider tier URLs
   * (SOLANA_RPC_PRIMARY_URL etc.) handle all server-side Solana calls.
   *
   * Invariant: this URL must be a domain-restricted public key. The
   * wallet adapter uses it for `signAndSendTransaction`, blockhash
   * lookup, and tx submission — operations any visitor's wallet could
   * already perform. Never set this to a paid key without origin
   * restrictions at the provider level.
   */
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
  }, []);
```

No behavior change. JSDoc only.

- [ ] **Step 2: Verify, commit**

```bash
npm run lint
git add src/features/auth/wallet-provider.tsx
git commit -m "docs(solana): document wallet-adapter NEXT_PUBLIC_SOLANA_RPC_URL invariant"
```

---

## Task 4: Update env docs

**Files:**
- Modify: `.env.local.example`
- Modify: `README.md`

### Steps

- [ ] **Step 1: `.env.local.example`**

Find the `NEXT_PUBLIC_SOLANA_RPC_URL` block. Replace with:

```ini
# Wallet adapter RPC endpoint (browser).
#
# This variable is wallet-adapter-only after PR 5. Never set this to a
# paid provider key without domain restrictions at the provider level —
# the key is inlined into the browser bundle.
#
# Server-side Solana reads go through SOLANA_RPC_PRIMARY_URL /
# SOLANA_RPC_SECONDARY_URL / SOLANA_RPC_FALLBACK_URL and the
# /api/solana/* proxy routes.
NEXT_PUBLIC_SOLANA_RPC_URL=

# Paid provider tier URLs (server-only).
SOLANA_RPC_PRIMARY_URL=
SOLANA_RPC_SECONDARY_URL=
SOLANA_RPC_FALLBACK_URL=

# Enforce 2-of-N consensus on critical reads (Organic ID grants, vote
# snapshots, treasury balance, donation verification). Defaults to
# `false` during rollout; flip to `true` in prod once preview observes
# a baseline zero disagreement rate.
SOLANA_RPC_CONSENSUS_ENABLED=true
```

- [ ] **Step 2: `README.md`**

Search for any `NEXT_PUBLIC_SOLANA_RPC_URL` guidance. Replace prose with:

> **Server-side Solana configuration:** Set `SOLANA_RPC_PRIMARY_URL` and (recommended) `SOLANA_RPC_SECONDARY_URL` to your paid provider endpoints. Browser code never sees these.
>
> **Browser wallet-adapter configuration:** Set `NEXT_PUBLIC_SOLANA_RPC_URL` to a **domain-restricted** public RPC key. This endpoint handles wallet connection and transaction signing only. Never reuse your server-side paid-provider key here.

- [ ] **Step 3: Commit**

```bash
git add .env.local.example README.md
git commit -m "docs(env): scope NEXT_PUBLIC_SOLANA_RPC_URL to wallet-adapter only"
```

---

## Task 5: Verify, push, open PR, produce env-flip checklist

- [ ] Run `npx vitest run` — expect 343 (or minus whatever was deleted with the `/api/organic-id/balance` tests).
- [ ] Run `npm run test` — 93 green.
- [ ] Run `npm run lint` — clean.
- [ ] Run `npm run build` — success. Confirms `/api/organic-id/balance` deletion didn't leave dangling imports and the `providers.ts` refactor holds under type-check.
- [ ] `git push -u origin phase/rpc-lockdown`
- [ ] `gh pr create --base main --head phase/rpc-lockdown --title "feat(solana): RPC resilience lockdown (PR 5 of 5)"` with body covering: summary, kill-switch behavior (still `SOLANA_RPC_POOL_DISABLED=true` for any emergency revert), operator checklist (env flips + wallet-adapter URL rotation), test plan, spec reference.
- [ ] **Open/update** `HANDOFF_RPC_PR5_READINESS.md` (uncommitted on main) with the ordered operator checklist:
  1. Register domain restrictions for the new wallet-adapter key at the RPC provider (provider-specific UI).
  2. Rotate `NEXT_PUBLIC_SOLANA_RPC_URL` in Vercel to the new domain-restricted key.
  3. Verify preview deployment: wallet connects, token balance renders via `/api/solana/token-balance`, donation flow verifies tx via `/api/solana/tx-status?consensus=true`.
  4. Flip `SOLANA_RPC_CONSENSUS_ENABLED=true` in Vercel prod env.
  5. Observe structured logs for 24 hours. Zero consensus disagreement events expected on the allowlist.
  6. Revoke the previous wallet-adapter key at the provider after 7 days (grace period for any cached client).

---

## Self-review checklist (run before closing out PR 5)

1. **Transitional fallback removed:** `grep -n NEXT_PUBLIC_SOLANA_RPC_URL src/lib/solana/providers.ts` → no matches. ✔
2. **`/api/organic-id/balance` gone:** directory deleted; middleware cleaned; no build errors. ✔
3. **Wallet adapter still works:** `src/features/auth/wallet-provider.tsx` unchanged behaviorally; only JSDoc added. ✔
4. **Env docs updated:** `.env.local.example` and `README.md` reflect post-lockdown semantics. ✔
5. **Kill switch preserved:** `SOLANA_RPC_POOL_DISABLED=true` still reverts everything to legacy direct-`Connection`. ✔
6. **Consensus flip documented in operator checklist** (not in code). ✔
7. **TypeScript strict, no `any`, no `console.log`, no `@ts-expect-error`.** ✔
8. **Build succeeds** (catches any missed reference to the deleted route). ✔

---

## Notes carried from PR 4

- `profile-wallet-tab.tsx` already uses `/api/solana/token-balance`; no additional migration work in PR 5.
- `is-holder` / `holder-count` / `tx-status` consumers don't exist yet in the browser bundle — those are available for future features without blocking PR 5.
- Consensus allowlist is unchanged: Organic ID grant, vote snapshot, treasury balance, donation verification. PR 5 does not add to it.
- `HANDOFF_RPC_PR4.md` (uncommitted on main) captures the full PR 4 decision log and the exact next-session prompt that becomes this plan.
