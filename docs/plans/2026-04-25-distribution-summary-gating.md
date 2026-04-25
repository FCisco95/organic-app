# Distribution Summary Gating — Code/Doc Mismatch

**Created:** 2026-04-25
**Type:** New punch-list item — small scope, brainstorm-worthy
**Severity:** S2 — wording mismatch, no functional regression today
**Owner:** TBD
**Discovered during:** Pulse PR #63 verification, see `2026-04-25-pulse-analytics-no-repro.md`

---

## The mismatch

[PR #63](https://github.com/FCisco95/organic-app/pull/63) describes the Distribution Summary block as:

> Added an always-on deterministic distribution summary block (no LLM) reading from the existing metrics, with a `fetchedAt` indicator so staleness is visible.

But the merged code at `src/components/analytics/token-analytics.tsx:257` and `:295` gates the summary block (and the concentration bars and the distribution tiers) behind:

```tsx
{holders && !isLoading && (
  <DistributionSummary holders={holders} fetchedAt={...} />
)}
```

So when `holders === null` — which is exactly what happens today in prod due to the missing Solana RPC env vars (`docs/plans/2026-04-25-rpc-env-vars-prod.md`) — the summary collapses entirely along with the bars and tiers. The user sees nothing instead of a degraded summary.

This is a doc/code mismatch, not a bug per se. But it is a real product-shape question: when the holder pipeline is unavailable, what should `/pulse` show?

## Decision needed

Pick one. Do not pick "both, eventually" — that's churn.

### Option A — keep current code (gated)

- `holders === null` → render nothing for the holder UI block.
- Update PR #63's reasoning record (or this plan) to reflect intent.
- Pros: simplest, no extra code paths, no risk of misleading users with empty/zero holder figures.
- Cons: when RPC is degraded the page looks under-built; users don't know whether the data is missing or whether the token has no holders.

### Option B — render degraded summary (true to PR #63 description)

- `holders === null` → render the summary block with a clear `Holder data unavailable` indicator and the `fetchedAt` of the market pull, hiding the bars and tiers.
- Pros: matches PR #63's stated intent; gives users a signal that data is missing rather than absent.
- Cons: extra UI state to design, localize (en / pt-PT / zh-CN), and test. Risk of reading like a partial outage banner if styled too loud.

### Option C — render skeleton + retry hint (middle ground)

- `holders === null` → render a one-line "Holder distribution temporarily unavailable" hint where the bars would be.
- Smaller blast radius than Option B; bigger than Option A.

## Recommended path (subject to brainstorm)

**Option C** when RPC is degraded; **gate everything else** as today. The signal is honest, the design surface is small, and it does not require reshaping the summary component to read from market data instead of holder data.

## Tasks if Option C wins

- Localized string keys for "Holder distribution temporarily unavailable" (en, pt-PT, zh-CN).
- Conditional render in `src/components/analytics/token-analytics.tsx:257` — show hint when `holders === null && !isLoading`, hide entirely while loading.
- Visual regression screenshots at 320 / 768 / 1440 widths.
- One vitest for the hint render path.

## Out of scope

- Fixing the upstream RPC env vars — that's `2026-04-25-rpc-env-vars-prod.md`.
- Reshaping the summary component to be holder-independent — that's a different feature (would require recomputing distribution from concentrated-holder estimates, which requires holder data to begin with, so it doesn't actually help).
- Schema, RLS, or auth changes.

## Verification

- Force the holder-null path in dev (mock or temporarily unset RPC vars locally).
- Confirm the chosen render path matches the decision.
- Confirm no regression when holders is non-null.
- Lint, vitest, build all green.
