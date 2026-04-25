# Solana RPC Env Vars Missing in Vercel Production

**Created:** 2026-04-25
**Type:** New punch-list item — config (shared-state, requires user)
**Severity:** S1 — visible degradation on `/en/pulse` (no holder distribution UI), no data corruption
**Owner:** Cisco (Vercel access required; Claude must not touch env vars)
**Discovered during:** Pulse PR #63 verification, see `2026-04-25-pulse-analytics-no-repro.md`

---

## Symptom

`/en/pulse` on production renders the market strip but no holder distribution UI:

- Distribution Summary block does not render
- Top-1 / Top-5 / Top-10 concentration bars do not render
- Distribution tiers do not render

API behavior:

- `GET /api/analytics/market` returns `holders: null` on every call
- `GET /api/solana/holder-count` returns `{ count: 0 }`

## Root cause

Production Vercel logs show this error fires on every market analytics request (multiple hits captured across the 12:14Z–12:32Z window on 2026-04-25):

```text
Error: Solana RPC providers are not configured.
Set SOLANA_RPC_PRIMARY_URL (and recommended SOLANA_RPC_SECONDARY_URL).
```

The thrower is `getCirculatingSupply()` and `getAllTokenHolders()` (chunks/922.js bundle). Frontend correctly falls through with `null` holders rather than crashing the page, but `src/components/analytics/token-analytics.tsx:257,295` gates the summary + bars + tiers on `holders && !isLoading`, so they all collapse.

Most likely explanation: env vars never propagated to prod after the RPC resilience series (PRs #72–#75, merged 2026-04-22 to 2026-04-23). Local dev / staging may have them; prod does not. This is a config gap, not a code regression.

Evidence: `docs/plans/assets/2026-04-25-pulse-vercel-logs.txt`.

## Fix (user action — do not delegate to Claude)

1. Vercel dashboard → Project → Settings → Environment Variables → **Production**.
2. Set `SOLANA_RPC_PRIMARY_URL` to the team's primary RPC (Helius / QuickNode / Triton — whichever the RPC resilience series standardized on).
3. Set `SOLANA_RPC_SECONDARY_URL` to a fallback provider for failover behavior added in PR #74.
4. Optionally re-check that any other Solana env vars from the resilience series (rate-limit thresholds, allowed-region flags) are present in prod and match staging.
5. Trigger a fresh deploy (or redeploy latest) so the new env vars are picked up.

**Hard guardrail:** Claude must not read, set, or rotate these env vars. Vercel env work happens at the Vercel dashboard or via the user's local CLI, never in this codebase.

## Verification after fix

Re-run the Pulse verification subagent (same brief as 2026-04-25 Step 1). Expected:

- `holders` is non-null on `/api/analytics/market`
- Distribution Summary block renders on `/en/pulse`
- All three concentration bars render with non-zero fill
- Distribution tiers render
- Vercel prod logs no longer show the "Solana RPC providers are not configured" error

If verification passes, this item is closed. Write a 2026-04-Z follow-up receipt linking back here and update `docs/plans/2026-04-21-execution-order.md`.

## Out of scope

- Code changes to make the route survive missing RPC config gracefully (the route already does — it returns `holders: null` instead of crashing). The UI gating question is tracked separately: `2026-04-25-distribution-summary-gating.md`.
- Schema, RLS, or auth changes.
- Refactor of the RPC client surface (lockdown work shipped in PR #74).
