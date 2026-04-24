# Pulse Analytics Fixes

**Created:** 2026-04-21
**Branch:** `fix/app-audit-iter1` (or spin `fix/pulse-analytics` off main)
**Status:** Planned — not implemented
**Owner:** TBD

---

## Goal

Restore correctness and completeness of the Pulse (analytics) page. Three visible issues reported by the user:

1. Market cap is ~$100k off from live truth (e.g., showing `$800K` when real value is closer to `$900K`).
2. Top-10 / top-50 / whale concentration bars are not filling up — the `<ConcentrationBar>` visual is stuck empty or clipped.
3. The "healthy token distribution" AI resume / summary is not rendering.
4. (Verify) 1h volume value matches live data.

## Context

Page: `src/app/[locale]/pulse/page.tsx`
Component: `src/components/analytics/token-analytics.tsx`
Data hook: `src/features/analytics/hooks.ts` → `useMarketAnalytics`
API route: `src/app/api/analytics/market/route.ts`
Data providers:
- `src/features/market-data/server/dexscreener.ts` (price, marketCap, fdv, volume, liquidity, txns)
- `src/features/market-data/server/holder-analysis.ts` (concentration, tiers)

The API caches 120s (`s-maxage=120, stale-while-revalidate=300`). React Query also `staleTime: 120_000, refetchInterval: 120_000`.

The "healthy distribution" callout is conditional: only renders when `holders.whaleCount <= 5`. The user's memory of an "AI resume" suggests either (a) this callout is the feature and is simply hidden because the whale threshold isn't met, or (b) a separate AI-generated summary component exists that was planned but isn't rendering.

## Plan

1. **Diagnose market cap delta (diagnostic-first, no changes yet)**
   - Fetch `/api/analytics/market` in prod and compare against DexScreener web UI for the same pair/token.
   - Confirm which `best` pair is being chosen in `dexscreener.ts` (liquidity-ordered? quote-token filtered?). If it picks a low-liquidity pair, price × supply comes out wrong.
   - Compare `market.marketCap` vs `market.fdv`. DexScreener `marketCap` = circulating supply × price; `fdv` = total supply × price. Confirm which matches the user's expected figure. Decide whether Pulse should display `marketCap` or `fdv` (or both, labeled).
   - Log to `logger` the chosen pair metadata (dexId, pairAddress, liquidity) for observability.
   - **Files:** `src/features/market-data/server/dexscreener.ts` (pair-selection logic and response mapping, around lines 100–115).

2. **Fix concentration bar fill**
   - Inspect `ConcentrationBar` in `src/components/analytics/token-analytics.tsx` (lines 57–89). The `style={{ width: \`${Math.min(value, 100)}%\` }}` is correct; the likely issues:
     - (a) Tailwind class `bg-organic-terracotta-lightest0` (line 269) looks malformed — `-lightest0` is not a valid token; this would produce no background color and thus invisible fill.
     - (b) `value` arriving as `NaN` or `0` from `holder-analysis.ts` when the on-chain RPC fails.
   - **Fix (a)** — replace `bg-organic-terracotta-lightest0` with the correct design token (likely `bg-organic-terracotta` or `bg-organic-terracotta/70`). Cross-check `tailwind.config.ts` / `src/app/[locale]/globals.css` for the actual token names.
   - **Fix (b)** — surface a skeleton/empty state when `holders` is missing rather than rendering bars at `0%` with no explanation.

3. **Restore / add AI summary**
   - Verify whether an "AI resume" component was shipped. Grep for `aiSummary`, `TokenAISummary`, `distributionSummary` under `src/components/analytics` and `src/features`. If present but not mounted, re-add it to `pulse/page.tsx` under `<TokenAnalytics />`.
   - If missing, add a lightweight summary block that reads from `holders` and composes a 1–2 sentence narrative (e.g., *"Top 10 wallets hold 42% of supply. Distribution is healthy — no whale over 1%."*). Localize strings in `messages/{en,zh}.json` under `Analytics.holders.summary.*`.
   - If the user intended a true AI-generated summary, scope separately (needs an LLM call, caching, and cost guardrails). Default in this plan: **deterministic narrative from existing metrics**, no LLM.

4. **Verify 1h volume**
   - Read `volume1h` mapping in `dexscreener.ts`. DexScreener API surfaces `volume.h1` for 1h window. Confirm correct field.
   - Compare live DexScreener pair page value vs displayed value for 30 min.

5. **Observability**
   - Add structured logs in `analytics/market/route.ts` for: chosen pair id, marketCap vs fdv, holder RPC latency. Redact nothing — values are public on-chain.

## Files to touch

- `src/features/market-data/server/dexscreener.ts` — pair-selection, marketCap/fdv field choice
- `src/components/analytics/token-analytics.tsx` — bar color class fix, AI summary mount
- `src/features/market-data/server/holder-analysis.ts` — handle RPC failure / null returns explicitly
- `src/app/api/analytics/market/route.ts` — structured logging
- `messages/en.json`, `messages/zh.json` — summary strings
- (optional) new `src/components/analytics/distribution-summary.tsx` for the deterministic summary

## Tests

- `tests/market-data/dexscreener.test.ts` — unit test pair-selection with multi-pair fixture (asserts highest-liquidity USDC pair is chosen, correct mapping of marketCap/fdv/volume fields).
- `tests/components/token-analytics.test.tsx` — renders concentration bars with non-zero width when `value > 0`; renders skeleton when `holders === null`.
- Screenshot test (Playwright headed) at `/en/pulse` — verify all 6 KPIs render and bars have visible fill.

## Verification

**Commands:**
```bash
npm run lint
npx vitest run tests/market-data/ tests/components/token-analytics.test.tsx
npm run build
```

**Manual checks:**
1. Load `/en/pulse` in prod-like env. Compare market cap, 1h volume, 24h volume against DexScreener web UI for the same pair. Delta should be < 1%.
2. Visually confirm all three concentration bars show colored fill proportional to the percentage label.
3. Confirm either the healthy-distribution callout OR a deterministic summary block renders.
4. Open browser dev tools → Network → `/api/analytics/market` — response includes non-null `marketCap`, `holders.top10Concentration`, `holders.tiers[]`.

## Risks

- **DexScreener rate limits** — verify we are still within free-tier bounds after any refetch-interval changes. Keep 120s cache.
- **Pair selection regression** — if we change which pair is "best", users may see a price move. Document the choice in a code comment.
- **i18n** — adding new strings requires updates to both `en.json` and `zh.json`; untranslated keys break Chinese users.
- **Not auth/wallet/RLS touching** — safe to proceed without gating.

---

## Execution note

Run **diagnostic step 1** first (read-only). Decide based on findings whether the fix is (a) change which field is displayed, (b) change which pair is picked, or (c) the data source itself is wrong and we need to add a fallback (Birdeye / Jupiter).
