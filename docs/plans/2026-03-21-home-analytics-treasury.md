# QA Plan: 4.3 Home, Analytics, Leaderboard, Treasury

**Section:** 4.3 | **Date:** 2026-03-21 | **Severity:** S1 | **Cases:** 8/8 tested

---

## Functional Fixes (S1 — for qa-fixer)

### Fix 1: Add missing `Home.trustSprintNoneShort` i18n key

**Bug:** Raw key `Home.trustSprintNoneShort` renders in the Trust Pulse card on the home page when no sprint is active.

**Root cause:** Key is used at `src/app/[locale]/page.tsx:210` but never defined in message files. Related keys (`trustSprintTitle`, `trustSprintNone`, etc.) exist at `messages/en.json:62-77`.

**Files to edit:**
- `messages/en.json` — Add `"trustSprintNoneShort": "No active sprint"` inside `Home` namespace (after line 77)
- `messages/pt-PT.json` — Add `"trustSprintNoneShort": "Sem sprint ativo"` in same location
- `messages/zh-CN.json` — Add `"trustSprintNoneShort": "无活跃冲刺"` in same location

**Verification:** Load home page with no active sprint → Trust Pulse card should show "No active sprint" instead of raw key. Console should have 0 `trustSprintNoneShort` errors.

### Fix 2: Add missing `dashboard.activity.viewAll` i18n key

**Bug:** Raw key `dashboard.activity.viewAll` renders as the "View all" link text at the bottom of the activity feed on the home page.

**Root cause:** `src/components/dashboard/activity-feed.tsx:10` uses `useTranslations('dashboard.activity')` and calls `t('viewAll')` at line 54. The `dashboard.activity` namespace in `messages/en.json:1655-1677` has no `viewAll` key.

**Files to edit:**
- `messages/en.json` — Add `"viewAll": "View all activity →"` inside `dashboard.activity` (after `"empty"` on line 1676)
- `messages/pt-PT.json` — Add `"viewAll": "Ver toda a atividade →"` in same location
- `messages/zh-CN.json` — Add `"viewAll": "查看所有活动 →"` in same location

**Verification:** Load home page with activity feed visible → link at bottom should show "View all activity →" instead of raw key. Link navigates to `/analytics`.

---

## Visual/UX Improvements (S3 — for prototype-executor)

### Improvement 1: $ORG Price/Market Cap empty state copy
**Current:** Shows "—" with no explanation on analytics KPI cards.
**Benchmark:** Stripe uses "Not available" with a tooltip explaining why.
**Change:** Replace "—" with "Coming soon" or "Not available" in KPI cards when no price data exists.
**Files:** `src/components/analytics/kpi-cards.tsx`

### Improvement 2: Mobile analytics scroll fix
**Current:** Analytics page doesn't scroll on mobile until a tab (Overview/Personal/Governance) is clicked.
**Benchmark:** Linear tab panels are always scrollable regardless of focus.
**Change:** Ensure the main content area is scrollable on initial load, not just after tab interaction.
**Files:** `src/app/[locale]/analytics/page.tsx`

### Improvement 3: Home page "Go to Profile → →" double arrow
**Current:** CTA shows double arrow characters.
**Change:** Fix to single arrow or use Lucide ArrowRight icon.
**Files:** `src/app/[locale]/page.tsx`

### Improvement 4: Home dashboard density
**Current:** FOMO carousel is promotional. Trust Pulse cards are sparse.
**Benchmark:** Linear/Vercel dashboards use data-dense cards with sparklines and real metrics.
**Change:** Consider replacing carousel with compact action cards. Add sparklines to Trust Pulse metrics.
**Files:** `src/app/[locale]/page.tsx`, `src/components/home/feature-carousel.tsx`

---

## Execution Order

1. **qa-fixer:** Fix 1 + Fix 2 (i18n keys — ~5 minutes, trivial)
2. `/clear`
3. **prototype-executor:** Improvements 1-4 (visual/UX — optional, lower priority)
