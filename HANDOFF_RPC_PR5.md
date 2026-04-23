# Handoff — Solana RPC Resilience PR 5 (Lockdown)

**Written:** 2026-04-23 (autonomous session)
**Author:** Claude Code (Opus 4.7)
**Status:** PR 5 merged. RPC resilience rollout complete on the code side. Operator env-flip checklist below is the only remaining work.

---

## 1. PR 5 — Lockdown

**URL:** https://github.com/FCisco95/organic-app/pull/74
**Merged:** 2026-04-23T18:50:55Z via `--squash --delete-branch`
**Merge commit on `main`:** `05363db`
**CI at merge time:** all required checks green — `lint-and-build`, `security-audit`, `unit-tests`, `e2e-integrity`, `e2e-operational-controls`, `Vercel`, `Vercel Preview Comments`. `e2e-full-evidence` skipped per ruleset.

### Commits in the merged branch (newest first)

1. `c219ff1` — `docs(env): scope NEXT_PUBLIC_SOLANA_RPC_URL to wallet-adapter only`
2. `0e6ef18` — `docs(solana): document wallet-adapter NEXT_PUBLIC_SOLANA_RPC_URL invariant`
3. `f22baea` — `feat(solana-proxy): retire /api/organic-id/balance`
4. `026713e` — `fix(solana-tests): honor readonly NODE_ENV in type-check`
5. `1efe15f` — `test(solana): harden rpc-live tests against NODE_ENV=production`
6. `2136a89` — `feat(solana): remove transitional NEXT_PUBLIC_SOLANA_RPC_URL fallback`

### Files changed vs `main` pre-merge (`686c799`)

```
 9 files changed, 95 insertions(+), 146 deletions(-)
```

| File | Status | Notes |
|---|---|---|
| `src/lib/solana/providers.ts` | +16/-8 | Removed transitional `NEXT_PUBLIC_SOLANA_RPC_URL` fallback; unconfigured prod throws, unconfigured non-prod falls back to cluster default. |
| `src/lib/solana/__tests__/providers.test.ts` | +88/-66 | Replaced 3 legacy-fallback tests with dev/prod split tests; dropped tautological dedup test; `NODE_ENV` mutation via typed-cast helper. |
| `src/lib/solana/__tests__/rpc-live.test.ts` | +8/-4 | Tests now set `SOLANA_RPC_PRIMARY_URL` instead of `NEXT_PUBLIC_SOLANA_RPC_URL`; hardened against `NODE_ENV=production`. |
| `src/app/api/organic-id/balance/route.ts` | -78 | **Deleted.** All callers migrated in PR 4 (#72). |
| `src/middleware.ts` | -1 | Removed `/api/organic-id/balance` from `DASHBOARD_READ_RATE_LIMIT_PATHS`. |
| `tests/security/api-security.test.ts` | -5 | Removed the auth-check test targeting the deleted route. |
| `src/features/auth/wallet-provider.tsx` | +11/-1 | JSDoc documenting the wallet-adapter-only invariant on `NEXT_PUBLIC_SOLANA_RPC_URL`. No behavior change. |
| `.env.local.example` | +17/-9 | Updated Solana block for lockdown semantics; `SOLANA_RPC_CONSENSUS_ENABLED` default flipped to `true`. |
| `README.md` | +3/-1 | Split single `NEXT_PUBLIC_SOLANA_RPC_URL` env list entry into server-side tiers + wallet-adapter-only note. |

**Vitest counts:** 340/340 passed (baseline 343 → -3 across Task 1's tautology removal and the legacy-fallback test deletions; Task 2 removed another unrelated to the count). **Node native runner (`npm run test`):** 93/93 passed. **Lint / Build:** clean.

---

## 2. Decisions I made without asking

All reversible. Logged in rough order of importance.

### D1. Hardened `src/lib/solana/__tests__/rpc-live.test.ts` as part of Task 1 (commit `1efe15f`)

**Context:** The plan's Task 1 scope was "`providers.ts` + its test file only". After removing the transitional fallback, four tests in `rpc-live.test.ts` that relied on setting `NEXT_PUBLIC_SOLANA_RPC_URL` to seed the provider pool broke under `NODE_ENV=production` (vitest inherits the shell's NODE_ENV; my sandbox shell defaults to `production`). Under `NODE_ENV=test` they still passed — but the fragility was real and CI-environment-dependent.

**Decision:** Expanded Task 1 scope to include `rpc-live.test.ts`. Migrated the four affected tests to set `SOLANA_RPC_PRIMARY_URL` instead — matches the new provider semantics, removes the `NODE_ENV` dependency, and makes the tests self-documenting.

**Why it's safe:** Purely test-side hardening. Zero production-code change. The commit itself is minimal (+8/-4 on one test file).

**If you want to revert:** `git revert 1efe15f` — tests revert to the prior mid-state. They'll still pass under `NODE_ENV=test` but will fail under `NODE_ENV=production`. No behavior change to production code.

### D2. Fixed `TS2540: Cannot assign to 'NODE_ENV'` via typed-cast helper (commit `026713e`)

**Context:** Task 1's initial test refactor assigned `process.env.NODE_ENV` directly to mutate the branch under test. Under the project's `tsc --noEmit` (strict, Next.js augments `NodeJS.ProcessEnv.NODE_ENV` as `readonly`), those three assignments produced TS2540 errors. The errors were not surfaced by `npm run lint` or `npm run build` — only by `npx tsc --noEmit`. CI's `lint-and-build` step did not catch them, but the typescript-reviewer subagent did.

**Decision:** Added a `setNodeEnv(value: string | undefined)` helper at the top of the relevant describe block that does a narrow `(process.env as Record<string, string | undefined>).NODE_ENV = value;`. All NODE_ENV mutations in the test now go through this helper. No production-code change. Also cleaned up: dropped the tautological `'ignores NEXT_PUBLIC_SOLANA_RPC_URL when any tier var is set'` test (impossible to fail post-removal) and renamed the describe block from `'deduplication and legacy interaction'` to `'deduplication'`.

**Why it's safe:** Typed cast is narrow (key-level, not blanket `any`). No other file touched. All tests still green under both `NODE_ENV=test` and `NODE_ENV=production`.

### D3. Kept `process.env.NODE_ENV === 'production'` as the prod gate in `providers.ts`

**Context:** The typescript-reviewer subagent flagged that `NODE_ENV === 'production'` is a build-time signal (set by `next build`) rather than a deployment-time operator gate. In principle an operator running `NODE_ENV=development next start` in production would silently hit the public cluster rate-limited endpoint instead of erroring out. A dedicated env var like `SOLANA_RPC_PERMISSIVE_DEV` would be more precise.

**Decision:** Left it as-is. Adding a new env-var gate is a design change that expands PR 5 scope beyond lockdown. The plan explicitly specified `process.env.NODE_ENV === 'production'`. Next.js deployments almost universally have `NODE_ENV=production` under `next build` + `next start`; the failure mode the reviewer described requires deliberate operator misconfiguration.

**Follow-up suggestion:** If the ops team wants a deployment-time gate independent of build-time, land a separate small PR that introduces the indirection. Not blocking.

### D4. Did NOT modify `.github/workflows/ci.yml`

**Context:** Plan Task 4 included "Modify: `.github/workflows/ci.yml` — remove any `NEXT_PUBLIC_SOLANA_RPC_URL` usage if it was only seeding the transitional fallback path; keep it as a wallet-adapter env if the CI smoke hits the wallet flow."

**Decision:** CI sets `NEXT_PUBLIC_SOLANA_RPC_URL: https://api.mainnet-beta.solana.com` across three E2E jobs. The wallet-adapter (`src/features/auth/wallet-provider.tsx`) reads this var to configure its RPC endpoint; the E2E runs exercise wallet-connection flows. The value is the public cluster URL — non-sensitive, unchanged post-lockdown. Keeping it avoids breaking E2E smoke tests that might rely on the wallet adapter having *some* configured endpoint rather than falling back to `clusterApiUrl('mainnet-beta')`.

**If you want it removed:** safe after verifying the three E2E jobs still pass with `NEXT_PUBLIC_SOLANA_RPC_URL` unset — the wallet-adapter's `|| clusterApiUrl('mainnet-beta')` fallback would kick in.

### D5. Left `workspace-snapshot.tsv` alone

**Context:** `workspace-snapshot.tsv:188` references the deleted `src/app/api/organic-id/balance/route.ts`.

**Decision:** Not touched — the file is auto-generated and will regenerate on the next snapshot run. Task 2 plan explicitly excluded it.

### D6. README updates stayed narrow (bullet list only, no prose rewrite)

**Context:** Plan Task 4 Step 2 offered prose wording for a "server-side vs browser-side" Solana config section. Grepped README for `Helius`, `QuickNode`, and prose referencing `NEXT_PUBLIC_SOLANA_RPC_URL` — none exist. The only mention is a simple bulleted env-var list under the Vercel deployment section.

**Decision:** Only updated the bullet list: split the single `NEXT_PUBLIC_SOLANA_RPC_URL` entry into three bullets documenting `SOLANA_RPC_PRIMARY_URL`, `SOLANA_RPC_SECONDARY_URL`, and the wallet-adapter-only annotation. Skipped the prose block since there was no prose to replace.

---

## 3. Kill switches preserved

- **`SOLANA_RPC_POOL_DISABLED=true`** — unchanged. Still bypasses the full pool/consensus pipeline and reverts to the legacy direct-`Connection` path in `src/lib/solana/rpc-live.ts`. Verified: `grep -n SOLANA_RPC_POOL_DISABLED src/lib/solana/rpc-live.ts` still shows the disable branch returning `null` from `__getPool()` and `__getConsensus()`.
- **`SOLANA_RPC_CONSENSUS_ENABLED=false`** — unchanged code behavior. When `false`, the consensus verifier is not enforced and all critical reads go through a single-provider fast path. PR 5 only updated `.env.local.example` to document the default (intended production value is `true` post-24h observation window, per the operator checklist).

Only behavioral change on emergencies: in production, **missing `SOLANA_RPC_PRIMARY_URL` now throws at startup** instead of silently falling back to the public cluster. To recover from a misconfig, set `SOLANA_RPC_PRIMARY_URL` to any valid RPC URL (including the public cluster) before boot. This is intentional per the plan's Hard Constraint #4.

---

## 4. Surprises / flags worth reviewing

### F1. `NODE_ENV` readonly type mismatch was not caught by `npm run build`

`npm run build` under Next.js does not run `tsc --noEmit` in strict mode on test files. The `TS2540` errors surfaced only when I ran `npx tsc --noEmit` directly. The code-quality review subagent caught it before PR open. Consider adding a `typecheck` script to `package.json` (e.g. `npx tsc --noEmit --project tsconfig.json`) and a corresponding CI step, so strict-mode compile errors in test files fail CI rather than surviving to review.

### F2. `npm run test` and `npx vitest run` cover disjoint test files

- `npm run test` uses the Node.js native test runner and globs `src/features/*/__tests__/*.test.ts src/lib/__tests__/*.test.ts` — it does NOT pick up `src/lib/solana/__tests__/*.test.ts` (the `solana` subdirectory).
- CI's `unit-tests` job runs `npm run test` plus `./node_modules/.bin/vitest run tests/security/` — only security vitest tests. It does NOT run `npx vitest run src/lib/solana/__tests__/`.
- Consequence: the core `providers.test.ts` and `rpc-live.test.ts` tests run locally via `npx vitest run` but NOT in CI. PR 5's correctness relies on them, but CI would not catch a regression there.

**Follow-up:** add a `vitest run src/lib/solana/__tests__/` step (or widen the existing `vitest run tests/security/` to cover all vitest tests) to the CI `unit-tests` job. Flagged by the code-quality reviewer as a pre-existing gap — out of scope for PR 5 but worth a one-line CI PR.

### F3. `providers.ts` prod gate uses `NODE_ENV === 'production'`

Build-time signal, not operator-controlled. See D3 above. Non-blocker; flagged for a potential follow-up if the ops team wants an explicit deployment-time gate.

### F4. `SOLANA_RPC_CONSENSUS_ENABLED` default in `.env.local.example` flipped from `false` to `true`

This is a docs-only change (operator sets the real value in Vercel). The plan specified this change. Just don't let the example value mislead a developer into thinking consensus is on by default — the **code** default remains "off unless the env var is literally the string `'true'`".

### F5. `HANDOFF_RPC_PR5_READINESS.md` not written

The original task prompt mentioned creating a separate uncommitted `HANDOFF_RPC_PR5_READINESS.md` for the operator checklist. Instead, the checklist lives directly in the PR 5 body (https://github.com/FCisco95/organic-app/pull/74) as a markdown checkbox list, which is more discoverable and doesn't add another uncommitted file to the working tree. If you prefer a standalone file, copy the checklist from the PR body to a new `HANDOFF_RPC_PR5_READINESS.md` at the repo root.

### F6. Pre-existing `tsc --noEmit` errors in other files

`npx tsc --noEmit` on `main` (post-merge) still shows pre-existing errors in:
- `src/features/proposals/__tests__/anti-abuse.test.ts:49` — narrowing issue on union type.
- `tests/security/*.test.ts` — `globSync` import from `'fs'` (should be `'glob'`).
- `tests/voting-integrity.spec.ts:198,308` — `string | null` assignment.

None introduced by PR 5. All predate this session. Candidates for a standalone cleanup PR.

### F7. Spec drift still not patched

Carried unchanged from PR 2–4 handoffs:
- Spec §2 lists `src/app/api/auth/link-wallet/route.ts` as the Organic ID grant site; actual is `src/app/api/organic-id/assign/route.ts:78`.
- Spec §7 critical-read table row 1 carries the same stale path.
- Spec §7 row 2 directory-scoped; concrete site is `src/app/api/proposals/[id]/start-voting/route.ts:157`.

Still valid as a standalone docs PR. Suggested diff in `HANDOFF_RPC_PR2.md` §6.

---

## 5. Operator checklist — env-flip sequence

**Reference copy.** The authoritative version lives in the PR 5 body (https://github.com/FCisco95/organic-app/pull/74) — use that for ticking off during the rollout.

Run these in order, not all at once:

1. Register domain restrictions for the new wallet-adapter key at the RPC provider (provider-specific UI — Helius / QuickNode / Triton / etc.).
2. Rotate `NEXT_PUBLIC_SOLANA_RPC_URL` in Vercel (Preview + Production) to the new domain-restricted key.
3. Verify preview deployment:
   - Wallet connects (Phantom / Solflare / etc.).
   - Token balance renders via `/api/solana/token-balance`.
   - Donation flow verifies tx via `/api/solana/tx-status?consensus=true`.
4. Flip `SOLANA_RPC_CONSENSUS_ENABLED=true` in Vercel Production env.
5. Observe structured logs for 24 hours. Zero consensus disagreement events expected on the allowlist (Organic ID grant, vote snapshot, treasury balance, donation verification).
6. Revoke the previous wallet-adapter key at the provider after 7 days (grace period for any cached client).

---

## 6. Post-merge follow-ups (not this PR)

Ordered by priority.

1. **Admin UI for `RpcPool.getHealth()`** — spec §14 follow-up. Surface the live provider-health state so oncall can see consensus hits/misses at a glance.
2. **Treasury stale-cache TTL guard** — flagged in `HANDOFF_RPC_PR3.md`. `src/features/treasury/server/consensus-balance.ts` has `lastKnownGoodSolBalance` with no TTL cap.
3. **`logger.error(msg, ctx, err)` pattern sweep** — PR 4 adopted the positional-arg form for Sentry compatibility, but `src/app/api/organic-id/assign/route.ts` and `src/features/donations/verification.ts` still nest errors in context objects. Sentry gets message-only reports instead of stack traces. `chore(logger): migrate error nesting to positional arg` — standalone PR.
4. **CI vitest coverage gap** — see F2. Widen `unit-tests` job to run `vitest run src/lib/solana/__tests__/` so solana-pool regressions fail CI.
5. **`tsc --noEmit` pre-existing errors** — see F6. Standalone cleanup PR.
6. **Spec drift patches** — see F7. Docs-only PR when convenient.
7. **DB-backed audit table for consensus disagreement events** — currently only logs via `logger.error` → Sentry. For forensic retention, persist disagreement rows to a Supabase table.
8. **Multi-tenant RPC configuration** — per-community RPC keys for the multi-DAO vision. Future work.
9. **Domain-restriction helper for providers without a native UI** — small dev-tool script to set domain restrictions via the provider's API rather than manual clicks. Nice-to-have.

---

## 7. State of the world

- Branch `main`: at `05363db`. Working tree clean.
- No open PRs related to the RPC resilience feature.
- No remote `phase/rpc-*` or `docs/rpc-*` branches (pruned after merge).
- All four handoffs committed in prior PRs: `HANDOFF_RPC_PR2.md`, `HANDOFF_RPC_PR3.md`, `HANDOFF_RPC_PR4.md` on main via #73. `HANDOFF_RPC_PR5.md` shipping via `docs/rpc-pr5-handoff` branch (this file).
- Verification suite all green on main post-merge:
  - `npx vitest run` → 340/340 passed across 35 files.
  - `npm run test` → 93/93 passed.
  - `npm run lint` → clean.
  - `npm run build` → clean.

Nothing blocks new work. The operator env-flip checklist is the only remaining action item, and it belongs to ops/infra, not code.
