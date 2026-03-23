# QA Plan: 4.14 Error Resilience, 4.15 Locale/A11y, 4.16 Operational Controls

**Date:** 2026-03-23
**Sections:** 4.14, 4.15, 4.16
**Overall severity:** S1 (from 4.14 ERR-02 silent API failures)

---

## Section 4.14 — Error Resilience (6 cases)

### Results Summary

| Case | Verdict | Severity | Issue |
|------|---------|----------|-------|
| ERR-01 | PARTIAL | S2 | Default Next.js 404 — no branding, nav, or CTA |
| ERR-02 | PARTIAL | S1 | API 500s show silent empty state ("0 tasks"), no error/retry |
| ERR-03 | PARTIAL | S2 | No loading.tsx, no skeletons, no Suspense boundaries |
| ERR-04 | PASS | S3 | /api/health works correctly |
| ERR-05 | PASS | S3 | Access Denied page works; APIs reject unauth correctly |
| ERR-06 | PARTIAL | S2 | Mobile 404/error states have no navigation — user stranded |

### Functional Fixes (S0/S1) — for qa-fixer

1. **ERR-02: Silent API failure handling**
   - **File:** Client-side data fetching hooks/components (tasks, proposals, sprints, etc.)
   - **Problem:** When API returns 500, pages silently render with "0" counts — user has no idea the data failed to load
   - **Fix:** Add error state detection in fetch hooks. When API returns error, show an inline error banner with retry button instead of empty state
   - **Benchmark:** Linear shows "Something went wrong" with retry; Vercel shows clear error states with actionable messages

### Visual/UX Improvements (S2/S3) — for prototype-executor

2. **ERR-01/ERR-06: Custom 404 page**
   - **File:** Create `src/app/[locale]/not-found.tsx`
   - **Problem:** Default Next.js "404 | This page could not be found." — no branding, no sidebar, no navigation, no way back
   - **Fix:** Branded 404 page with Organic logo, sidebar nav, "Go home" CTA, search suggestion
   - **Benchmark:** GitHub 404 has illustration + search + nav; Linear shows branded page with return link

3. **ERR-03: Loading states / skeleton screens**
   - **File:** Create `src/app/[locale]/loading.tsx` and per-route loading files
   - **Problem:** No Suspense loading boundaries — page either renders instantly (SSR) or shows nothing
   - **Fix:** Add skeleton screens for data-heavy pages (tasks, proposals, community). Use Shadcn Skeleton component
   - **Benchmark:** Vercel uses skeleton screens matching exact layout. Linear uses instant local state + background sync

4. **ERR-05: Access Denied page enhancement**
   - **File:** Admin layout access denied component
   - **Problem:** Access Denied has no "Go back" or "Go home" CTA — user is stranded
   - **Fix:** Add "Go to Home" button below the access denied message

---

## Section 4.15 — Locale & Accessibility (8 cases)

### Results Summary

| Case | Verdict | Severity | Issue |
|------|---------|----------|-------|
| L10N-01 | PASS | S3 | English fully translated |
| L10N-02 | PASS | S3 | Portuguese (pt-PT) fully translated |
| L10N-03 | PASS | S3 | Chinese (zh-CN) fully translated |
| A11Y-01 | PASS | S3 | Keyboard nav works — Cmd+K, shortcut keys (G+H, G+A, etc.) |
| A11Y-02 | PASS | S3 | Focus states visible on inputs; could be more prominent on buttons/links |
| A11Y-03 | PASS | S3 | Escape closes dialogs properly |
| A11Y-04 | PASS | S3 | Inline validation messages with icons near fields |
| A11Y-05 | PASS | S3 | Adequate contrast and hierarchy on dense data surfaces |

### Functional Fixes — None

### Visual/UX Improvements (S3) — Minor polish

5. **A11Y-02: Enhanced focus rings on interactive elements**
   - **File:** `src/app/globals.css` or Tailwind config
   - **Problem:** Focus rings on buttons and links are subtle — hard to see for keyboard-only users
   - **Fix:** Add `focus-visible:ring-2 focus-visible:ring-orange-500` to button/link base styles
   - **Benchmark:** Linear has very visible blue focus rings on all interactive elements

---

## Section 4.16 — Operational Controls (automated)

### Results Summary

| Case | Verdict | Severity | Notes |
|------|---------|----------|-------|
| Pre-flight | PASS | — | .env.local has all keys, helpers exist |
| Voting: snapshot freeze + idempotent finalize | PASS | — | 10.9s |
| Voting: freeze on double failure + manual resume | PASS | — | 3.5s |
| Rewards: emission cap hold | SKIP | — | Active sprint in environment — guard worked correctly |
| Rewards: kill-switch on duplicate epoch | SKIP | — | Active sprint in environment — guard worked correctly |

### Notes

- Voting integrity tests pass fully (2/2)
- Rewards tests correctly skip when an active sprint is in-flight (guard logic works as designed)
- To run rewards tests: complete or delete the active sprint first, then re-run
- Both test suites clean up their own QA data (afterAll hooks)

---

## Execution Plan

### Phase 1: Functional fixes (qa-fixer)

1. Add error state handling for API failures in data fetching (ERR-02) — show error banner + retry button
2. Add "Go to Home" CTA on Access Denied page (ERR-05)

### Phase 2: Visual/UX improvements (prototype-executor)

3. Create custom branded `not-found.tsx` with navigation (ERR-01/ERR-06)
4. Add skeleton loading states for major routes (ERR-03)
5. Enhance focus rings for keyboard accessibility (A11Y-02)

### Phase 3: Operational controls follow-up

6. Re-run rewards integrity tests after active sprint completes (4.16)
