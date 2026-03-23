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
| 4.10 | Disputes | 13 | DONE | S1 | [plan](plans/2026-03-21-disputes-qa-revamp.md) | `main` (7406bd9) | `main` (6968033) |
| 4.11 | Rewards | 9 | DONE | S2 | [plan](plans/2026-03-22-rewards-qa-revamp.md) | `main` (d26a0a2) | `main` (bcbad99) |
| 4.12 | Notifications | 6 | DONE | S1 | [plan](plans/2026-03-22-notifications-qa-revamp.md) | `main` (6258547) | `main` (35403ca) |
| 4.13 | Admin Ops | 8 | DONE | S2 | [plan](plans/2026-03-22-admin-ops-qa-revamp.md) | `main` (c124a13) | `main` (b12079d) |
| 4.14 | Error Resilience | 6 | DONE | S1 | [plan](plans/2026-03-23-error-locale-ops-qa.md) | `main` (991cf7d) | `main` (7ec1b0a) |
| 4.15 | Locale, Accessibility | 8 | DONE | S3 | [plan](plans/2026-03-23-error-locale-ops-qa.md) | — | `main` (7ec1b0a) |
| 4.16 | Operational Controls | 4 | DONE | S3 | [plan](plans/2026-03-23-error-locale-ops-qa.md) | — | — |
| 4.17 | Onboarding Wizard | 10 | DONE | S3 | [plan](plans/2026-03-22-onboarding-qa-revamp.md) | — (no bugs) | `main` (bfa2035) |
| 4.18 | Twitter/X | 12 | REVAMPED | S1 | [plan](plans/2026-03-23-twitter-qa-revamp.md) | `main` (6fe8fcb) | `main` (6e1b89f) |
| 4.19 | Ideas Incubator | 15 | PLANNED | S2 | [plan](plans/2026-03-23-ideas-incubator-qa-revamp.md) | — | — |

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
| **Next to fix** | 4.19 Ideas Incubator | Fix 2 S2 bugs (auth context, KPI skeletons) via qa-fixer |
| **Next to revamp** | 4.19 Ideas Incubator | After fix — 3 prototypes via prototype-executor |
| **Mark DONE** | 4.18 Twitter/X | Already REVAMPED, verify and close |

---

## Cross-Cutting Issues

Issues spanning multiple sections — track resolution centrally.

| Issue | Sections | Severity | Status |
|-------|----------|----------|--------|
| Onboarding modal: skip not persisted, reappears on every navigation | 4.1, 4.2, 4.17 | S1 | **Not a bug** — localStorage persistence works. Playwright in-memory sessions were the cause. |
| Console errors: Sentry CSP warnings on some pages | 4.1, 4.2, 4.3 | S2 | Open — most i18n errors now fixed across sections |
| Page titles show "Next.js" instead of page name | 4.1, 4.2 | S3 | Open |
| Garbage test data from prototype QA sessions | 4.9 | S3 | Script ready: `scripts/cleanup-qa-garbage.sql` |
| task_assignees query 400: join to user_profiles fails, blocking Join Task → Submit Work for all task types | 4.7, 4.18 | S1 | **Fixed** — FK migration `6fe8fcb` |
| **Twitter/X OAuth production setup**: App needs production X API credentials + callback URL configured before go-live. Currently using ngrok tunnel for dev. Must register production callback URL in X Developer Portal and set `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_REDIRECT_URI` env vars in production. | 4.18 | S0 | **OPEN — launch blocker (go-live ~2026-03-30)** |

---

## Recommended Section Order

**DONE (17/19):** 4.1 Auth, 4.2 Navigation, 4.3 Home/Analytics, 4.4 Community, 4.5 Profile, 4.6 Quests, 4.7 Tasks, 4.8 Sprints, 4.9 Proposals, 4.10 Disputes, 4.11 Rewards, 4.12 Notifications, 4.13 Admin Ops, 4.14 Error Resilience, 4.15 Locale/A11y, 4.16 Operational Controls, 4.17 Onboarding — all merged to `main`
**REVAMPED (1):** 4.18 Twitter/X — Stripe-inspired UI revamp merged
**PLANNED (1):** 4.19 Ideas Incubator — 15/15 tested, 2 S2 fixes + full visual revamp planned

**Wave B — Core feature sections:**
1. 4.10 Disputes (13 cases) — **DONE**
2. 4.11 Rewards (9 cases) — **DONE**
3. 4.12 Notifications (6 cases) — **DONE**

**Wave C — Admin, onboarding, and integrations:**
4. 4.13 Admin Ops (8 cases) — **DONE**
5. 4.17 Onboarding Wizard (10 cases) — **DONE**
6. 4.18 Twitter/X (12 cases)
7. 4.19 Ideas Incubator (15 cases)

**Wave D — Cross-cutting (run last):**
8. 4.14 Error Resilience (6 cases) — **DONE**
9. 4.15 Locale/A11y (8 cases) — **DONE**
10. 4.16 Operational Controls (4 cases) — **DONE**

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

Consolidated — one row per section showing final outcome. Full history in git log.

| Date | Section | Fix | Revamp | Summary |
|------|---------|-----|--------|---------|
| 2026-03-21 | 4.1 Auth | — | — | 12/12 PASS S3. No bugs, no revamp needed. |
| 2026-03-21 | 4.2 Navigation | `main` (28393f2) | `main` (4b919b6) | 2 fixes (a11y, settings copy). Revamp: Linear+Stripe — collapsible sidebar, Cmd+K palette, breadcrumbs. |
| 2026-03-21 | 4.3 Home/Analytics | `main` (8e137a8) | `main` (b59c207) | 2 i18n fixes. Revamp: GitHub Activity Hub — 2-column layout, nav cards, activity feed. |
| 2026-03-21 | 4.4 Community | `main` (81da1e1) | `main` (fb00427) | 6 i18n fixes. Revamp: A+B+C combined — heatmap, keyboard nav, command search, stat cards. |
| 2026-03-21 | 4.5 Profile | `main` (5a76747) | `main` (5a76747) | 4 fixes (quest i18n, Twitter, community keys). Revamp: Proto A — executive dashboard, tabbed profile. |
| 2026-03-21 | 4.6 Quests | `main` (67811d2) | `main` (d736cbd) | 1 fix (resolveQuestTitle). Revamp: Proto A Duolingo — progress rings, tier stepper, color-coded cards. |
| 2026-03-21 | 4.7 Tasks | `main` (3aed048) | `main` (e3d4439) | 3 fixes (silent errors, locale, emoji). Revamp: A+B+C — mono stats, priority stripes, segmented tabs. |
| 2026-03-21 | 4.8 Sprints | `main` (25d3df6) | `main` (7ef0c54) | 1 i18n fix. Revamp: Full 9-component overhaul — GitHub milestones + A's phase stepper/burndown, orange theme, muted success. |
| 2026-03-21 | 4.9 Proposals | merged to main | merged to main | 5 fixes. Revamp: Proto C — inline accordions, vote FAB, numbered stepper, stage history. |
| 2026-03-22 | 4.11 Rewards | `main` (d26a0a2) | `main` (bcbad99) | 3 fixes (queue age, settlement color, claim validation). Revamp: Proto B GitHub — tabbed sections, timeline chips, filter pills, expandable rows, header CTA. |
| 2026-03-22 | 4.12 Notifications | `main` (6258547) | `main` (35403ca) | 3 fixes + Proto C Vercel timeline — card items, timeline connector, Lucide icons, Sheet prefs, segmented filter. |
| 2026-03-22 | 4.13 Admin Ops | `main` (c124a13) | `main` (b12079d) | 3 fixes (toast, key prop, governance warnings). Revamp: C+A combined — Stripe KPI dashboard + audit timeline, Linear vertical settings nav with grouped sections. |
| 2026-03-22 | 4.17 Onboarding | — (no bugs) | `main` (bfa2035) | 10/10 PASS, no bugs. Revamp: Proto B Notion — progress bar, slide transitions, rich empty states with actionable CTAs, warm tone, XP badges, completion screen. |
| 2026-03-23 | 4.14 Error Resilience | `main` (991cf7d) | `main` (7ec1b0a) | 2/6 PASS, S1. Fix: FetchErrorBanner for API failures. Revamp: Proto B Notion — branded 404 with compass/cards, shimmer skeletons, terracotta focus rings, access denied card CTAs. |
| 2026-03-23 | 4.15 Locale/A11y | — | `main` (7ec1b0a) | 8/8 PASS, S3. Focus rings enhanced via shared revamp commit. |
| 2026-03-23 | 4.16 Operational Controls | — | — | Voting integrity 2/2 PASS. Rewards 2/2 SKIP (active sprint guard). No fixes/revamp needed. |
| 2026-03-23 | 4.18 Twitter/X | `main` (6fe8fcb) | `main` (6e1b89f) | 2 fixes: submission form body + task_assignees FK. Revamp: Proto A Stripe — connected account cards, structured submission sections, color-coded engagement pills, X brand icons, skeleton loading. |
