# Plan: Community (4.4) — Bug Fixes + UX Revamp

**Section:** 4.4 Community (Rankings + Directory + Profile)
**Routes:** `/community`, `/community/[id]`
**Date:** 2026-03-21
**Source:** QA runbook re-test with 3 headed Playwright sessions (mobile member, desktop admin, desktop council)
**QA result:** 12/12 cases tested, 2 S1 i18n bugs, rest S3

---

## Track 1: Functional Fixes (qa-fixer — mandatory)

### Fix 1: Missing `Community.activeThisSprint` i18n key (S1)
**Impact:** Raw key visible in hero stat pill on all 3 locales. 28 console errors/page.
**Root cause:** Key used in `src/components/community/community-hero.tsx:39` but never added to locale files.
**Files:**
- `messages/en.json` — add `Community.activeThisSprint`
- `messages/pt-PT.json` — add Portuguese translation
- `messages/zh-CN.json` — add Chinese translation
**Value:** `"{count} active this sprint"` / `"{count} ativos neste sprint"` / `"{count} 本周期活跃"`

### Fix 2: Missing `Community.buildYourStreak` i18n key (S1)
**Impact:** Raw key visible in hero stat pill on all 3 locales.
**Root cause:** Key used in `src/components/community/community-hero.tsx:53` but never added to locale files.
**Files:**
- `messages/en.json` — add `Community.buildYourStreak`
- `messages/pt-PT.json` — add Portuguese translation
- `messages/zh-CN.json` — add Chinese translation
**Value:** `"Build your streak"` / `"Construa sua sequência"` / `"建立你的连续记录"`

### Fix 3: Missing achievement DESCRIPTION i18n keys (S2)
**Impact:** 8 console errors on community profile Achievements tab. Achievement descriptions show raw keys.
**Root cause:** Achievement NAMES were added for `peacemaker`, `first_arbiter`, `justice_keeper`, `vindicated` but DESCRIPTIONS were not.
**Files:**
- `messages/en.json` — add 4 keys under `Reputation.achievementDescriptions`
- `messages/pt-PT.json` — add Portuguese translations
- `messages/zh-CN.json` — add Chinese translations
**Keys:**
- `peacemaker` — "Resolved disputes through mediation and consensus"
- `first_arbiter` — "Served as an arbiter in your first dispute"
- `justice_keeper` — "Maintained fair judgment across multiple disputes"
- `vindicated` — "Won a dispute that was initially ruled against you"

### Fix 4: Update QA account creation script (S3)
**Impact:** QA sessions blocked until accounts are manually created and passwords reset.
**Root cause:** `scripts/create-qa-accounts.ts` doesn't set `onboarding_completed_at` field, causing onboarding modal to block every QA session.
**Files:**
- `scripts/create-qa-accounts.ts` — set `onboarding_completed_at` to current timestamp when creating/updating accounts

---

## Track 2: Visual/UX Improvements (prototype-executor — creative)

### Direction: Benchmark-driven improvements

**Current state:** The Community section is well-built — dark hero, podium, ranked table, directory grid, tabbed profile. It's functional and clean. The improvements below are about closing gaps to best-in-class patterns.

### Improvement 1: Rankings table micro-interactions (Benchmark: Linear)
**Current:** Table rows have subtle left-border highlight on hover + slight scale. No keyboard navigation.
**Target:** Linear's dense table with keyboard row navigation (arrow up/down), focus ring on active row, row preview on hover showing quick stats.
**Files:** `src/components/community/rankings-tab.tsx`

### Improvement 2: Loading state upgrade (Benchmark: Vercel)
**Current:** Rankings loading uses a spinner with "Loading leaderboard..." text.
**Target:** Vercel-style skeleton screens matching the exact podium + table layout. No spinner for fast loads (<200ms).
**Files:** `src/components/community/rankings-tab.tsx`

### Improvement 3: Directory advanced filtering (Benchmark: Airtable)
**Current:** Simple role filter chips + text search.
**Target:** Composable filter chips with counts per role (e.g., "Admin (3)"), sort options (by XP, by tasks, by join date), and a clear-all button.
**Files:** `src/components/members/member-filters.tsx`, `src/components/community/directory-tab.tsx`

### Improvement 4: Profile page enrichment (Benchmark: GitHub)
**Current:** Clean tabbed profile with stats, reputation, achievements, and placeholder activity tab.
**Target:** Add contribution heatmap or activity sparkline to Overview tab (like GitHub's contribution graph). Show recent tasks/proposals in Activity tab instead of "coming soon".
**Files:** `src/app/[locale]/community/[id]/page.tsx`

### Improvement 5: Page metadata (Benchmark: all)
**Current:** Page title shows "Organic App" on all pages.
**Target:** Dynamic page titles: "Community — Organic", "QA Admin — Organic", etc.
**Files:** `src/app/[locale]/community/page.tsx`, `src/app/[locale]/community/[id]/page.tsx`

---

## Affected Files Summary

**Track 1 (functional):**
- `messages/en.json`
- `messages/pt-PT.json`
- `messages/zh-CN.json`
- `scripts/create-qa-accounts.ts`

**Track 2 (visual/UX):**
- `src/components/community/rankings-tab.tsx`
- `src/components/members/member-filters.tsx`
- `src/components/community/directory-tab.tsx`
- `src/app/[locale]/community/[id]/page.tsx`
- `src/app/[locale]/community/page.tsx`

---

## Execution

1. **qa-fixer** — Fix Track 1 (i18n keys + script update)
2. `/clear`
3. **prototype-executor** — Build 3 competing prototypes for Track 2
