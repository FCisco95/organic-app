# QA Pipeline Dashboard

Single source of truth for QA/revamp pipeline progress. Updated after each session.

---

## Pipeline Status

| # | Section | Cases | Status | Severity | Plan | Fix Branch/PR | Revamp Branch/PR |
|---|---------|-------|--------|----------|------|---------------|------------------|
| 4.1 | Auth, Session, Entry | 12 | TESTED | S1 | — | — | — |
| 4.2 | Navigation, Layout, i18n | 8 | TESTED | S2 | — | — | — |
| 4.3 | Home, Analytics, Leaderboard, Treasury | 8 | TESTED | S1 | — | — | — |
| 4.4 | Members Directory | 8 | PENDING | — | — | — | — |
| 4.5 | Profile, Progression | 10 | PENDING | — | — | — | — |
| 4.6 | Quests, Referrals, Gamification | 11 | PENDING | — | — | — | — |
| 4.7 | Tasks E2E | 17 | PLANNED | S1 | [plan](plans/2026-03-08-tasks-qa-revamp.md) | — | — |
| 4.8 | Sprints E2E | 11 | PENDING | — | — | — | — |
| 4.9 | Proposals, Governance | 17 | DONE | S3 | [plan](plans/2026-03-10-proposals-qa-revamp.md) | PR #20 | PR #21 |
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
| **Next to plan** | 4.1 Auth | Write plan from runbook feedback — highest S1 priority |
| **Next to fix** | 4.7 Tasks | Plan exists → execute Phase B (functional fixes only) |
| **Next to QA** | 4.4 Members | First PENDING section in recommended order |

---

## Cross-Cutting Issues

Issues spanning multiple sections — track resolution centrally.

| Issue | Sections | Severity | Status |
|-------|----------|----------|--------|
| Onboarding modal: skip not persisted, reappears on every navigation | 4.1, 4.2, 4.17 | S1 | Open |
| Console errors: 48-132 per page (Sentry CSP + missing i18n keys) | 4.1, 4.2, 4.3 | S2 | Open |
| Page titles show "Next.js" instead of page name | 4.1, 4.2 | S3 | Open |
| Garbage test data from prototype QA sessions (localhost:3003 titles) | 4.9 | S3 | Open |

---

## Recommended Section Order

**Wave 1 — Already tested, need plans + fixes:**
1. 4.7 Tasks (S1, plan exists → Phase B directly)
2. 4.1 Auth (S1 → write plan → Phase B → Phase C)
3. 4.3 Home/Analytics (S1 → write plan → Phase B → Phase C)
4. 4.2 Navigation (S2 → write plan → Phase B → Phase C)

**Wave 2 — Core user-facing:**
5. 4.4 Members Directory
6. 4.5 Profile/Progression
7. 4.17 Onboarding Wizard (depends on 4.1 auth fixes)
8. 4.8 Sprints E2E

**Wave 3 — Feature sections:**
9. 4.10 Disputes → 4.11 Rewards → 4.12 Notifications
10. 4.6 Quests/Gamification → 4.19 Ideas Incubator

**Wave 4 — Admin and cross-cutting:**
11. 4.13 Admin → 4.18 Twitter/X → 4.14 Error Resilience
12. 4.15 Locale/A11y (run last, after all fixes)
13. 4.16 Operational Controls (automated, separate workflow)

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
