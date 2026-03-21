# QA Pipeline Dashboard

Single source of truth for QA/revamp pipeline progress. Updated after each session.

---

## Pipeline Status

| # | Section | Cases | Status | Severity | Plan | Fix Branch/PR | Revamp Branch/PR |
|---|---------|-------|--------|----------|------|---------------|------------------|
| 4.1 | Auth, Session, Entry | 12 | DONE | S3 | — | — | — |
| 4.2 | Navigation, Layout, i18n | 8 | DONE | S3 | [plan](plans/2026-03-21-navigation-qa-revamp.md) | `main` (28393f2) | `main` (4b919b6) |
| 4.3 | Home, Analytics, Leaderboard, Treasury | 8 | DONE | S3 | [plan](plans/2026-03-21-home-analytics-treasury.md) | `main` (8e137a8) | `main` (b59c207) |
| 4.4 | Community (Rankings + Directory + Profile) | 12 | DONE | S3 | [plan](plans/2026-03-21-community-qa-revamp.md) | `main` (81da1e1) | `main` (fb00427) |
| 4.5 | Profile, Progression, Community Profile | 11 | DONE | S3 | [plan](plans/2026-03-21-profile-progression-fixes-v2.md) | `main` (5a76747) | `main` (5a76747) |
| 4.6 | Quests, Referrals, Gamification | 11 | DONE | S1 | [plan](plans/2026-03-21-quests-qa-revamp.md) | `main` (67811d2) | `main` (d736cbd) |
| 4.7 | Tasks E2E | 17 | DONE | S3 | [plan](plans/2026-03-08-tasks-qa-revamp.md) | `main` (3aed048) | `main` (e3d4439) |
| 4.8 | Sprints E2E | 11 | DONE | S1 | [plan](plans/2026-03-21-sprints-qa-revamp.md) | `main` (25d3df6) | `main` (7ef0c54) |
| 4.9 | Proposals, Governance | 17 | DONE | S2 | [plan](plans/2026-03-19-proposals-qa-revamp.md) | merged to main | merged to main |
| 4.10 | Disputes | 13 | PENDING | — | — | — | — |
| 4.11 | Rewards | 9 | PENDING | — | — | — | — |
| 4.12 | Notifications | 6 | PENDING | — | — | — | — |
| 4.13 | Admin Ops | 8 | PENDING | — | — | — | — |
| 4.14 | Error Resilience | 6 | PENDING | — | — | — | — |
| 4.15 | Locale, Accessibility | 8 | PENDING | — | — | — | — |
| 4.16 | Operational Controls | auto | PENDING | — | — | — | — |
| 4.17 | Onboarding Wizard | 10 | PENDING | — | — | — | — |
| 4.18 | Twitter/X | 12 | PENDING | — | — | — | — |
| 4.19 | Ideas Incubator | 15 | PENDING | — | — | — | — |

### Status Legend

`PENDING` → `TESTED` → `PLANNED` → `FIXED` → `REVAMPED` → `DONE`

- **PENDING** — not yet QA'd
- **TESTED** — QA complete, feedback written in runbook
- **PLANNED** — plan file written in `docs/plans/`
- **FIXED** — functional bugs fixed (code merged)
- **REVAMPED** — visual/UX improvements applied (code merged)
- **DONE** — all fixes + revamp merged and verified

---

## Next Action

| Action | Section | What to do |
|--------|---------|------------|
| **Next to QA** | 4.10 Disputes | First remaining PENDING section — 13 cases |
| **Next to QA** | 4.11 Rewards | Second PENDING section — 9 cases |
| **Next to QA** | 4.12 Notifications | Third PENDING section — 6 cases |

---

## Cross-Cutting Issues

Issues spanning multiple sections — track resolution centrally.

| Issue | Sections | Severity | Status |
|-------|----------|----------|--------|
| Onboarding modal: skip not persisted, reappears on every navigation | 4.1, 4.2, 4.17 | S1 | Verified: localStorage persistence already works. Playwright in-memory sessions were the cause. |
| Console errors: 48-132 per page (Sentry CSP + missing i18n keys) | 4.1, 4.2, 4.3 | S2 | Open |
| Page titles show "Next.js" instead of page name | 4.1, 4.2 | S3 | Open |
| Garbage test data from prototype QA sessions (localhost:3003 titles) | 4.9 | S3 | Script ready: `scripts/cleanup-qa-garbage.sql` — run manually against main DB |
| Quest i18n keys broken: titles/descriptions show raw UUID keys on progression | 4.5, 4.6 | S1 | **FIXED** — prefix check corrected (5a76747), resolveQuestTitle API-first fallback (67811d2). 0 console errors. |
| Twitter/X link start API returns 400 Bad Request | 4.5, 4.18 | S1 | **FIXED** — empty body replaced with `JSON.stringify({})`, merged to `main` (5a76747) |
| Twitter/X OAuth callback params (twitter_linked, twitter_error) silently ignored | 4.5, 4.18 | S1 | **FIXED** — toasts fire correctly, merged to `main` |
| Community profile i18n keys missing | 4.4, 4.5 | S1 | **FIXED** — 8 keys added to all 3 locales, merged to `main` (5a76747) |

---

## Recommended Section Order

**DONE (10/19):** 4.1 Auth, 4.2 Navigation, 4.3 Home/Analytics, 4.4 Community, 4.5 Profile, 4.6 Quests, 4.7 Tasks, 4.8 Sprints, 4.9 Proposals — all merged to `main`

**Wave B — Core feature sections (PENDING):**
3. 4.8 Sprints E2E (11 cases)
4. 4.10 Disputes (13 cases)
5. 4.11 Rewards (9 cases)
6. 4.12 Notifications (6 cases)

**Wave C — Admin, onboarding, and integrations:**
7. 4.13 Admin Ops (8 cases)
8. 4.17 Onboarding Wizard (10 cases)
9. 4.18 Twitter/X (12 cases)
10. 4.19 Ideas Incubator (15 cases)

**Wave D — Cross-cutting (run last):**
11. 4.14 Error Resilience (6 cases)
12. 4.15 Locale/A11y (8 cases)
13. 4.16 Operational Controls (automated)

---

## Session Launcher Prompts

### Phase A — QA

```
Read docs/qa-dashboard.md. Find next PENDING section.
Use manual-tester to QA it with 3 headed browsers:
- Mobile (375x812) as QA Member
- Desktop (1440x900) as QA Admin
- Console/backup as QA Council
Write plan, compact runbook, update dashboard.
```

### Phase B — Fix

```
Read docs/qa-dashboard.md. Find next PLANNED section.
Load the linked plan file. Execute ONLY functional fixes (not visual/UX).
Branch: fix/{section-slug}
After merge: update dashboard status to FIXED.
```

### Phase C — Revamp

```
Read docs/qa-dashboard.md. Find next FIXED section.
Load the linked plan file. Use prototype-executor for visual/UX improvements.
After merge: update dashboard status to REVAMPED or DONE.
```

### Targeted variant

```
QA section 4.{X}. Read docs/qa-dashboard.md for status, then use manual-tester.
Fix section 4.{X}. Read docs/qa-dashboard.md for plan link, then use executing-plans.
Revamp section 4.{X}. Read docs/qa-dashboard.md for plan link, then use prototype-executor.
```

---

## Completed Work Log

| Date | Section | Action | Branch/PR | Notes |
|------|---------|--------|-----------|-------|
| 2026-03-07 | 4.1, 4.2, 4.3 | QA tested | — | Feedback in runbook, plans pending |
| 2026-03-08 | 4.7 | QA tested + planned | — | Plan: `2026-03-08-tasks-qa-revamp.md` |
| 2026-03-10 | 4.9 | QA tested | — | Round 1 (list page) |
| 2026-03-10 | 4.9 | Revamped (list) | PR #20 | Community Forum layout |
| 2026-03-14 | 4.9 | Revamped (wizard + detail) | PR #21 | Two-column wizard, decision rail |
| 2026-03-14 | 4.9 | Re-tested + polished | `fix/4.9-proposals-polish` | i18n, scroll fade, empty states |
| 2026-03-19 | 4.5 | QA tested + planned | — | Plan: `2026-03-19-profile-progression-fixes.md`. S1: quest i18n, Twitter connect/callback. |
| 2026-03-19 | 4.5 | Fixed + revamped | `fix/4.5-profile-progression-fixes` | 4 functional fixes + Bento Grid revamp (hero card, timeline quests, progress rings, design tokens) |
| 2026-03-19 | 4.9 | Re-QA tested + planned | — | Full re-test: 15/17 cases PARTIAL S2, 1 SKIP, plan: `2026-03-19-proposals-qa-revamp.md` (12 tasks, 2 tracks) |
| 2026-03-19 | 4.9 | Fixed + revamped | `fix/4.9-proposals-functional-fixes` | Track 1: 5 functional fixes. Track 2: Proto C (inline accordions, vote FAB, numbered stepper, icon categories, display names, stage history) |
| 2026-03-20 | 4.5 | Re-QA tested (fresh) | — | 11 cases (10 PROF + 1 COMM-PROF). S1: quest i18n still broken (38 errors), Twitter connect still 400, Community profile 58 i18n errors. PROF-09 callback params now PASS. QA accounts created via `scripts/create-qa-accounts.ts`. |
| 2026-03-21 | 4.5 | Fixed (v2) | `fix/4.5-profile-fixes-v2` | 4 fixes: quest i18n prefix check, Twitter connect body, 8 Community i18n keys, peacemaker achievement name. Plan: `2026-03-21-profile-progression-fixes-v2.md`. |
| 2026-03-21 | 4.5 | Revamped (Proto A) | `fix/4.5-profile-fixes-v2` | Executive Dashboard: dense tabbed profile, quest table, compact community header. 3 prototypes compared, Proto A selected. |
| 2026-03-21 | 4.4 | QA re-tested + planned | — | 12/12 cases with QA accounts (3 sessions, 3 roles). S1: 2 missing Community i18n keys + 4 achievement description keys. Plan: `2026-03-21-community-qa-revamp.md` (4 fixes + 5 UX improvements). |
| 2026-03-21 | 4.4 | Fixed | `main` (81da1e1) | 4 fixes: 2 Community i18n keys, 4 achievement desc keys (+ 8 pt-PT/zh-CN profile tab keys), QA script onboarding fix. 0 console errors verified. |
| 2026-03-21 | 4.4 | Revamped (combined A+B+C) | `main` (fb00427) | Best of 3 prototypes: contribution heatmap + activity feed (B/GitHub), keyboard nav + filter counts (A/Linear), command search + 4-stat cards (C/Vercel). 25+ i18n keys. |
| 2026-03-21 | 4.7 | Verified FIXED | `main` (3aed048) | qa-fixer live verification: all 3 prior S0/S1 bugs (silent errors, hardcoded locale, emoji icons) confirmed fixed. Task list + detail + mobile all functional. 0 functional bugs remaining. Dashboard updated PLANNED→FIXED. Ready for prototype-executor. |
| 2026-03-21 | 4.7 | Revamped (combined A+B+C) | `main` (e3d4439) | Best of 3 prototypes: compact mono stats header + dense rows with priority stripes (A/Linear), typography hierarchy + colored text status (C/Vercel), segmented tabs + avatar stacks + progress ring (B/GitHub). 8 new i18n keys. |
| 2026-03-21 | 4.1 | Re-QA tested | — | 12/12 cases (3 sessions, 3 viewports). All prior S1 fixes confirmed. No functional bugs. Severity downgraded S1→S3. Recorded only, no plan. |
| 2026-03-21 | 4.3 | Re-QA tested + planned | — | 8/8 cases (3 sessions). S1: 2 missing i18n keys on home. Plan: `2026-03-21-home-analytics-treasury.md`. |
| 2026-03-21 | 4.3 | Fixed | `main` (8e137a8) | 2 i18n fixes: `Home.trustSprintNoneShort` + `dashboard.activity.viewAll` in all 3 locales. 0 console errors verified. |
| 2026-03-21 | 4.3 | Revamped (Proto B) | `main` (b59c207) | GitHub Activity Hub: 2-column contribution layout (nav cards + activity feed), "Coming soon" KPI badges, mobile analytics scroll fix, double arrow fix. 3 prototypes compared, Proto B selected. |
| 2026-03-21 | 4.2 | Re-QA tested + planned | — | 8/8 PASS (3 sessions, 3 roles). S3 — no functional bugs. Severity downgraded S2→S3. Plan: `2026-03-21-navigation-qa-revamp.md` (2 fixes + 4 UX revamps: sidebar grouping, Cmd+K palette, breadcrumbs, visual polish). |
| 2026-03-21 | 4.2 | Fixed | `main` (28393f2) | 2 fixes: mobile sidebar SheetTitle/SheetDescription a11y, settings access denied copy (3 locales). 0 console errors verified. |
| 2026-03-21 | 4.2 | Revamped (A+B combined) | `main` (4b919b6) | Best of Linear + Stripe: collapsible sidebar sections with chevrons, Cmd+K command palette, keyboard shortcut hints (A/Linear) + breadcrumb trail in top-bar (B/Stripe). 3 prototypes compared, A+B combined. 14 new i18n keys. |
| 2026-03-21 | 4.6 | QA tested + planned | — | 9/11 PASS, 1 PARTIAL (S1), 1 SKIP. S1: 18 quest UUID i18n errors on progression. Plan: `2026-03-21-quests-qa-revamp.md` (1 fix + 5 revamps + 3 new features: streak tracker, XP feed, quest celebrations). |
| 2026-03-21 | 4.6 | Fixed | `main` (67811d2) | 1 fix: resolveQuestTitle() now prefers API title over i18n lookup. 0 console errors on /profile/progression and /quests. |
| 2026-03-21 | 4.6 | Revamped (Proto A) | `main` (d736cbd) | Duolingo-inspired: SVG progress rings, category color-coded quest cards (blue/purple/amber/emerald), tier stepper (Bronze→Silver→Gold) with glow, level ring sidebar, burn button conditional display, dark theme tokens throughout. 3 prototypes compared, Proto A selected. |
| 2026-03-21 | 4.8 | QA tested + planned | — | 9/11 cases (2 skipped, no review/dispute sprint). S1: missing `Sprints.metricOpenExecution` i18n key (30+ errors). Plan: `2026-03-21-sprints-qa-revamp.md` (1 fix + 5 UX improvements). |
| 2026-03-21 | 4.8 | Fixed | `main` (25d3df6) | 1 fix: missing Sprints.metricOpenExecution i18n key in all 3 locales. 0 console errors verified. |
| 2026-03-21 | 4.8 | Revamped (Proto B full) | `main` (7ef0c54) | Full 9-component overhaul: GitHub milestone cards + chunky progress bars + open/closed stats (B), Proto A's vertical phase stepper + gridline burndown on detail page, orange theme throughout, muted success states. All modals/dialogs redesigned. 3 prototypes compared, B selected with A's detail elements + orange + muted greens. |
