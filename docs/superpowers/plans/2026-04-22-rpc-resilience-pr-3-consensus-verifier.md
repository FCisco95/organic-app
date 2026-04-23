# Solana RPC Resilience — PR 3: Consensus Verifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `ConsensusVerifier` — a narrow, allowlisted 2-of-N parallel verifier for critical Solana reads — and wire it into the four call sites where a lying or malfunctioning provider could corrupt user-visible trust state (Organic ID grants, vote snapshots, treasury totals, donation confirmations). Ship behind a default-off env flag so disagreement telemetry can be observed before enforcement starts.

**Architecture:** `ConsensusVerifier` wraps the existing `RpcPool` (PR 1) without replacing it. It runs an operation in parallel against every provider the pool knows about, using `Promise.allSettled`, and returns only when ≥ `minProviders` agree under a caller-supplied comparator (default: deep-equal). Disagreement writes an `audit_log` row with both provider payloads and throws `ConsensusError`. When `SOLANA_RPC_CONSENSUS_ENABLED=false` (default), every `verify()` call falls through to `pool.call` on the primary only — identical behavior to today. Callers adopt consensus per the spec's fail-closed / graceful-degrade table.

**Tech Stack:** TypeScript (strict, no `any`), `@solana/web3.js` `Connection`, Vitest, Supabase service client for audit log writes. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-22-rpc-resilience-design.md` §5 (`SOLANA_RPC_CONSENSUS_ENABLED` env flag), §7 (Consensus Verifier — full), §10 (Observability — audit + metrics), §11 (Testing), §12 step 3 (Migration).

**Scope — in:**
- Create: `src/lib/solana/rpc-consensus.ts` (`ConsensusVerifier` class, `ConsensusError`, comparator helpers).
- Create: `src/lib/solana/__tests__/rpc-consensus.test.ts` (unit coverage).
- Modify: `src/lib/solana/rpc-live.ts` — factory wiring (`__getConsensus()` analogous to `__getPool()`), pass through to critical-read helpers.
- Modify: `src/lib/solana/index.ts` — surface `getSolanaConsensus()` if it makes the call sites cleaner; otherwise keep internal.
- Modify: `src/app/api/organic-id/assign/route.ts:78` — wrap `isOrgHolder(profile.wallet_pubkey, { skipCache: true })` in consensus (fail closed).
- Modify: `src/app/api/proposals/[id]/start-voting/route.ts:157` — wrap `getSolanaRpc().getAllTokenHolders()` in consensus (fail closed, block proposal start on disagreement).
- Modify: `src/app/api/treasury/route.ts` — wrap `connection.getBalance(pubkey)` in consensus (graceful-degrade with `{ stale: true }` on disagreement).
- Modify: `src/features/donations/verification.ts` — wrap `connection.getParsedTransaction(...)` in consensus, compare `{ slot, status }` only (fail closed, donation stays pending).
- Create: `tests/security/solana-consensus.test.ts` (per-shape disagreement coverage).
- Modify: `.env.local.example` — add `SOLANA_RPC_CONSENSUS_ENABLED=false` with inline comment.

**Scope — out (deferred):**
- Browser proxy routes (`/api/solana/*`) — PR 4.
- Domain-restricting `NEXT_PUBLIC_SOLANA_RPC_URL` / removing server-side legacy read — PR 5.
- Retry-on-disagreement (spec §7: "No retry on disagreement — disagreement is a signal, not noise").
- 3-of-N / weighted schemes (spec §1 non-goal: 2-of-N with `minProviders: 2` is sufficient).
- Admin UI for `RpcPool.getHealth()` / consensus disagreement history — spec §14 follow-up.
- Updating `SolanaRpc` interface (`src/lib/solana/rpc.ts`) — consensus is an orthogonal wrapper, not a new transport method. Keep the interface stable.

**Known spec drift to reconcile inside this PR:**
- Spec §2 lists `src/app/api/auth/link-wallet/route.ts` as the Organic ID grant call site. The actual call is at `src/app/api/organic-id/assign/route.ts:78`. Plan treats `organic-id/assign` as authoritative; patch the spec in a separate follow-up commit on the spec doc if the spec reviewer asks.
- Spec §7 critical-read table also lists `src/features/voting/*` (directory-scoped). The concrete call is at `src/app/api/proposals/[id]/start-voting/route.ts:157`. Same treatment.

**Hard constraints:**
1. **Revertable by env.** Setting `SOLANA_RPC_CONSENSUS_ENABLED=false` (the default) must make every `verify()` call behave exactly like `pool.call` on the primary — same latency profile, same error surface. This is the rollout safety net: land the code merged-but-disabled, enable in dev/preview, observe, then enable in prod.
2. **Fixture + pool kill-switches preserved.** `SOLANA_RPC_MODE=fixture` bypasses consensus entirely (fixture returns whatever it returns). `SOLANA_RPC_POOL_DISABLED=true` bypasses pool AND consensus (legacy direct-Connection path).
3. **Single provider ⇒ no consensus.** If `parseProvidersFromEnv()` returns only one provider (legacy single-primary case from PR 2's transitional fallback), `verify()` must not throw `InsufficientProviders`; it should degrade to `pool.call` with a WARN log noting consensus was skipped. Otherwise we'd break deployments that haven't set `SOLANA_RPC_SECONDARY_URL` yet.
4. **Audit log write never blocks the main response path.** If the audit insert fails (Supabase outage), log at ERROR and proceed with the throw — do NOT swallow `ConsensusError` because audit failed.
5. **TypeScript strict, no `any`.** Generics on `verify<T>()`. Use `unknown` for comparator inputs where appropriate.
6. **No DB migration.** Use the existing `audit_log` table (confirm schema in Task 1's pre-flight).
7. **Tests required per CLAUDE.md.** Unit + security tests per spec §11. Per-shape disagreement (bool, lamports integer, holder set, tx confirmation).

**Execution order:** Sequential. Task 1 lays the verifier; Tasks 2-5 wire it in call-site by call-site (one commit each, so any single wiring can be reverted in isolation); Task 6 adds security tests; Task 7 docs the env flag; Task 8 verifies and opens the PR.

**Pre-flight (once, before Task 1):**

Confirm base state:

```bash
git switch main && git pull --ff-only
# PR 2 should be merged before starting PR 3; if not, rebase on phase/rpc-pool-env-providers.
git switch -c phase/rpc-consensus-verifier
npx vitest run src/lib/solana/__tests__/ tests/security/
```

Expected: existing PR 1 + PR 2 tests green.

Confirm `audit_log` schema supports a free-form payload column:

```bash
grep -rn "audit_log" supabase/migrations/ | head -20
```

Expected: a table with at minimum `id`, `event`, `payload jsonb`, `created_at`, and something identifying the actor (user id, wallet, or null for system events). If the payload column is narrower than `jsonb`, Task 1 adds a small migration.

---

## Task 1: ConsensusVerifier class + comparator helpers

**Why this exists:** Everything else depends on the class. Ship it standalone with comparator primitives, then wire call sites.

**Files:**
- Create: `src/lib/solana/rpc-consensus.ts`
- Create: `src/lib/solana/__tests__/rpc-consensus.test.ts`

**Public API (from spec §7):**

```typescript
export class ConsensusError extends Error {
  constructor(
    message: string,
    readonly label: string,
    readonly results: Array<{ provider: string; ok: boolean; value?: unknown; error?: unknown }>,
  ) {
    super(message);
    this.name = 'ConsensusError';
  }
}

export interface ConsensusVerifyOptions<T> {
  label: string;
  compare?: (a: T, b: T) => boolean;
  minProviders?: number; // default: 2
  timeoutMs?: number;    // default: 10_000
}

export class ConsensusVerifier {
  constructor(
    private readonly providers: ReadonlyArray<RpcProvider>,
    private readonly pool: RpcPool,
    private readonly deps: { auditLog: AuditLogWriter; now?: () => number } = { auditLog: defaultAuditLogWriter },
  ) {}

  async verify<T>(
    operation: (connection: Connection) => Promise<T>,
    opts: ConsensusVerifyOptions<T>,
  ): Promise<T>;
}
```

**Behavior contract:**

1. When `SOLANA_RPC_CONSENSUS_ENABLED !== 'true'` → delegate to `this.pool.call(operation, { label, timeoutMs })`. Read the env inside `verify()` so a process-lifetime rollout flip takes effect on next call, not on next boot.
2. When consensus enabled AND `providers.length < minProviders` (default 2) → WARN log, delegate to `this.pool.call`. Do NOT throw.
3. When consensus enabled AND `providers.length ≥ minProviders`:
   - `Promise.allSettled` across every provider with its own `withTimeout(op, timeoutMs)` wrapper (share `withTimeout` with `rpc-pool.ts`; either re-export from there or move to a small shared `rpc-timing.ts`).
   - Do NOT trip circuit breakers inside consensus — the pool handles that on its own calls. Consensus is a read-side verifier; its job is detection, not health tracking.
   - Count successes. If successes < `minProviders` → throw `ConsensusError('insufficient providers responded', label, results)`.
   - Apply `compare(a, b)` pairwise across successful results. If any pair disagrees → `ConsensusError('consensus disagreement', label, results)`.
   - On disagreement, write an audit_log row (see step 4) BEFORE throwing.
   - If all successes agree → return the first successful value.

4. **Audit log write (on disagreement):**

```typescript
interface AuditLogWriter {
  write(row: {
    event: 'rpc.consensus_disagreement';
    label: string;
    payload: {
      providers: Array<{ name: string; ok: boolean; value?: unknown; error?: string }>;
      capturedAt: string;
    };
  }): Promise<void>;
}
```

Implement `defaultAuditLogWriter` in a sibling module that uses the Supabase service client. Wrap its call in `try/catch` inside `verify()` — if the audit write fails, log at ERROR and continue to the throw.

**Comparator helpers to export:**

- `compareBoolean: (a: boolean, b: boolean) => boolean` → `a === b`.
- `compareLamports: (a: bigint | number, b: bigint | number) => boolean` → coerce to `bigint`, compare exactly.
- `compareHolderSet: (a: TokenHolder[], b: TokenHolder[]) => boolean` → normalize (sort by address, sum balances per owner — same dedup as `holder-analysis.ts`), stringify, equal.
- `compareTxConfirmation: (a: {slot: number; status: string} | null, b: ...) => boolean` → both null → true; otherwise exact slot match + status ∈ {confirmed, finalized} on both.

Each comparator ships with a unit test covering agree / disagree / edge cases (empty sets, same members different order, null vs defined).

**Test cases for Task 1 (non-exhaustive; write before impl per TDD):**

- Env unset → `verify` delegates to `pool.call` (spy on pool, assert called once, assert op ran against one provider).
- Env `true`, `providers.length < 2` → WARN log, delegate to `pool.call`, no throw.
- Env `true`, 2 providers, both agree → return value, no audit write, no throw.
- Env `true`, 2 providers, disagree (bool) → audit writer called once with expected payload, then `ConsensusError` thrown with `label` and `results`.
- Env `true`, 2 providers, one throws / one succeeds → treated as insufficient (need `minProviders` successes), `ConsensusError` thrown.
- Env `true`, 3 providers, 2 agree + 1 disagrees → ConsensusError (no majority override — any pair disagreement fails the call).
- Env `true`, per-provider timeout → counts as failure, factored into "insufficient successes" path.
- Env `true`, audit writer throws → ERROR log, original `ConsensusError` still propagated (audit failure does not mask the security signal).
- Fixture path: when `providers` array is the fixture single-element array, behaves like "single provider ⇒ degrade to pool.call" (tests must construct providers and pool explicitly; do not import `parseProvidersFromEnv`).

**Steps:**

1. Write failing tests for each of the behaviors above.
2. Run tests → all fail as expected.
3. Implement `ConsensusError`, `ConsensusVerifier`, comparator helpers, `defaultAuditLogWriter`.
4. Run tests → green. Count ≥ 12 specific test cases.
5. Commit: `feat(solana): add ConsensusVerifier with per-shape comparators`.

---

## Task 2: Wire consensus into Organic ID grant (fail-closed)

**File:** `src/app/api/organic-id/assign/route.ts:78`

**Current:**
```typescript
const isHolder = await isOrgHolder(profile.wallet_pubkey, { skipCache: true });
```

**After:**
```typescript
const consensus = __getConsensus();
if (consensus) {
  try {
    isHolder = await consensus.verify(
      (connection) => isOrgHolderUsingConnection(profile.wallet_pubkey, connection),
      { label: 'isOrgHolder', compare: compareBoolean },
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error('Organic ID grant: consensus disagreement', { err, wallet: profile.wallet_pubkey });
      return NextResponse.json(
        { error: 'On-chain verification is temporarily inconsistent. Please retry shortly; persistent failures will be reviewed manually.' },
        { status: 503 },
      );
    }
    throw err;
  }
} else {
  isHolder = await isOrgHolder(profile.wallet_pubkey, { skipCache: true });
}
```

`isOrgHolderUsingConnection` is a thin helper we add to `rpc-live.ts` that accepts a `Connection` argument and runs the SPL token account lookup directly (no pool, no cache — consensus layer wants authoritative fresh reads per spec §9).

**Test:** extend `tests/security/link-wallet-gating.test.ts` (or new `tests/security/organic-id-consensus.test.ts`) with a fixture where two providers disagree on the balance — grant must be rejected with 503, DB row unchanged, no organic_id assigned.

**Commit:** `feat(solana): require consensus on Organic ID holder check`

---

## Task 3: Wire consensus into vote snapshot creation (fail-closed)

**File:** `src/app/api/proposals/[id]/start-voting/route.ts:157`

**Current:**
```typescript
const holders = await getSolanaRpc().getAllTokenHolders();
```

**After:**
```typescript
const consensus = __getConsensus();
let holders: TokenHolder[];
if (consensus) {
  try {
    holders = await consensus.verify(
      (connection) => getAllTokenHoldersUsingConnection(ORG_TOKEN_MINT, connection),
      { label: 'getAllTokenHolders', compare: compareHolderSet, timeoutMs: HEAVY_OP_TIMEOUT_MS },
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error('Vote snapshot: consensus disagreement — proposal start blocked', { err, proposalId: id });
      return NextResponse.json(
        { error: 'On-chain holder snapshot is temporarily inconsistent. An administrator has been notified.' },
        { status: 503 },
      );
    }
    throw err;
  }
} else {
  holders = await getSolanaRpc().getAllTokenHolders();
}
```

`getAllTokenHoldersUsingConnection` is another helper in `rpc-live.ts` (same pattern as Task 2 — run the operation directly on a supplied `Connection`, no pool, no cache).

**Spec hard requirement from §7:** "Fail closed. Proposal close blocked. Admin alert. Manual retry. **Never silently settle.**" — 503 + audit log is the enforcement.

**Test:** `tests/security/voting-snapshot-integrity.test.ts` (existing) gets a disagreement case added: two providers return different holder sets → proposal status stays `draft`, no `voting_snapshot` row inserted, alert surfaced in audit log.

**Commit:** `feat(solana): require consensus on vote snapshot holder list`

---

## Task 4: Wire consensus into treasury balance (graceful-degrade)

**File:** `src/app/api/treasury/route.ts` (primary balance read around line 140)

**Current:**
```typescript
const connection = getConnection();
// ...
await connection.getBalance(pubkey),
```

**After:** route it through consensus, but on `ConsensusError`, fall back to last-known-good cached value with `{ stale: true }` flag surfaced in the response — per spec §7, treasury is the only graceful-degrade call site.

Sketch:

```typescript
const consensus = __getConsensus();
let balance: number;
let stale = false;
try {
  balance = consensus
    ? await consensus.verify(
        (connection) => connection.getBalance(pubkey),
        { label: 'treasury.getBalance', compare: compareLamports },
      )
    : await getConnection().getBalance(pubkey);
} catch (err) {
  if (err instanceof ConsensusError) {
    const cached = await readCachedTreasuryBalance();
    if (cached) {
      balance = cached.balance;
      stale = true;
    } else {
      throw err;
    }
  } else {
    throw err;
  }
}
// ...
return NextResponse.json({ data: { balance, stale } });
```

`readCachedTreasuryBalance()` is a new helper — either a tiny in-memory LRU (simplest) or a Supabase-backed last-known-good table (if one exists for treasury snapshots; spec doesn't mandate persistent cache, in-memory is sufficient for this PR).

**Frontend surface:** the treasury route caller already renders a number; surfacing `stale` is UI work — **defer the UI stale-badge to a separate follow-up issue**. PR 3 ships the API flag; the UI ignores it for now. Document this in the PR description.

**Test:** integration test on `src/app/api/treasury/__tests__/route.test.ts` (create if absent): disagreement → response includes `stale: true`, value equals the last cached reading.

**Commit:** `feat(solana): consensus-check treasury balance with stale-flag fallback`

---

## Task 5: Wire consensus into donation verification (fail-closed)

**File:** `src/features/donations/verification.ts:32`

**Current:**
```typescript
const connection = getConnection();
const tx = await connection.getParsedTransaction(txSignature, {
  maxSupportedTransactionVersion: 0,
  commitment: 'finalized',
});
```

**After:** consensus on `{ slot, status }` only (spec §7: "Ignore per-provider metadata fields"). The parsed-instruction decoding still runs once, on the consensus-winning provider's response.

```typescript
const consensus = __getConsensus();
const tx = consensus
  ? await consensus.verify(
      async (connection) => connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'finalized',
      }),
      { label: 'donation.getParsedTransaction', compare: compareTxConfirmation },
    )
  : await getConnection().getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'finalized',
    });
```

The existing catch block already handles errors. Extend it to detect `ConsensusError` and return a distinct result:

```typescript
catch (error) {
  if (error instanceof ConsensusError) {
    return { verified: false, error: 'Transaction confirmation is inconsistent across providers — leaving pending' };
  }
  // existing handling...
}
```

Caller UI surfaces the pending state (donation stays uncredited until the user retries and consensus clears).

**Test:** `tests/security/donation-verification.test.ts` (or create) — disagreement on tx `{slot}` → donation row stays pending, no points granted, no wallet credited.

**Commit:** `feat(solana): require consensus on donation tx confirmation`

---

## Task 6: Security tests (per-shape disagreement)

**File:** Create `tests/security/solana-consensus.test.ts`.

Cover the four critical-read call sites end-to-end using `FixtureSolanaRpc` extended with per-provider scripted responses (spec §11: "FixtureSolanaRpc extended to support per-provider scripted responses"). If the fixture doesn't yet support per-provider scripting, add that support here.

Matrix:

| # | Call site | Disagreement shape | Expected behavior |
|---|---|---|---|
| 1 | organic-id assign | bool: primary says holder, secondary says not | 503 returned, no organic_id assigned, `audit_log` row written |
| 2 | start-voting | holder set: different member lists | 503 returned, proposal status unchanged, no snapshot row |
| 3 | treasury | lamports: 100 vs 200 | response 200 with `stale: true`, value matches last cache |
| 4 | donation verify | tx `{slot}`: 100 vs 101 | `{verified: false, error: /inconsistent/}`, no credit applied |

Each case asserts: audit row payload shape (both provider values present), no DB mutation to protected tables, telemetry counter incremented (mock `metrics.increment` if present).

**Commit:** `test(solana): end-to-end consensus disagreement security coverage`

---

## Task 7: Document env flag + update .env.local.example

Append to the Solana section of `.env.local.example`:

```env
# Solana — Consensus verifier for critical reads.
# Off by default during rollout. Enable per-env after observing that baseline
# disagreement rate is zero (see docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §12).
SOLANA_RPC_CONSENSUS_ENABLED=false
```

**Commit:** `docs(env): document SOLANA_RPC_CONSENSUS_ENABLED`

---

## Task 8: Verify, push, open PR

- `npx vitest run src/lib/solana/__tests__/ tests/security/` — all green, no skips added.
- `npm run lint` — zero warnings.
- `npm run build` — no type errors.
- `git push -u origin phase/rpc-consensus-verifier`
- `gh pr create` with body:
  - Summary: consensus wired on all four critical paths, default-off.
  - Why: spec §7 + §12 step 3.
  - Revert plan: `SOLANA_RPC_CONSENSUS_ENABLED=false` restores current behavior. Code-level revert also safe.
  - Test plan: build, lint, vitest, manual disagreement smoke (inject a fixture secondary URL, confirm audit row fires once and no mutation leaks).
  - Follow-ups: treasury UI `stale` badge (separate issue), spec `§2`/`§7` call-site path corrections.

---

## Self-review checklist (run before closing out PR 3)

1. **Spec §7 coverage:** all four allowlist entries wired with their spec-mandated failure mode? ✔ Organic ID (fail closed) + Vote snapshot (fail closed + admin alert) + Treasury (stale flag) + Donation (pending).
2. **Env-flag default-off semantics:** `SOLANA_RPC_CONSENSUS_ENABLED=false` → zero observable behavior change vs PR 2? Tested in Task 1.
3. **Single-provider degrade:** confirmed we don't break environments that haven't set `SOLANA_RPC_SECONDARY_URL`? Tested in Task 1.
4. **Audit log writes never mask `ConsensusError`?** Tested in Task 1.
5. **No retry-on-disagreement?** Confirmed absent from implementation (spec §7 rule).
6. **No SolanaRpc interface churn?** `src/lib/solana/rpc.ts` unchanged.
7. **Fixture mode unchanged?** No `if (fixtureMode)` branches added inside the verifier — the fixture is chosen upstream by `getSolanaRpc()` and consensus is never constructed when fixture is active.
8. **Spec drift noted?** PR body mentions the `link-wallet` → `organic-id/assign` and `voting/*` → `start-voting/route.ts` path corrections and proposes spec patch.
