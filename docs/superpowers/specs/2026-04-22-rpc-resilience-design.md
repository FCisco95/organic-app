# Solana RPC Resilience — Design

**Status:** Draft — pending implementation plan
**Date:** 2026-04-22
**Scope:** Replace the single-RPC-URL Solana integration with a multi-provider pool (reliability) plus a narrow consensus-verifier layer (trust on critical reads), without exposing paid RPC keys to the browser.

## 1. Goals & Non-Goals

### Goals
- App does not break when a single RPC provider rate-limits, degrades, or has an outage.
- Critical reads (Organic ID grants, vote snapshots, treasury totals, donation confirmations) cannot be corrupted by a single lying or malfunctioning provider.
- Paid RPC keys are never exposed to the browser.
- Changes deploy in small, independently-revertable steps (crypto-sensitive rollout).
- Interface is stable enough that a future multi-tenant (per-community) extension would parameterize token mint, not re-architect RPC.

### Non-Goals
- On-chain anchoring of vote results or proposal attestations. Deferred to separate spec (Track A — trustless voting).
- Decentralized storage (IPFS / Arweave). Rejected for the current product stage.
- Light-client proof verification. Out of scope.
- 3-of-N or weighted consensus schemes. 2-of-2 is sufficient at current scale.
- Admin UI for provider health. Interface exposed; UI deferred.
- Full multi-tenant RPC isolation (per-community keys, per-tenant rate limits). Deferred.

## 2. Current State

Single `@solana/web3.js` `Connection` cached by URL, initialized from `NEXT_PUBLIC_SOLANA_RPC_URL` (browser-exposed) with fallback to `clusterApiUrl('mainnet-beta')` (public, heavily rate-limited). On RPC failure, code returns stale cache or zero silently.

Existing caches in `src/lib/solana/rpc-live.ts`:
- `tokenBalanceCache` — 15s TTL, per (wallet, mint).
- `tokenHoldersCache` — 5 min TTL, per mint.

Fixture mode exists (`SOLANA_RPC_MODE=fixture` → `FixtureSolanaRpc`), used by tests — preserved unchanged.

Known call sites:
- Server-side: `src/app/api/treasury/route.ts`, `src/features/donations/verification.ts`, `src/app/api/auth/link-wallet/route.ts`, `src/features/market-data/server/holder-analysis.ts`.
- Browser-side: `src/features/auth/wallet-provider.tsx` (wallet adapter), `src/components/profile/profile-wallet-tab.tsx` (balance display).

## 3. Architecture

```
Browser  ──► /api/solana/*  ──► RpcPool  ──► [Primary, Secondary, Fallback]
                                   │
                                   ├─ normal reads: failover, first healthy wins
                                   └─ critical reads: 2-of-N consensus, fail closed

Browser  ──► Wallet Adapter ──► NEXT_PUBLIC_SOLANA_RPC_URL (domain-restricted, wallet-only)
```

Three layers:

1. **Provider pool** (`RpcPool`) — failover, timeouts, circuit breaker, per-provider health tracking. Consumed by all server-side Solana reads.
2. **Consensus verifier** (`ConsensusVerifier`) — calls ≥2 providers in parallel, returns only on agreement. Used on an explicit allowlist of critical reads.
3. **Server proxy routes** (`/api/solana/*`) — browser UI reads route through these. Paid keys never cross the trust boundary.

Wallet adapter keeps a browser-reachable RPC URL (it must, for `signAndSendTransaction`), but that key is domain-restricted and rate-limited per IP — scoped to the same operations any random visitor's wallet could already perform.

## 4. File Layout

```
src/lib/solana/
├── rpc.ts              # existing: SolanaRpc interface (unchanged)
├── providers.ts        # NEW: provider config, env parsing
├── rpc-pool.ts         # NEW: RpcPool — failover, circuit breaker, health
├── rpc-consensus.ts    # NEW: ConsensusVerifier
├── rpc-live.ts         # REWORKED: uses RpcPool
├── rpc-fixture.ts      # unchanged
└── index.ts            # entry point; public exports stable

src/app/api/solana/
├── token-balance/route.ts      # NEW: pool.call, cacheable
├── is-holder/route.ts          # NEW: consensus.verify
├── holder-count/route.ts       # NEW: pool.call, 5-min cache
└── tx-status/route.ts          # NEW: consensus above threshold, pool otherwise

tests/security/
└── solana-rpc-resilience.test.ts  # NEW: consensus + proxy security tests
```

## 5. Environment Variables

### Added
- `SOLANA_RPC_PRIMARY_URL` (required, server-only) — primary paid provider (e.g., Helius w/ API key).
- `SOLANA_RPC_SECONDARY_URL` (optional, strongly recommended, server-only) — secondary paid provider (e.g., QuickNode w/ API key).
- `SOLANA_RPC_FALLBACK_URL` (optional, server-only) — defaults to `https://api.mainnet-beta.solana.com`.
- `SOLANA_RPC_CONSENSUS_ENABLED` (optional, defaults to `false`) — feature flag for consensus verifier. Off initially; turned on after observation period.

### Retained, with changed semantics
- `NEXT_PUBLIC_SOLANA_RPC_URL` — scope narrowed to **wallet adapter only** (transaction signing, blockhash, tx submission). Must be a domain-restricted public key. Not read by any server code after migration.
- `NEXT_PUBLIC_ORG_TOKEN_MINT` — unchanged.
- `SOLANA_RPC_MODE=fixture` — unchanged; fixture mode bypasses pool + consensus.

## 6. Provider Pool

### Config shape (internal)
```typescript
interface RpcProvider {
  name: string;                              // 'primary' | 'secondary' | 'fallback'
  connection: Connection;
  tier: 'primary' | 'secondary' | 'fallback';
  timeoutMs: number;                         // default 5000 ms; 10000 ms for "heavy" ops
}
```

"Heavy" operations are those that scan program accounts or return large arrays — currently only `getAllTokenHolders` / `getParsedProgramAccounts`. Everything else is a "read" op.

### Public API
```typescript
class RpcPool {
  async call<T>(
    operation: (c: Connection) => Promise<T>,
    opts?: { timeoutMs?: number; label?: string }
  ): Promise<T>;

  getHealth(): ProviderHealth[];             // for admin/debug
}
```

### Failover policy
- Try tiers in order: primary → secondary → fallback.
- Retry each provider **once** on transient failure.
- Total max attempts: 6 (3 providers × 2 retries). Overall call timeout cap: `timeoutMs × 3`.
- On exhaustion: throw; caller decides whether to return stale cache or propagate error.

### Error classification
```
transient   → retry/failover:  network timeout, ECONN*, HTTP 429, HTTP 5xx,
                               JSON-RPC -32005 (rate limit), -32603 (internal)
permanent   → bubble up:       HTTP 4xx (except 429), signature errors,
                               malformed request, -32602 (invalid params)
empty-ok    → bubble up:       account-not-found, balance=0 — real answers, not failures
```

### Circuit breaker (per provider)
- Rolling 60-second window of outcomes.
- Open after: >50% failures in the last 20+ calls.
- Open state: skip this provider; fall through to next tier.
- Half-open after 30s: single probe call. Success → closed. Failure → open another 30s.
- State transitions logged at WARN.

### Health tracking
- Per-provider: rolling last-100 latency samples, failure count, last error, breaker state, last state transition.
- Exposed via `getHealth()`; consumed by future admin page.

## 7. Consensus Verifier

### Public API
```typescript
class ConsensusVerifier {
  async verify<T>(
    operation: (c: Connection) => Promise<T>,
    opts: {
      label: string;                          // required, for logging
      compare?: (a: T, b: T) => boolean;      // default: deep-equal
      minProviders?: number;                  // default: 2
      timeoutMs?: number;                     // default: 10000
    }
  ): Promise<T>;
}
```

### Critical-read allowlist
| Call site | Operation | Failure behavior |
|---|---|---|
| `src/app/api/auth/link-wallet/route.ts` | `isOrgHolder(wallet)` at Organic ID grant | Fail closed. User retries. Persistent disagreement → manual admin review. |
| `src/features/voting/*` (snapshot creation on proposal close) | `getAllTokenHolders()` | Fail closed. Proposal close blocked. Admin alert. Manual retry. **Never silently settle.** |
| `src/app/api/treasury/route.ts` | Treasury wallet balance | Fall back to last-known-good cached value with `{ stale: true }` flag. UI shows warning badge. |
| `src/features/donations/verification.ts` | Transaction confirmation + amount | Fail closed. Donation marked "pending verification", not credited. UI shows "confirming on-chain…". |

Only operations in this list use consensus. Everything else uses `pool.call` directly.

### Comparison semantics
- `isOrgHolder(wallet)`: boolean exact match.
- `getTokenBalance(wallet)`: integer (lamports) exact match. No float tolerance.
- `getAllTokenHolders()`: compare as set of `(address, balance)` pairs. Normalize before compare — providers may return accounts in different order; deduplicate by owner and sum balances per owner (same normalization `holder-analysis.ts` already applies).
- Transaction confirmation: compare `{ slot, status }` where `status ∈ { confirmed, finalized }`. Ignore per-provider metadata fields.

### Parallelism & timeout
- `Promise.allSettled` across providers — total latency = slowest, not sum.
- Per-provider budget: 10s. Total call budget: 10s (they run in parallel).
- No retry on disagreement — disagreement is a signal, not noise.
- Insufficient providers (< `minProviders` respond): treated same as disagreement — throw `ConsensusError`.

### Feature-flag behavior
- When `SOLANA_RPC_CONSENSUS_ENABLED=false` (default during rollout): consensus verifier falls through to `pool.call` on the primary only, same as any other read.
- When `true`: allowlist call sites use parallel verification.

### On disagreement
- Write a row to `audit_log` with: label, provider names, full result payloads, timestamps, request context (user id, wallet, proposal id, etc. as applicable).
- Throw `ConsensusError` with a machine-readable reason. Callers map to their fail-closed behavior per table above.

## 8. Browser Proxy Routes

All server-backed Solana reads from the browser go through `/api/solana/*`. Each route:

- Validates input with Zod.
- Returns `{ data, error }` envelope per project API rules.
- Rate-limited per IP and per session. Tighter limits for unauthenticated requests.
- Surfaces `{ stale: true }` flag when returning from stale cache after pool exhaustion.

| Route | Method | Path backend |
|---|---|---|
| `/api/solana/token-balance?wallet=...` | GET | `pool.call(connection → getTokenBalance)`, uses existing 15s cache |
| `/api/solana/is-holder?wallet=...` | GET | `consensus.verify` (allowlisted critical read) |
| `/api/solana/holder-count` | GET | `pool.call`, 5-min cache, returns count + optional top-N |
| `/api/solana/tx-status?signature=...` | GET | `consensus.verify` when called from donation verification path (always); `pool.call` for generic status lookups |

Rate-limiting uses the project's existing middleware (confirm in implementation plan; fall back to sliding-window in-memory limiter if none exists).

Input validation via Zod schemas in `src/features/*/schemas.ts` (feature-scoped) or route-local if single-use.

## 9. Caching

- Existing caches (`tokenBalanceCache`, `tokenHoldersCache`) stay and retain their TTLs.
- Consensus reads: **bypass cache on read** (authoritative fresh result required), **populate cache on success** so follow-up non-critical reads benefit.
- Existing `options.skipCache` path preserved for any caller that needs a forced fresh read.
- Stale-ok fallback: if `pool.call` exhausts all providers and the caller has a cached value, return it with `{ stale: true }`. Applies to proxy routes only (feature code that wants strict freshness opts in via `skipCache`).

## 10. Observability

### Structured logs
- Per `pool.call`: `{ label, provider, attempt, latency_ms, outcome }` where `outcome ∈ { ok, transient_error, permanent_error, breaker_open }`.
- Per `consensus.verify`: `{ label, providers, agreed, latencies_ms }`.
- Circuit breaker state transitions: WARN level with `{ provider, from, to, reason }`.

### Audit log (`audit_log` table, existing)
- Every consensus disagreement writes a security incident row with full provider payloads and request context.

### Metrics (counters / gauges — wired through existing project telemetry)
- `rpc.failover_count` (per provider)
- `rpc.circuit_open` (gauge, boolean per provider)
- `rpc.consensus_disagreement_count` (per label)
- `rpc.latency_ms` (histogram, per provider)

### Alerts (define thresholds in implementation, not here)
- Any consensus disagreement → page/notify (rare by design).
- Breaker open > 5 min → notify.

## 11. Testing

### Unit
- `RpcPool` with stubbed providers: failover order, circuit breaker open/half-open/closed transitions, each error-classification path, timeout behavior, attempt budget enforcement.
- `ConsensusVerifier`: agreement, disagreement (each data shape: bool, integer, holder set), insufficient providers, comparison normalization for holder sets, timeout.

### Integration
- Proxy routes with mocked provider endpoints (MSW or nock): input validation, auth enforcement, rate-limit response codes, stale-cache surfacing.

### Security (`tests/security/solana-rpc-resilience.test.ts`)
- Provider returns wrong holder status → consensus throws → no Organic ID granted, no audit rows mutated.
- Provider returns wrong treasury balance → consensus throws → stale value served with `stale: true` flag.
- Provider returns wrong tx confirmation → consensus throws → donation stays pending, not credited.
- Primary + secondary both unavailable → proxy returns stale cache with flag (not a fresh zero).

### Fixture mode
- `FixtureSolanaRpc` extended to support per-provider scripted responses (used by security tests above).

## 12. Migration Plan

Five PRs, each independently deployable and revertable. No big-bang cutover.

1. **PR 1 — Pool foundation.**
   Add `providers.ts`, `rpc-pool.ts`. Rewire `rpc-live.ts` internals to use the pool. Keep `getConnection()` as a thin wrapper on `pool.call` for any external callers. Pool reads the existing `NEXT_PUBLIC_SOLANA_RPC_URL` as its single primary (no env changes yet — this is a transitional state; the "wallet-adapter only" scoping of that env var is enforced in PR 5). Full unit coverage. **Ship and observe ≥ 1 week.**

2. **PR 2 — Secondary + fallback providers.**
   Introduce `SOLANA_RPC_PRIMARY_URL`, `SOLANA_RPC_SECONDARY_URL`, `SOLANA_RPC_FALLBACK_URL`. Pool reads new vars preferentially, falls back to `NEXT_PUBLIC_SOLANA_RPC_URL` if not set (transitional). Set the new vars in prod env. Observe failover logs.

3. **PR 3 — Consensus verifier.**
   Add `rpc-consensus.ts`. Wire the four critical call sites. Ship with `SOLANA_RPC_CONSENSUS_ENABLED=false` in prod; enable in dev/preview first. Observe for disagreements (expected: zero).

4. **PR 4 — Browser proxy routes.**
   Add `/api/solana/*`. Migrate `profile-wallet-tab.tsx` and any other browser reader. Wallet adapter untouched. Ship.

5. **PR 5 — Lockdown.**
   Rotate `NEXT_PUBLIC_SOLANA_RPC_URL` to a domain-restricted wallet-adapter-only key. Remove any residual browser direct-Solana-read code paths. Remove transitional fallback in provider config (drop support for old env var name). Enable `SOLANA_RPC_CONSENSUS_ENABLED=true` in prod.

Each PR has a kill-switch via env vars. Revert is always an env change, not a redeploy.

## 13. Open Questions Resolved During Brainstorm

- **Reliability vs. trustlessness:** pursuing both, scoped. Reliability via pool (every call). Trustlessness via consensus (narrow allowlist only).
- **Three-way vs. two-way consensus:** 2-of-2 (plus `minProviders: 2` enforcement). Simpler, sufficient for current threat model.
- **Provider naming in env vars:** tier-based (`PRIMARY`/`SECONDARY`/`FALLBACK`), not provider-specific — rotating providers is an env change, not a code change.
- **Browser key handling:** wallet adapter keeps a public, domain-restricted RPC URL. Everything else server-proxied.
- **Fail-closed vs. graceful-degrade on critical reads:** fail-closed for grants and vote snapshots; graceful-degrade with `stale` flag for display-only reads (treasury total).

## 14. Follow-ups (not part of this spec)

- Admin UI surfacing `RpcPool.getHealth()`.
- Multi-tenant RPC config (per-community keys). Interface is already parameterizable; no rework needed when we add it.
- On-chain anchoring of vote snapshots (Track A — trustless voting).
- Consider light-client verification for treasury reads once treasury value grows to warrant the engineering cost.
