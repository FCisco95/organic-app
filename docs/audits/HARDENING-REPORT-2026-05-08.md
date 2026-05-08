# Comprehensive Hardening Pass — 2026-05-08

Six-phase autonomous hardening pass against `main` at commit `048dcf4`. Goal: surface and close the highest-impact security, type-safety, performance, test-coverage, and observability gaps in a single coordinated effort.

## At a glance

| Phase | Branch | PR | Status |
|---|---|---|---|
| 1 — Parallel audits | (in PRs below) | — | ✅ |
| 2 — Security CRIT/HIGH fixes | `security/hardening-2026-05-08` | [#117](https://github.com/FCisco95/organic-app/pull/117) | ✅ |
| 3 — Test coverage | `test/coverage-2026-05-08` | [#118](https://github.com/FCisco95/organic-app/pull/118) | ✅ |
| 4 — XER zero-output diagnosis | `fix/xer-diagnosis-2026-05-08` | [#119](https://github.com/FCisco95/organic-app/pull/119) | ✅ |
| 5 — Validation | (combined) | — | ✅ |
| 6 — Final report | `docs/hardening-report-2026-05-08` | (this PR) | ✅ |

**Validation results on a branch that combined all three feature PRs:**

```
npm run lint   → ✔ No ESLint warnings or errors
npm run build  → Compiled with warnings (pre-existing global-error.tsx only)
npx vitest run → 745 passed (63 files)
npm run test   → 130 passed (node test runner)
```

---

## Phase 1 — Audits

Four agents ran in parallel for ~10 minutes total. Outputs landed in `docs/audits/`.

### 1A · Security (`security-audit-2026-05-08.md`)
3 CRITICAL, 3 HIGH, 1 MEDIUM, 2 LOW. Top three:
- **CRIT-1** — `email` + `claimable_points` re-introduced into the publicly-readable `leaderboard_view` by two recent feature migrations (`20260507212349`, `20260507221350`). `SELECT` granted to `anon`. PII + economic-data exposure.
- **CRIT-2** — SSRF in `src/lib/og-preview.ts`. User-controlled `twitter_url` was fetched directly with `redirect: 'follow'`. AWS IMDS, RFC1918, localhost all reachable.
- **CRIT-3** — Wallet nonce replay window in `/api/auth/link-wallet`. Non-atomic `UPDATE used_at = …` with explicit "Continue even if marking nonce fails" comment. Two concurrent requests with the same SIWS payload could both link.

### 1B · TypeScript (`typescript-audit-2026-05-08.md`)
- 201 `as any` casts, 47 `as unknown as` double-casts, 16 `catch (err: any)`, 0 `@ts-ignore`/`@ts-expect-error`. `tsc --noEmit` exits 0 — every finding is a latent gap, not a current type error.
- 13 tables missing from the generated `Database` type (root cause of ~120 `(supabase as any)` casts; **regenerating it would close most of the lazy `any`s in one shot**).
- 2 API routes consume `request.json()` without Zod; 1 search/sort param flows into `.order()` without an allowlist (`/api/admin/users`).

### 1C · Performance (`performance-audit-2026-05-08.md`)
Top 3 bottlenecks:
- `/tasks/[id]` ships **334 kB first-load JS** (entire 963-line page is `'use client'` with 8 below-the-fold components statically imported).
- `/api/dashboard` adds 1–2 extra Supabase RTTs per dashboard load by `await`ing `loadSprintHero()` alone before the 5-way `Promise.all`.
- `/api/analytics` issues unbounded queries against `votes`, `task_submissions`, `comments`, `activity_log` over a 30-day window.

5 missing indexes flagged, 3 server-side waterfalls, 5 re-render hotspots, 10 CWV risks across the top 5 trafficked pages.

### 1D · Test coverage (`test-coverage-map-2026-05-08.md`)
- **Fully covered (5)**: auth, tasks, proposals, voting, sprints
- **Partial (5)**: disputes, members, reputation, rewards, engagement
- **Minimal/none (3)**: notifications, points/gamification (API), easter/xer (API)
- 348 total test files. Top 10 priority gaps surfaced.

---

## Phase 2 — Security CRIT + HIGH fixes

PR [#117](https://github.com/FCisco95/organic-app/pull/117) on `security/hardening-2026-05-08`. Six commits, one per finding, plus a build-fix. Every fix has a regression test in `tests/security/`.

| Finding | Fix file(s) | Regression test |
|---|---|---|
| **CRIT-1** PII in leaderboard | `supabase/migrations/20260508000000_leaderboard_view_remove_pii.sql` (drops & recreates the view without `email` / `claimable_points`) | `tests/security/leaderboard-pii-exposure.test.ts` (scans the latest migration) |
| **CRIT-2** SSRF | `src/lib/og-preview.ts` (adds `isSafeOgUrl` allowlist + private-IP block; `redirect: 'manual'`) | `tests/security/og-preview-ssrf.test.ts` (31 tests across IMDS, RFC1918, IPv6, scheme bypass, subdomain confusion) |
| **CRIT-3** Nonce replay | `src/features/auth/nonce.ts` (new `consumeWalletNonce` helper; atomic UPDATE with `.is('used_at', null)`); `src/app/api/auth/link-wallet/route.ts` rejects 409 on race-loss | `tests/security/wallet-nonce-replay.test.ts` (8 tests: happy path, race-loss, null-data, db error, atomic-filter wiring, static guard) |
| **HIGH-1** Spoofable UA bypass | `src/middleware.ts` (removes `userAgent.includes('Next.js')` branch + the now-empty helper) | `tests/security/middleware-ua-bypass.test.ts` (3 tests, including a guard that the CVE-2025-29927 strip stays) |
| **HIGH-2** Rate-limit fallback ineffective | `src/lib/rate-limit.ts` (returns 503 + Retry-After in production-on-Vercel without Upstash) | `tests/security/rate-limit-production-fail-closed.test.ts` (4 tests: prod fails closed, prod-with-Upstash OK, dev OK, DISABLE_RATE_LIMIT OK) |
| **HIGH-3** Self-insert eggs | `supabase/migrations/20260508000100_golden_eggs_drop_user_insert.sql` (drops the user-level INSERT policy) | `tests/security/golden-eggs-insert-policy.test.ts` (scans for an explicit DROP after the CREATE) |

The build-fix commit (`fix(types): structural WalletNonceUpdater`) loosens the helper's parameter type to a structural shape so TypeScript doesn't try to deep-instantiate the full `Database` generic when the route calls it.

### Deferred (justification)

- **MED-1** — `/api/solana/token-balance` accepts a wallet param with no auth. Allowing unauthenticated wallet-balance lookups enables financial surveillance via the public leaderboard's organic_id → wallet mapping. Recommended fix: add `getUser()` and reject anon, or aggressively rate-limit by IP. Not fixed in this pass because the route is consumed by the wallet-verification UX *before* a session exists; closing it requires UX work. Logged for a follow-up issue.
- **LOW-1** — Add a comment above `escapePostgrestValue` documenting it as a security boundary. One-line cosmetic.
- **LOW-2** — `claimable_points` removal is bundled into the CRIT-1 migration (same view), so this is effectively closed.

---

## Phase 3 — Test coverage

PR [#118](https://github.com/FCisco95/organic-app/pull/118) on `test/coverage-2026-05-08`. Five new test files, ~186 assertions.

| Test file | Coverage |
|---|---|
| `tests/security/api-auth-enforcement.test.ts` | Sweeping static guard: walks every `src/app/api/**/route.ts` (161 routes) and asserts each POST/PATCH/PUT/DELETE handler has a recognizable auth gate. Two routes (`/api/health`, `/api/referrals/validate`) explicitly allowlisted with comments. Catches the most common regression class. |
| `src/app/api/notifications/__tests__/route.test.ts` | 8 tests on the previously-untested notifications surface: 401 for anon, 400 on Zod failure, 400 on malformed JSON, IDOR-scope guard on PATCH `/[id]/read` (UPDATE filters by `user_id = auth user`). |
| `src/app/api/easter/__tests__/auth.test.ts` | 5 tests: 401 for anon on egg-claim/xp-egg-claim, 400 on Zod failure, leaderboard reads via service-client. |
| `src/app/api/gamification/__tests__/auth.test.ts` | 5 tests: 401 for anon on /user/points and /gamification/burn, happy path returns the `ECONOMY_CONSTANTS` payload, POST burn invokes `burnPointsToLevelUp` with the auth user id. |
| `src/app/api/internal/__tests__/cron-auth.test.ts` | 6 tests for `appeals-sweep` + `engagement-poll`: 503 missing CRON_SECRET, 401 missing/invalid bearer, happy path runs the underlying service. |

### Out of scope (justification)

- Per-route happy-path tests for every list endpoint (200+ tests) — audit tagged this as P3 polish.
- IDOR tests for treasury balance + posts list — treasury is intentionally public via anon client; posts has its own scoping that needs a separate session fixture.
- XER cron output-shape tests — Phase 4 diagnosis explicitly recommends a follow-up to add a precondition enum first.
- Reputation/treasury domain happy-path tests — covered structurally by the broad auth-enforcement guard; deeper functional tests deferred.

---

## Phase 4 — XER zero-output diagnosis

PR [#119](https://github.com/FCisco95/organic-app/pull/119) on `fix/xer-diagnosis-2026-05-08`. Documentation-only.

**Verdict: the cron is running, the data pipeline has no inputs.**

`engagement-poll.yml` (GitHub Actions, every 15 min — moved off Vercel at PR #77 because Vercel Hobby caps cron at daily) hits `/api/internal/engagement/poll` correctly. The cron returns 200 OK regardless of inner success, so logs are always green. Inside `processEngagementTick`:

1. `engagement_handles` is empty in production. **No migration seeds it; admin UI was deferred per CLAUDE.md organic-ux rule.** Discovery iterates an empty array.
2. `TWITTER_TOKEN_ENCRYPTION_KEY` is likely not set in Vercel production env (cannot verify from the repo).
3. No admin/council member has linked Twitter, so `loadCrawlerToken` cannot acquire a verify-able crawler identity.
4. `engagement_rubric_examples` is also unseeded — comment scoring would misbehave even after 1–3 are fixed.

The diagnosis document includes:
- Root-cause ranking with file:line evidence.
- 6 Supabase SQL verification queries the operator can run.
- Step-by-step fix sequence (verify env → admin links Twitter → seed handle → seed rubric → wait one tick).
- Recommended observability follow-up: surface a precondition enum from `processEngagementTick` so the cron output makes the failure visible.

**No code change in Phase 4** — every blocker is operator-side. Per the phase brief: *"Fix it or write a clear diagnosis if blocked on external info."*

---

## Phase 5 — Validation

Combined all three PR branches into a temporary `validate/hardening-2026-05-08` branch. All four checks pass:

```
npm run lint                           → clean
npm run build                          → green (only pre-existing global-error.tsx warning)
npx vitest run                         → 745 passed across 63 files
npx vitest run tests/security/         → 500 passed across 37 files
npm run test (node --test)             → 130 passed
```

The build initially failed with **"Type instantiation is excessively deep and possibly infinite"** at the route's call to `consumeWalletNonce`. The hand-rolled `WalletNonceUpdater` type tried to match the full `SupabaseClient<Database>` generic chain. Fixed with a structural type + an `as unknown as Parameters<…>[0]` cast at the call site. Behavior unchanged; all 8 nonce regression tests still pass.

---

## Phase 6 — This report

Single commit on `docs/hardening-report-2026-05-08`. Bundles all five Phase-1/4 audit files and this summary so reviewers see the same picture I did.

---

## Judgment calls (with reasoning)

The phase brief said *"work autonomously — make reasonable judgment calls and document them"*. Here they are:

1. **CRIT-1 fix shape: drop+recreate vs ALTER VIEW**
   I dropped and recreated the view + materialized view rather than `CREATE OR REPLACE` because the materialized view depends on the view and the column set differs. Drop+recreate is the only reliable shape Supabase will accept for column removal. Migration is reversible by re-running an earlier shape if needed.

2. **CRIT-2 redirect: 'follow' → 'manual'**
   The audit recommended an allowlist + private-IP block. I went one step further and disabled redirect-following entirely. Rationale: an allowlisted twitter.com URL could 30x to an internal target and defeat the host check. Since OG metadata for the social platforms we allow rarely needs a redirect, the loss is negligible. Test coverage includes IPv6 ULAs (`fc00::/7`, `fd00::/8`) and link-local (`fe80::/10`), which the audit didn't enumerate.

3. **CRIT-3 helper extraction**
   Extracted `consumeWalletNonce` into `src/features/auth/nonce.ts` rather than inlining the atomic UPDATE in the route. Trade-off: an extra file vs vastly easier unit-testing. The helper is small and the caller in the route is now self-evidently correct. Cost is one extra import; benefit is 8 deterministic tests that run without a live DB.

4. **HIGH-1 helper deletion**
   Removed `isInternalSystemRequest` entirely instead of leaving a no-op stub. After the CVE-2025-29927 mitigation strips `x-middleware-subrequest`, the helper's only effective branch was the spoofable UA check — once that goes, the function is dead code. Better to delete it than leave a vestige future readers might re-arm.

5. **HIGH-2 fail-closed scope**
   Limited the 503 to `NODE_ENV === 'production' && VERCEL === '1'` only. Dev, build (`NEXT_PHASE`), and `DISABLE_RATE_LIMIT=true` all stay on the in-memory path. Justification: prod-on-Vercel is the only environment where the in-memory map is dangerous (cold starts spread traffic across instances). Dev and build can keep the simpler path.

6. **HIGH-3 minimal change**
   Dropped the user-level INSERT policy on `golden_eggs` only. Did NOT also revoke all grants from `authenticated` (which the audit suggested as an alternative for "permanently retired" tables). Rationale: campaign data is archived but the table/code remain; future campaigns may use it. Keeping SELECT for the owner-or-admin policies and only locking down INSERT is the minimal-risk change.

7. **Phase 3 strategy: broad guard before deep coverage**
   The audit listed top-10 priority gaps, each of which could be 5–20 individual tests. With finite session budget, I optimized for *coverage breadth* by writing one sweeping static-analysis test (161 routes covered) plus 4 deeper domain-specific files. Trade-off: the static guard catches a class of regressions (no-auth-gate-on-mutating-route) but doesn't verify behavioral correctness; the deeper files do. Together they shift the risk profile most for the time spent.

8. **Phase 4 no code change**
   Did not touch `processEngagementTick` to add precondition diagnostics. The phase brief allowed "fix or document," and the actual blockers are entirely operator-side. Adding a precondition enum is non-trivial (return-shape change, consumer updates, tests) and would dilute the surgical-changes rule. Recommended as a follow-up issue at the bottom of the diagnosis doc.

9. **Phase 5 build fix lands on the security PR**
   Cherry-picked the type fix onto `security/hardening-2026-05-08` rather than left in the validation branch, so PR #117 ships green on its own. Validation branch was throwaway; the actual deliverable is the three feature PRs.

10. **PR-per-phase, not single-PR**
    Each phase opened its own PR rather than rolling everything into one. Three PRs are easier to review and revert independently. The user can merge them in any order — they don't conflict (verified on the validation branch).

---

## What I couldn't fix and why

- **MED-1 token-balance unauth** — needs UX clarification on whether the wallet-verify flow can require a session. Logged for follow-up.
- **TypeScript `any` cleanup** — 201 occurrences. Audit's recommendation #1 ("regenerate `src/types/database.ts`") closes most of them in one shot, but that's a Supabase tooling step that requires DB access and is a separate concern from this hardening pass. Audit doc has the top-10 manual fixes for cases the regenerate won't cover.
- **Performance bottlenecks** — 334 kB on `/tasks/[id]` and the dashboard waterfall need a deliberate split-pass per route. They are real and worth doing, but each is a multi-file refactor that doesn't fit the surgical-changes rule for this hardening pass.
- **XER operator-side blockers** — env var, handle seed, OAuth flow. The diagnosis doc unblocks the operator with concrete commands and SQL.
- **Build warning on `global-error.tsx`** — pre-existing, unrelated to this pass.

---

## Recommended next steps (priority-ranked)

### P0 — Operator actions (unblock production)
1. Verify `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set in Vercel production (HIGH-2 starts returning 503 if not after PR #117 lands).
2. Apply both new migrations from PR #117:
   - `20260508000000_leaderboard_view_remove_pii.sql`
   - `20260508000100_golden_eggs_drop_user_insert.sql`
3. Run the XER diagnosis SQL queries (PR #119) and follow its fix sequence.

### P1 — Code follow-ups
4. Regenerate `src/types/database.ts` from the live schema. Closes ~120 `as any` casts (TS audit §1).
5. Add an `event_type` enum entry for the 17 missing `activity_event_type` literals (TS audit §2).
6. Fix the `sortBy` allowlist in `/api/admin/users` (TS audit §3 — the only injection-adjacent surface found).
7. Fix the 8 fire-and-forget `.then()` writes that swallow errors (TS audit §10).
8. Add an `await` + `.catch()` to the 2 `Promise.allSettled` logic bugs in `/api/ideas/[id]/vote` (TS audit §4).

### P2 — Performance
9. `dynamic()` import the `GovernanceSummaryCard` on the home page; memoize the `AuthProvider` context value (perf audit quick wins #1, #2).
10. Parallelize the `loadSprintHero` fetch in `/api/dashboard` (perf audit §6).
11. Add `.limit()` to the unbounded analytics queries (perf audit §3).

### P3 — Coverage
12. Per-route happy-path tests for the remaining list endpoints (auth gate is now guaranteed by Phase 3; behavior next).
13. Add a precondition-enum diagnostic to `processEngagementTick` (XER follow-up §1).
14. Wire the GitHub Actions workflow to fail on consecutive `processedEngagements: 0` (XER follow-up §2).
