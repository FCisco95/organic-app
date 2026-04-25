# Pulse Analytics — No-Repro Receipt for PR #63

**Created:** 2026-04-25
**Closes punch-list item:** [#2 Pulse analytics fixes](2026-04-21-pulse-analytics-fixes.md)
**References PR:** [#63 fix(pulse): restore concentration bars + distribution summary](https://github.com/FCisco95/organic-app/pull/63) (merged 2026-04-21)
**Status:** No repro on PR #63's actual scope — closed.

---

## Scope of this receipt

This document closes punch-list item #2 only against **PR #63's stated scope**:

1. DexScreener `fetch()` no longer cached indefinitely by Next.js.
2. Market cap and price match DexScreener within tolerance.
3. Structured logs (`Market analytics GET`, `DexScreener pair selected`) firing with sane values.
4. In-memory TTL behavior (60s) and CDN headers (`s-maxage=60 swr=120`) consistent with the fix.

Everything below is the verification PR #63's own test plan flagged as unchecked at merge time. Each is now verified.

A **separate** Pulse-adjacent failure was observed during this verification (holder distribution UI missing on prod). That symptom has its own root cause (Solana RPC env vars not set in Vercel prod) and is **out of scope** for this receipt. It is tracked as a new punch-list item: see `docs/plans/2026-04-25-rpc-env-vars-prod.md`.

## Verification — 2026-04-25

### Market cap accuracy vs DexScreener

| Source | Price | Market cap | Liquidity |
|---|---|---|---|
| `/api/analytics/market` (organichub.fun) | $0.007505 | $926,660 | $92,757.47 |
| DexScreener API (same pair `FYP5y…KKQ9x`, raydium) | $0.007505 | $926,660 | $92,757.47 |

**Delta: 0.00%.** Well under the 5% threshold.

Evidence: `docs/plans/assets/2026-04-25-pulse-pull-1.json`, `2026-04-25-dexscreener-direct.json`.

### Cache freshness — two-pull check

Two consecutive hits to `/api/analytics/market` ~164 seconds apart:

- Pull 1: `fetchedAt = 2026-04-25T12:29:41.375Z`
- Pull 2: `fetchedAt = 2026-04-25T12:32:25.736Z`

`fetchedAt` advanced. The Next.js fetch-cache regression PR #63 fixed has not returned.

Evidence: `docs/plans/assets/2026-04-25-pulse-pull-1.json`, `2026-04-25-pulse-pull-2.json`.

### Structured logs — PR #63 instrumentation

Pulled from prod Vercel logs in the verification window. Sample entries:

```text
{"level":"info","data":["DexScreener pair selected",{"dexId":"raydium","pairAddress":"FYP5y…KKQ9x","liquidityUsd":92757.47,"marketCap":926660,"fdv":926660,"totalPairs":1}]}
{"level":"info","data":["Market analytics GET",{"durationMs":432,"pairAddress":"FYP5y…KKQ9x","dex":"raydium","marketCap":926660,"fdv":926660,"liquidity":92757.47,"totalHolders":null,"holdersFetchedAt":null}]}
```

`durationMs` across observed requests: **407 / 432 / 652 ms** (target was < 2000ms; all green).

Evidence: `docs/plans/assets/2026-04-25-pulse-vercel-logs.txt`.

### Visual confirmation — top of `/en/pulse`

Market strip renders correctly: Price, MC, 24h Vol, 1h Vol, Liquidity, Txns, "via raydium". Tab styling intact (the second Tailwind typo PR #63 patched).

Evidence: `docs/plans/assets/2026-04-25-pulse-top.png`, `docs/plans/assets/2026-04-25-pulse-fullpage.png`.

## What this receipt does NOT cover

- **Holder distribution rendering** (Distribution Summary, top-1/5/10 concentration bars, distribution tiers): out of scope. The route returns `holders: null` because Vercel prod is missing `SOLANA_RPC_PRIMARY_URL` / `SOLANA_RPC_SECONDARY_URL`. The concentration-bar Tailwind typo PR #63 patched is a separate bug from the holders-null gating; PR #63 is correct on its own scope.
- **PR #63 description vs code**: the description called the Distribution Summary "always-on", but `src/components/analytics/token-analytics.tsx:257,295` gates the summary, bars, and tiers behind `holders && !isLoading`. This wording-vs-code mismatch is tracked separately: `docs/plans/2026-04-25-distribution-summary-gating.md`.

## Conclusion

Punch-list item #2 (Pulse analytics fixes) is closed against PR #63's market-data scope. No regression observed.

Branch `fix/pulse-analytics` was already deleted local + remote at the time of this verification.
