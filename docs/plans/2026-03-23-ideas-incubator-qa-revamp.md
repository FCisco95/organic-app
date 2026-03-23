# QA Revamp Plan: 4.19 Ideas Incubator

**Section:** 4.19 Ideas Incubator
**Date:** 2026-03-23
**Status:** PLANNED
**Severity:** S2
**Cases:** 15/15 tested, 15 PASS/PARTIAL

---

## Test Results Summary

All 15 test cases passed functionally. No S0/S1 blockers. Two S2 issues found:

| Case | Verdict | Notes |
|------|---------|-------|
| IDEA-01 | PASS S3 | Feed loads with all elements |
| IDEA-02 | PASS S3 | Create + validation work |
| IDEA-03 | PASS S3 | Organic ID gate works |
| IDEA-04 | PASS S3 | Vote toggle idempotent |
| IDEA-05 | PASS S3 | Self-vote blocked with toast |
| IDEA-06 | PASS S3 | Comment create + empty reject |
| IDEA-07 | PASS S3 | Detail renders correctly |
| IDEA-08 | PASS S3 | Auth/permission checks work |
| IDEA-09 | PASS S3 | Admin/council moderation works |
| IDEA-10 | PASS S3 | Feature flag fallback works |
| IDEA-11 | PASS S3 | API fails safely |
| IDEA-12 | PARTIAL S2 | Mobile works but UX needs polish |
| IDEA-13 | PASS S3 | Promote to proposal works |
| IDEA-14 | PASS S3 | Cycle winner endpoint works |
| IDEA-15 | PASS S3 | Source idea badge on proposal |

---

## Functional Fixes (for qa-fixer)

### FIX-1: Admin/council composer shows "You need an Organic ID" (S2)

**Problem:** On the Ideas feed page, the admin session (organic_id = 900001) sees "You need an Organic ID to post and interact with ideas" in the composer sidebar. The `canCreate = Boolean(profile?.organic_id)` check returns false despite the user having an organic_id visible in the header.

**Root cause candidates:**
1. `useAuth().profile` doesn't include `organic_id` in its SELECT query
2. Auth context loads asynchronously — initial render shows the blocked state, then flashes to the form after profile loads (but on admin it never resolves)
3. QA admin profile row has `organic_id = NULL` in the database despite qa-accounts.md saying 900001

**Files to investigate:**
- `src/features/auth/context.tsx` — check what fields `profile` includes
- `src/app/[locale]/ideas/page.tsx:31` — `canCreate = Boolean(profile?.organic_id)`

**Fix:** Ensure `useAuth().profile` includes `organic_id` in its query. If it's a race condition, add a loading check before rendering the blocked state.

### FIX-2: KPI strip flashes all zeros before data loads (S2)

**Problem:** On initial page load, all 4 KPI cards show "0" / "0%" before the `useIdeasKpis` query resolves. No skeleton loading state for KPIs.

**Files:**
- `src/app/[locale]/ideas/page.tsx:102-107` — KPI grid renders `kpisQuery.data?.total_ideas ?? 0`

**Fix:** Show skeleton placeholders when `kpisQuery.isLoading` instead of falling through to `?? 0`.

---

## Visual/UX Direction (for prototype-executor)

The Ideas Incubator is the last unrevamped section. It currently has generic "vibecoded" UI — white cards with basic borders, no visual personality, minimal interaction feedback. Every other section has been through the full revamp pipeline with benchmark-driven prototypes.

### Benchmark References

| Pattern | Best-in-class | Apply to |
|---------|--------------|----------|
| Idea feed | **Reddit** — compact cards with vote rail, **ProductHunt** — daily launches with upvote counts and maker info | Feed list |
| KPI dashboard | **Stripe Dashboard** — stat cards with sparklines and trend indicators | KPI strip |
| Idea composer | **Notion** — inline creation, slash commands, rich preview | Composer sidebar |
| Detail view | **Linear** — side panel with activity timeline, metadata sidebar | Idea detail |
| Empty state | **Linear** — illustration + CTA + explanation | Empty feed |
| Vote interaction | **ProductHunt** — animated upvote with count, optimistic update | Vote buttons |
| Discussion | **GitHub Issues** — timeline comments with avatars, reactions | Comments |
| Status/badges | **Linear** — color-coded status pills with icons | Status, promoted badge |

### Key UX Gaps

1. **Feed cards are flat and generic** — No visual hierarchy between title/body/metadata. No author avatars. No status badges (open/promoted). No hover states or transitions. Compare to ProductHunt's launch cards with maker photos, taglines, and animated upvote.

2. **Vote rail lacks personality** — Plain ThumbsUp/Down icons with no animation, no color transition on state change (only background color swap). ProductHunt's upvote has a satisfying micro-animation and count increment.

3. **KPI strip is bare** — 4 identical white boxes with numbers. No icons, no trend indicators, no color coding. Stripe's dashboard cards have sparkline charts, trend arrows (up/down), and contextual colors.

4. **Composer sidebar is minimal** — Plain text inputs with no character counter, no markdown preview, no rich text hints. Notion's composer has placeholder suggestions, formatting toolbar, and live preview.

5. **Detail page layout is generic** — Vote rail as a separate card above content on mobile wastes vertical space. Linear's side panel approach or Reddit's inline vote rail would be more space-efficient.

6. **Empty state is a single text line** — "No ideas yet" in a bordered box. Linear shows an illustration + "Share your first idea" CTA with encouraging copy.

7. **No loading skeletons** — Feed shows 3 gray pulse rectangles; KPIs show 0. Both should match the final layout shape.

8. **Comment section is plain** — No avatars, no timestamp formatting (raw `toLocaleString`), no reactions, no threading. GitHub Issues has rich comment cards with user avatars, relative timestamps, and reaction emojis.

9. **Mobile: composer below fold** — On mobile the composer sidebar stacks below the feed, requiring long scroll. Consider a floating "+" FAB or sticky bottom composer bar.

10. **No page title** — Browser tab shows generic "Organic App" instead of "Ideas | Organic".

### Prototype Directions

**Proto A — ProductHunt/Reddit hybrid:** Upvote-centric feed with author avatars, animated vote interactions, category tags, daily/weekly time grouping. Hero replaced with compact stat bar. Composer as modal triggered by prominent "Share Idea" CTA.

**Proto B — Linear/Notion minimal:** Clean table-like feed with inline status pills, keyboard navigation, command palette integration. Side panel detail (no page navigation). Notion-style composer with markdown support. Monochrome with accent color.

**Proto C — Stripe/Vercel dashboard:** Data-forward design with sparkline KPIs, filterable feed with status facets, card-based detail with activity timeline. Promote action as a prominent admin workflow step. Dark header gradient.

### Component Files to Modify

- `src/app/[locale]/ideas/page.tsx` — Feed page (full rewrite)
- `src/app/[locale]/ideas/[id]/page.tsx` — Detail page (full rewrite)
- New: `src/components/ideas/` — Extract reusable components (IdeaCard, VoteRail, IdeaComposer, KpiStrip, etc.)

### i18n Keys

All existing keys in `Ideas` and `IdeaDetail` namespaces. New keys needed for any added UI elements (FAB labels, skeleton aria labels, etc.).

---

## Execution Order

1. **qa-fixer** — Fix FIX-1 (auth context) and FIX-2 (KPI skeletons)
2. `/clear`
3. **prototype-executor** — Build 3 prototypes, user comparison, merge winner
