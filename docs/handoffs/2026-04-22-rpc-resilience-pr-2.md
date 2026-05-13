# Handoff — Solana RPC Resilience PR 2

**Written:** 2026-04-23 (autonomous overnight session)
**Author:** Claude Code (Opus 4.7)
**Status:** PR 2 open on GitHub, CI green, awaiting your review + merge.

---

## 1. PR 2 — Env-driven RPC providers

**URL:** https://github.com/FCisco95/organic-app/pull/69
**Branch:** `phase/rpc-pool-env-providers` (pushed, unmerged)
**Base:** `main` (1dde2a7)
**Mergeable:** yes; no conflicts.
**CI:** all checks green (`lint-and-build`, `security-audit`, `unit-tests`, `e2e-integrity`, `e2e-operational-controls`, Vercel preview). `e2e-full-evidence` SKIPPED per existing CI rules.

### Commits on the branch (oldest first)
1. `b1c6d44` — `docs(rpc): add PR 2 env providers plan`
2. `d530d25` — `feat(solana): validate new RPC tier env URLs with Zod`
3. `791df1b` — `fix(solana): validate NEXT_PUBLIC_SOLANA_RPC_URL on legacy fallback path`
4. `6473b74` — `test(solana): cover primary/secondary/fallback env resolution`
5. `c125bd9` — `test(solana): cover provider dedupe and legacy fallback interaction`
6. `cf09c93` — `docs(env): document SOLANA_RPC_PRIMARY/SECONDARY/FALLBACK_URL`

### Files changed (vs origin/main)
```
.env.local.example                                            |  13 +-
docs/superpowers/plans/2026-04-22-rpc-resilience-pr-2-env-... | 675 +++++++
src/lib/solana/__tests__/providers.test.ts                    | 199 +++
src/lib/solana/providers.ts                                   |  88 +-
4 files changed, 961 insertions(+), 14 deletions(-)
```

Solana-test count: 42 → 54 (providers.test.ts: 3 → 16).

---

## 2. Decisions I made without asking

Logged in order of importance. All are reversible.

### D1. Strict Zod URL validation applied to the legacy `NEXT_PUBLIC_SOLANA_RPC_URL` fallback path
**Context:** The PR 2 plan only specified Zod validation for the three new tier vars. During code review, the TypeScript reviewer flagged that `legacyPublicUrl()` passed an unvalidated string to `new Connection(...)`, creating an asymmetry with the new tier vars (which throw with a clear "<KEY> is invalid" error).
**Decision:** Deleted `legacyPublicUrl` and routed the legacy env read through the same `readEnvUrl('NEXT_PUBLIC_SOLANA_RPC_URL')` helper. A malformed legacy URL now throws at parse time.
**Why it's safe:**
- Production value is the cluster-default mainnet URL; no real env will be rejected.
- Whitespace-only / unset env still returns `undefined` → falls back to `clusterApiUrl('mainnet-beta')` (unchanged).
- Empirically verified by the `trims whitespace and rejects empty strings, falling back to cluster default` test.
- The "revert contract" (unsetting tier vars restores pre-PR-2 behavior) still holds: a valid legacy URL sails through exactly as before.
**If you disagree:** revert commit `791df1b` in isolation — it's self-contained and has its own test. Everything else still works.

### D2. Case-insensitive URL dedupe
**Context:** Spec doesn't specify case sensitivity on dedupe.
**Decision:** Lowercased comparison before dedupe. Two tier URLs that differ only in case are treated as the same endpoint.
**Why:** Solana RPC providers sometimes vary path case across docs/dashboards (e.g. `/rpc` vs `/RPC`). Treating these as duplicates avoids building two `Connection` objects to the same upstream — the circuit breaker's per-name state assumes providers are semantically distinct, so duplicates dilute the health signal.
**Tradeoff:** We could miss a truly-distinct endpoint that only differs in case. No real provider does this.

### D3. Default fallback URL exported as a named constant (`DEFAULT_FALLBACK_URL`)
**Context:** Plan mentioned the default but didn't require it to be exported.
**Decision:** `export const DEFAULT_FALLBACK_URL = 'https://api.mainnet-beta.solana.com';` Tests import it for equality checks instead of hard-coding the string in three places. Also gives consensus verifier (PR 3) a stable reference if it ever needs to recognize "fallback tier is mainnet-beta default".
**Revert impact:** none — adding an export is additive.

### D4. Kept `NEXT_PUBLIC_SOLANA_RPC_URL` in `.env.local.example`
**Context:** Spec says this var retires in PR 5.
**Decision:** Kept it documented in `.env.local.example` with an inline `# Transitional: also read by server code as a fallback until PR 5 retires it.` comment. Did NOT rename, deprecate-with-warning, or move it into a "legacy" section.
**Why:** Removing it from `.env.local.example` now would break onboarding between PR 2 and PR 5 (new dev clones after this PR, sees only server-tier vars, wallet adapter breaks silently). PR 5 is the correct removal point.

### D5. Throw when secondary/fallback set without primary
**Context:** Plan required this behavior; it's also a sensible defensive guard.
**Decision:** Implemented + two tests. Message: `"SOLANA_RPC_PRIMARY_URL is required when SOLANA_RPC_SECONDARY_URL or SOLANA_RPC_FALLBACK_URL is set"`.
**Operational implication:** An ops engineer who starts a rollout by setting only `SOLANA_RPC_SECONDARY_URL` (weird but possible) gets a boot-time error instead of a silent config that ignores their change.

### D6. Did not touch `rpc-pool.ts` or `rpc-live.ts`
**Context:** Spec §6 says the pool consumes `ReadonlyArray<RpcProvider>` — scaling 1 → N providers is supposed to be a no-op at the consumer layer.
**Decision:** Audited both files with grep (no `providers.length === 1` or `providers[0]`-only assumptions in `rpc-pool.ts`; `rpc-live.ts:48` uses `providers[0]` inside `getConnection()` only, which is intentional per PR 1's plan — legacy callers still want a single Connection, and primary is guaranteed to be index 0 by construction).
**Side effect you should know:** after PR 2 merges and you set `SOLANA_RPC_PRIMARY_URL` in prod, `getConnection()` (used by treasury + donations) silently switches to routing through your paid primary. This is the intended behavior — PR 4 migrates these callers through proxy routes.

### D7. Plan file committed to the branch (not main)
**Context:** User brief said to draft the PR 3 plan uncommitted on main. Did not explicitly say whether the PR 2 plan goes on the branch or main.
**Decision:** Committed `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-2-env-providers.md` to the `phase/rpc-pool-env-providers` branch (and therefore into PR 2). Matches the precedent from PR 1 (the pool foundation plan was merged alongside its implementation via PR #67 → commit history shows the plan living in docs/superpowers/plans/).
**If you want this off:** cherry-pick away before merge, but the plan is a useful audit trail — leaving it in.

---

## 3. PR 3 plan (drafted, uncommitted)

**Location:** `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-3-consensus-verifier.md` (untracked on `main`).
**Scope:** narrow consensus verifier for the four critical reads (Organic ID grant, vote snapshot, treasury balance, donation tx confirmation).
**Key plan decisions that need your sign-off before execution:**

1. **Spec call-site drift** (flagged in the plan). The spec §2 lists `src/app/api/auth/link-wallet/route.ts` as the Organic ID grant site, but the real call is at `src/app/api/organic-id/assign/route.ts:78`. The plan treats `organic-id/assign` as authoritative. If you want me to also patch the spec, approve and I'll do that as the first commit on `phase/rpc-consensus-verifier`.
2. **Single-provider degrade** — plan explicitly says: if `parseProvidersFromEnv()` returns only one provider, `verify()` falls through to `pool.call` with a WARN (does NOT throw). Reason: we can't break deployments that haven't set `SOLANA_RPC_SECONDARY_URL` yet.
3. **Treasury UI stale badge deferred** — plan ships the `{ stale: true }` API flag only. UI work is a separate follow-up issue. Call out at review if you want it bundled.
4. **Audit log writer doesn't mask security signal** — if the `audit_log` insert fails, we log ERROR and still propagate the `ConsensusError`. Rationale: the audit failure is an ops problem; the consensus disagreement is a security signal that callers must see.

The plan has 8 tasks following the same TDD cadence as PR 2, with seven commits (one per wiring + one for tests). Read it end-to-end before dispatching.

---

## 4. Surprises / flags worth reviewing before merge

- **`rpc-live.ts` `getConnection()` still returns the primary provider's Connection directly.** This is a holdover from PR 1 and documented both in the code comment (`src/lib/solana/rpc-live.ts:44-46`) and in PR 1's plan. Legacy callers (`treasury/route.ts`, `donations/verification.ts`) keep using it. PR 3 wraps these in consensus without removing `getConnection()`. PR 4 migrates them to proxy routes.
- **No `@ts-expect-error`, no `any`, no `console.log` added.** Verified by `npm run lint` and spot-check.
- **`NEXT_PUBLIC_SOLANA_RPC_URL` remains server-side reachable** until PR 5. Anyone calling `parseProvidersFromEnv()` with only that var set gets pre-PR-2 behavior.
- **Whitespace in env vars.** `SOLANA_RPC_PRIMARY_URL="  https://helius.example  "` is trimmed before parse (same behavior as the legacy var). Tested.
- **No Supabase or cron touched.** No RLS changes. No DB migration. No new npm script.

---

## 5. Exact next-session prompt (paste after PR 2 merges)

When you've merged PR #69, paste this to the next Claude Code session. It's self-contained; no conversation context needed.

> **Autonomous execution: Solana RPC resilience PR 3 (consensus verifier).**
>
> **Sync state:**
> 1. `git switch main && git pull --ff-only` — should fast-forward to include PR #69 (`cf09c93` + merge commit).
> 2. `git branch -d phase/rpc-pool-env-providers` (local cleanup) and `git push origin --delete phase/rpc-pool-env-providers` (remote cleanup).
> 3. Confirm `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-3-consensus-verifier.md` exists on main. It was drafted in the PR 2 autonomous session but left uncommitted — commit it as the first action with `docs(rpc): add PR 3 consensus verifier plan`.
>
> **Pre-flight reads (in order):**
> - `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §7 (full), §10 (observability/audit), §12 step 3 (migration).
> - `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-3-consensus-verifier.md` (the plan).
> - `src/lib/solana/rpc-pool.ts` (confirm `withTimeout` still lives there; plan suggests extracting to `rpc-timing.ts`).
> - `src/app/api/organic-id/assign/route.ts`, `src/app/api/proposals/[id]/start-voting/route.ts`, `src/app/api/treasury/route.ts`, `src/features/donations/verification.ts` (the four wiring targets).
> - The existing `audit_log` schema — grep `supabase/migrations/` for the table definition.
>
> **Operating rules (non-negotiable — user is asleep):**
> - `git switch -c phase/rpc-consensus-verifier` before editing files.
> - Take the best option every time. Log every non-obvious decision in the handoff.
> - Ship with `SOLANA_RPC_CONSENSUS_ENABLED=false` as the default. Code merged but not enforcing — same rollout pattern as PR 2's tier vars.
> - `SOLANA_RPC_MODE=fixture` and `SOLANA_RPC_POOL_DISABLED=true` kill switches preserved.
> - TypeScript strict, no `any`. Zod for external input. No `@ts-expect-error`. No `console.log`.
> - Single-provider case → degrade to `pool.call` with WARN, never throw `InsufficientProviders`. This is a hard requirement so deployments that haven't set `SOLANA_RPC_SECONDARY_URL` still work.
> - Audit-log write failure must NOT mask `ConsensusError`. Log ERROR and propagate.
> - Never `--no-verify`, never `--force`, never self-merge. Open the PR; CI runs; stop there.
> - Use subagent-driven-development: general-purpose implementer, two-stage review (spec compliance then typescript-reviewer).
> - If an implementer surfaces a real plan bug, patch the plan as a separate commit first.
>
> **Workflow:**
> 1. Commit the plan as noted above.
> 2. Execute the plan task-by-task per the cadence from PR 2 (f6414a3 → cf09c93 on origin history once merged).
> 3. Verify: `npx vitest run src/lib/solana/__tests__/ tests/security/`, `npm run lint`, `npm run build`. Fix root causes.
> 4. Push and open PR 3 with spec-referencing body, revert instructions (unset env flag), follow-up notes (treasury UI stale badge).
> 5. Draft the PR 4 plan (browser proxy routes — `/api/solana/*`) at `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-4-proxy-routes.md`, uncommitted, per the same pattern.
> 6. Switch back to main, write `HANDOFF_RPC_PR3.md` at repo root, uncommitted.
>
> **Final state when done:**
> - Current branch: main.
> - PR 3 open, CI green.
> - `phase/rpc-consensus-verifier` pushed, not merged.
> - Uncommitted on main: `HANDOFF_RPC_PR3.md` and `docs/superpowers/plans/2026-04-22-rpc-resilience-pr-4-proxy-routes.md`.
>
> Start now. Do not ask questions.

---

## 6. Appendix — drift to fix in spec

The spec doc (`docs/superpowers/specs/2026-04-22-rpc-resilience-design.md`) has two stale call-site paths:

- §2 "Known call sites — Server-side" lists `src/app/api/auth/link-wallet/route.ts` as an Organic ID call site. The actual call to `isOrgHolder` is at `src/app/api/organic-id/assign/route.ts:78`. The `link-wallet` route at `src/app/api/auth/link-wallet/route.ts` no longer calls Solana directly.
- §7 critical-read table row 1 lists the same stale path.
- §7 critical-read table row 2 lists `src/features/voting/*` (directory-scoped). The concrete call is at `src/app/api/proposals/[id]/start-voting/route.ts:157`.

Suggested spec patch (propose during PR 3 review, not blocking):
```
-| `src/app/api/auth/link-wallet/route.ts` | `isOrgHolder(wallet)` at Organic ID grant | ...
+| `src/app/api/organic-id/assign/route.ts` | `isOrgHolder(wallet)` at Organic ID grant | ...

-| `src/features/voting/*` (snapshot creation on proposal close) | `getAllTokenHolders()` | ...
+| `src/app/api/proposals/[id]/start-voting/route.ts` | `getAllTokenHolders()` | ...
```

I did not push this spec patch because changing an approved design doc felt outside scope for a PR 2 session. Include it in PR 3 if you're comfortable — it's a documentation-only commit.
