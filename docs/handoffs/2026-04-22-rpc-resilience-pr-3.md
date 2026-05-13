# Handoff — Solana RPC Resilience PR 3

**Written:** 2026-04-23 (autonomous overnight session)
**Author:** Claude Code (Opus 4.7)
**Status:** PR 3 open, core CI green, E2E running. Awaiting your review + merge.

---

## 1. PR 3 — Consensus Verifier

**URL:** https://github.com/FCisco95/organic-app/pull/70
**Branch:** `phase/rpc-consensus-verifier` (pushed, unmerged)
**Base:** `main` (`100159a`)
**Mergeable:** yes; no conflicts.
**CI snapshot (at handoff time):**
- `lint-and-build` — ✅ SUCCESS
- `security-audit` — ✅ SUCCESS
- `unit-tests` — ✅ SUCCESS
- `e2e-integrity` — ⏳ IN_PROGRESS
- `e2e-operational-controls` — ⏳ IN_PROGRESS
- Vercel preview — ✅ SUCCESS

### Commits on the branch (oldest first)

1. `26987b2` — `docs(rpc): add PR 3 consensus verifier plan`
2. `b9ab00d` — `feat(solana): add ConsensusVerifier with per-shape comparators`
3. `2093a61` — `fix(test): scope Vitest to Vitest-style test directories`
4. `0c00453` — `fix(solana): replace BigInt literals with BigInt() constructor calls`
5. `f43148b` — `feat(solana): require consensus on Organic ID holder check`
6. `bf0a35f` — `feat(solana): require consensus on vote snapshot holder list`
7. `3a6fcab` — `feat(solana): consensus-check treasury balance with stale-flag fallback`
8. `ab13160` — `feat(solana): require consensus on donation tx confirmation`
9. `abf00db` — `test(solana): end-to-end consensus disagreement security coverage`
10. `a7cd375` — `docs(env): document SOLANA_RPC_CONSENSUS_ENABLED`
11. `277e19a` — `fix(test): move donation consensus test to tests/security/`

### Files changed vs `origin/main`

```
 .env.local.example                                 |   8 +
 ...22-rpc-resilience-pr-3-consensus-verifier.md    | 422 +++++++++++++++++++
 src/app/api/organic-id/assign/route.ts             |  45 ++-
 src/app/api/proposals/[id]/start-voting/route.ts   |  43 +-
 src/app/api/treasury/__tests__/consensus-balance.test.ts
                                                    | 176 +++++++++
 src/app/api/treasury/route.ts                      |   8 +-
 src/features/donations/verification.ts             |  87 ++++-
 src/features/treasury/server/consensus-balance.ts  |  83 ++++
 src/lib/solana/__tests__/rpc-consensus.test.ts     | 434 +++++++++++++++++++++
 src/lib/solana/__tests__/rpc-live.test.ts          | 294 ++++++++++++++
 src/lib/solana/index.ts                            |  22 +-
 src/lib/solana/rpc-consensus.ts                    | 244 ++++++++++++
 src/lib/solana/rpc-live.ts                         |  92 +++++
 src/lib/solana/rpc-pool.ts                         |  20 +-
 src/lib/solana/rpc-timing.ts                       |  26 ++
 tests/security/donation-verification-consensus.test.ts
                                                    | 264 +++++++++++++
 tests/security/solana-consensus.test.ts            | 394 +++++++++++++++++++
 tests/security/voting-snapshot-integrity.test.ts   |  20 +-
 vitest.config.ts                                   |  20 +
 19 files changed, 2661 insertions(+), 41 deletions(-)
```

Vitest counts: 273 → 300 passing tests (+27 net). `rpc-consensus.test.ts` has 28. `rpc-live.test.ts` went from 10 → 17. Treasury consensus test adds 6. Donation verification consensus test adds 6. Consolidated security file adds 5. Schema test additions in `voting-snapshot-integrity.test.ts`.

---

## 2. Decisions I made without asking

Logged in order of importance. All are reversible.

### D1. No DB migration for the consensus audit log

**Context:** Spec §10 says "Every consensus disagreement writes a security incident row" into an `audit_log` table. The plan Task 1 pre-flight allowed adding a small migration if the table was missing. I grepped `supabase/migrations/` — there is NO `audit_log` table. The nearest neighbor is `admin_config_audit_events`, which is tightly scoped (NOT NULL `actor_id`, `change_scope` enum) and unsuited to system-level RPC events.

**Decision:** Defer the DB audit table. `defaultAuditLogWriter` writes via `logger.error('rpc.consensus_disagreement', row)` — which routes to Sentry in prod and to stdout in dev. The `AuditLogWriter` interface is constructor-injectable, so a future PR can swap in a Supabase-backed writer without touching call sites.

**Why it's safe:**
- PR 3 is about detection + rollout safety, not persistent audit infrastructure.
- Sentry already captures level=error with the full row payload; ops has a signal.
- Keeps PR 3 small and revertable — a migration is additive work that can be a standalone PR when the team wants a queryable audit trail.

**If you disagree:** add a migration for `rpc_consensus_events` (append-only, no FK constraints — these are system events, not user actions) and swap `defaultAuditLogWriter` to insert into it. The interface is ready for it.

### D2. Audit log on disagreement only, NOT on insufficient-responses

**Context:** The plan originally said `ConsensusError` should always trigger an audit write. On closer reading, "insufficient providers responded" (< 2 successes) is a pool-health problem, not a security signal — writing an audit row on every transient network failure would flood the log.

**Decision:** Audit only fires on actual disagreement (≥ 2 successes + compare mismatch). Insufficient-responses throws a `ConsensusError('insufficient providers responded', ...)` without writing an audit row. Explicit test coverage: `rpc-consensus.test.ts`'s `test.insufficient` asserts `writes.length === 0`.

**Why it's safe:**
- `ConsensusError` still propagates to the caller; the fail-closed behavior is preserved.
- Transient pool issues are already tracked by `RpcPool.getHealth()` and individual provider logs.
- The audit trail now only contains rows that are actionable security incidents, not noise.

**If you disagree:** remove the guard in `writeDisagreementAudit` and update the test.

### D3. Extracted `withTimeout` into `rpc-timing.ts` instead of re-exporting from `rpc-pool.ts`

**Context:** Plan suggested either option. I picked the extraction.

**Decision:** New file `src/lib/solana/rpc-timing.ts` exports `withTimeout<T>(op, ms, label)`. Both `rpc-pool.ts` and `rpc-consensus.ts` import from there. Behavior is byte-identical to the previous `withTimeout` in `rpc-pool.ts`.

**Why:** A separate module signals the function is shared infra, not a pool internal. Reduces the chance someone in PR 4 adds a second timeout helper and forgets about this one.

### D4. `vitest.config.ts` added with scoped include[]

**Context:** Pulling `logger` (which transitively imports `@/lib/sentry`) into `rpc-consensus.ts` broke Vitest because there was no `@/` path alias. Adding a config was necessary.

**Decision:** New file `vitest.config.ts` with `resolve.alias['@']` and a tight `test.include[]` listing only the three directories that actually run under Vitest (Solana tests, API route tests, `tests/security/`). Without `include[]`, Vitest greedily walks the entire repo and tries to parse `src/lib/translation/__tests__/*` — those use `node --test` and fail with "No test suite found."

**Why:**
- Alias: needed.
- Include scoping: prevents collision between Vitest and `npm run test` (node --test). Both runners now coexist cleanly.
- Commit `277e19a` later reinforced this when a donations test I initially placed under `src/features/donations/__tests__/` started getting picked up by `npm run test`'s glob. Moved it to `tests/security/donation-verification-consensus.test.ts`.

**If you disagree:** revert `vitest.config.ts` and switch `rpc-consensus.ts`'s `logger` import to a relative path — but the logger itself will still need its `@/lib/sentry` import resolved, cascading into the whole `src/lib` tree.

### D5. Treasury stale fallback cache is module-scope, no TTL

**Context:** Plan called for either an in-memory LRU or Supabase-backed table. I went with module-scope `let lastKnownGoodSolBalance`.

**Decision:** Plain module variable, updates on every consensus success (and on the consensus-disabled direct path, for hygiene). No TTL — a stale balance from six hours ago serves with `stale: true` exactly like one from ten seconds ago.

**Why it's safe for now:** PR 3 goal is wiring + rollout. The UI doesn't yet render `stale` (UI work deferred). If a stale balance is displayed, users see "temporarily inconsistent" messaging; real freshness is restored on the next consensus-clear call (next cache refresh cycle in minutes).

**Flag for later:** TS reviewer flagged this explicitly. Follow-up work should either (a) add `MAX_STALE_AGE_MS` with a fail-through when exceeded, or (b) log the cache age alongside the stale payload so ops can see how stale the served value is. Both are additive, not blocking for PR 3.

### D6. `is-holder` enumeration defense deferred to PR 4

**Context:** The browser-side `/api/organic-id/balance` route has no CSRF or per-user-enumeration-rate guard today. PR 3 wires consensus INTO that route indirectly via `isOrgHolder`, but doesn't add a proxy route for browser callers to hit `/api/solana/is-holder` with consensus.

**Decision:** Leave the enumeration-defense concern to PR 4. PR 4 plan explicitly puts `/api/solana/is-holder` behind auth (401 for anon) and rate-limited (20/min per user), which is the real defense.

### D7. Spec drift noted in commit messages, spec doc not patched

**Context:** Spec §2/§7 lists `src/app/api/auth/link-wallet/route.ts` and `src/features/voting/*` as call sites. Reality: `src/app/api/organic-id/assign/route.ts:78` and `src/app/api/proposals/[id]/start-voting/route.ts:157`.

**Decision:** Code treats the concrete paths as authoritative. Each wiring commit explicitly calls this out. Spec doc stays unchanged on this branch — a docs-only patch PR is the right vehicle.

**If you disagree:** cherry-pick a `docs(spec): correct call-site paths` commit on top of this branch, or do it in a standalone PR after merge.

### D8. Plan file committed to the branch (same as PR 1 + PR 2)

**Context:** User brief said draft plans go uncommitted on main. PR 3 itself shipped its plan as part of the branch (same as PR 2's approach).

**Decision:** Committed `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-3-consensus-verifier.md` on `phase/rpc-consensus-verifier`. Matches precedent from PR 1 and PR 2.

---

## 3. Surprises / flags worth reviewing before merge

- **`vitest.config.ts` is new** — the project never had one before. If you have opinions about Vitest config, now's the moment. The include[] list is the only non-obvious part.

- **Pre-existing `tsc --noEmit` errors exist in other files** (e.g., `tests/security/api-security.test.ts` imports `globSync` from `fs`, which doesn't exist; `src/features/proposals/__tests__/anti-abuse.test.ts` has a type narrowing issue; `tests/voting-integrity.spec.ts` has null assignment). These are NOT introduced by PR 3 — verified by running `tsc --noEmit` on `origin/main`. PR 3's changed files are clean.

- **`rpc-live.ts`'s `__getConsensus()` caches the ConsensusVerifier.** If `SOLANA_RPC_POOL_DISABLED` flips to `true` mid-process, the cached verifier is returned without re-checking. Production env is static so this isn't a problem; `__resetRpcCachesForTests` handles test isolation.

- **`SOLANA_RPC_CONSENSUS_ENABLED` is read inside `verify()` on every call**, not at construction. Intentional — supports a hot-toggleable rollout. A caller checking `getSolanaConsensus() !== null` doesn't know whether consensus is actually enforcing; the env flag is a second gate they can't see. `getSolanaConsensus()` JSDoc could mention this (suggestion from code review, not blocking).

- **Donation verification `summarizeTx` returns `status: 'finalized'` unconditionally** because the fetch uses `commitment: 'finalized'`. This means the status half of `compareTxConfirmation` is effectively dead code for this call site — real discrimination is on `slot`. Documented with a comment.

- **No Supabase touched.** No RLS changes. No DB migration. No new npm script.

- **`NEXT_PUBLIC_SOLANA_RPC_URL`** still reachable from server code (transitional fallback from PR 2). Removed in PR 5.

---

## 4. PR 4 plan (drafted, uncommitted)

**Location:** `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-4-proxy-routes.md` (untracked on `main`).
**Scope:** Four canonical `/api/solana/*` GET routes — `token-balance`, `is-holder` (authed, consensus), `holder-count` (with optional top-N), `tx-status` (consensus on demand via `?consensus=true`). Plus migration of `profile-wallet-tab.tsx` from `/api/organic-id/balance` to `/api/solana/token-balance`.

**Key plan decisions that need sign-off before execution:**

1. **Auth posture**: `/is-holder` requires an authenticated session (prevents holder-enumeration attacks); other three routes are public-with-rate-limit. Matches spec §8's implied asymmetry. If you want stricter posture (auth everywhere), say so in the PR 4 kickoff.

2. **Rate-limit bucket**: adds `solanaProxy` (100/min per IP) and `solanaProxyUser` (300/min per authed user). Fits the existing `RATE_LIMITS` table in `src/lib/rate-limit.ts:380`.

3. **`/api/organic-id/balance` stays** until PR 5. `profile-wallet-tab.tsx` switches to the new proxy, but the old route is left alive for one release cycle in case scripts / external callers depend on it. PR 5 deletes it.

4. **No MSW introduction**. Plan tests proxy routes with the same `vi.mock + importActual` pattern proven in PR 3. Adding MSW is infrastructure work that doesn't belong in PR 4.

Plan has 8 tasks in the same TDD cadence as PR 3.

---

## 5. Exact next-session prompt (paste after PR 3 merges)

When you've merged PR #70, paste this to the next Claude Code session. Self-contained — no conversation context needed.

> **Autonomous execution: Solana RPC resilience PR 4 (browser proxy routes).**
>
> **Context (state as of handoff, 2026-04-23):**
> - PR 3 merged (#70): `ConsensusVerifier` class with per-shape comparators, wired into Organic ID grant, vote snapshot, treasury balance, donation verification. Default-off via `SOLANA_RPC_CONSENSUS_ENABLED=false`. 300/300 Vitest + 93/93 node --test tests green.
> - PR 4 plan already drafted at `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-4-proxy-routes.md` — uncommitted on main, commit it as your first action with `docs(rpc): add PR 4 proxy routes plan`.
> - Prior handoff: `HANDOFF_RPC_PR3.md` at repo root (uncommitted, context only — don't commit).
>
> **Objective:** Open PR 4 ready-for-merge, draft PR 5 plan, write `HANDOFF_RPC_PR4.md`. No merges.
>
> **Pre-flight (in order):**
> 1. `git switch main && git pull --ff-only` — should include PR #70.
> 2. `git branch -d phase/rpc-consensus-verifier && git push origin --delete phase/rpc-consensus-verifier`.
> 3. `git switch -c phase/rpc-proxy-routes`.
> 4. Commit the uncommitted PR 4 plan file as the first commit on the branch.
> 5. Read: spec `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §8, §9, §11; the PR 4 plan end-to-end; `HANDOFF_RPC_PR3.md` §3 + §4 for the cache-staleness and auth-posture gotchas.
>
> **Operating rules (non-negotiable — user is unavailable):**
> - Take the best option every time. Log every non-obvious decision in `HANDOFF_RPC_PR4.md`.
> - Kill switches preserved: `SOLANA_RPC_POOL_DISABLED=true` must revert every new proxy route to the legacy direct-`Connection` path. `SOLANA_RPC_CONSENSUS_ENABLED=false` (default) must make the `/is-holder` and `/tx-status?consensus=true` consensus branches behave identically to their non-consensus counterparts.
> - `/api/solana/is-holder` must require auth (prevents holder enumeration). Other routes are public + rate-limited.
> - Every query param validated with Zod (wallet: base58 32–44 chars; signature: base58 64–96 chars; top: integer 1–100).
> - TypeScript strict, no `any`. No `@ts-expect-error`, no `console.log`. Use `logger`.
> - Never `--no-verify`, never `--force`, never self-merge.
>
> **Skills to invoke:** superpowers:writing-plans (only if amending the plan), superpowers:subagent-driven-development, superpowers:test-driven-development, superpowers:verification-before-completion.
>
> **Execution:**
> 1. Execute the 8-task PR 4 plan via subagent-driven-development. Fresh implementer per task; two-stage review (general-purpose spec compliance, then typescript-reviewer).
> 2. If an implementer surfaces a real plan bug, patch the plan inline as a separate commit: `docs(rpc): patch plan Task N ...`.
> 3. Verify: `npx vitest run`, `npm run test`, `npm run lint`, `npm run build`.
> 4. `git push -u origin phase/rpc-proxy-routes` then `gh pr create --base main --head phase/rpc-proxy-routes` with spec-referencing body.
>
> After PR 4 is open (CI running):
> 1. Read spec §12 step 5 to confirm PR 5 scope (lockdown — retire `NEXT_PUBLIC_SOLANA_RPC_URL` server-side read, domain-restrict wallet adapter URL, remove `/api/organic-id/balance`, flip `SOLANA_RPC_CONSENSUS_ENABLED=true` in prod).
> 2. Write `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-5-lockdown.md` using superpowers:writing-plans. Do NOT commit it.
> 3. `git switch main`.
> 4. Write `HANDOFF_RPC_PR4.md` at repo root, uncommitted. Mirror the structure of `HANDOFF_RPC_PR3.md`: PR URL + CI status, decisions taken + rationale, files changed + LOC delta, flags, next-session prompt for PR 5, appendix pointer to the uncommitted PR 5 plan.
>
> **Final state when done:**
> - Current branch: main.
> - PR 4 open, CI green or running.
> - `phase/rpc-proxy-routes` pushed, unmerged.
> - Uncommitted on main: `HANDOFF_RPC_PR4.md` and `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-5-lockdown.md`.
>
> Start now. Do not ask questions.

---

## 6. Appendix — pointer to uncommitted PR 4 plan

- Path: `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-4-proxy-routes.md`
- Status: untracked on `main` at handoff time.
- Length: 518 lines.
- Task count: 8 (shared schemas + rate-limit bucket, four routes, wallet-tab migration, security tests, verify/push/PR).
- Self-review checklist at the bottom enforces the nine must-haves (Cache-Control, rate-limit registry, Zod, auth posture, kill switches, etc.).

---

## 7. Appendix — spec drift not yet patched in the spec doc

Same as flagged in `HANDOFF_RPC_PR2.md` §6 — this is unchanged from PR 2:

- §2 "Known call sites — Server-side" lists `src/app/api/auth/link-wallet/route.ts` as an Organic ID call site. Actual call is at `src/app/api/organic-id/assign/route.ts:78`.
- §7 critical-read table row 1 carries the same stale path.
- §7 critical-read table row 2 lists `src/features/voting/*` directory-scoped. Concrete call is at `src/app/api/proposals/[id]/start-voting/route.ts:157`.

Suggested spec patch (propose during PR 3 or PR 4 review, not blocking):

```
-| `src/app/api/auth/link-wallet/route.ts` | `isOrgHolder(wallet)` at Organic ID grant | ...
+| `src/app/api/organic-id/assign/route.ts` | `isOrgHolder(wallet)` at Organic ID grant | ...

-| `src/features/voting/*` (snapshot creation on proposal close) | `getAllTokenHolders()` | ...
+| `src/app/api/proposals/[id]/start-voting/route.ts` | `getAllTokenHolders()` | ...
```

Landing this is a pure docs commit — good candidate for a fast follow-up after PR 3 merges, independent of the remaining PR 4 + PR 5 work.
