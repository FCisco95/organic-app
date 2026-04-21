# App Audit Iteration 1 — Execution Order

**Created:** 2026-04-21
**Branch:** `fix/app-audit-iter1` (planning landed here); fixes should spin off per-item branches from `main`.
**Status:** Meta-doc — planning only

---

## Recommended order

1. **Sprints: Review → Done transition bug** — [plan](2026-04-21-sprints-review-to-done-bug.md) · **S0, ~1–2h**
2. **Pulse analytics fixes** — [plan](2026-04-21-pulse-analytics-fixes.md) · **S1, 0.5–1 day**
3. **Translation admin toggles** — [plan](2026-04-21-translation-admin-toggles.md) · **feature, ~1 day**
4. **QA Runbook revamp + Mobile audit** — [plan](2026-04-21-mobile-audit-and-qa-runbook-revamp.md) · **foundation, 1–2 days**

## Rationale for this order

### 1. Sprints bug first

It is a production blocker. Three tasks are stuck in `review`. Every day those tasks stay stuck, the sprint velocity stats lie and the team loses trust in the board. Smallest diff, highest blast-radius reduction. It also clarifies an ambiguity in the app's status-transition model that will inform the mobile audit's "states" scoring.

### 2. Pulse analytics next

Live numbers that disagree with DexScreener on the public Pulse page are a credibility issue for a DAO-style product where data is the product. It is cheap to investigate and cheap to fix once the root cause is known. Users see it every time they open the app.

### 3. Translation toggles

Feature work. ZH ↔ EN is the highest-leverage market pair right now. Moderate effort, low regression risk (additive DB column, additive routes, flag-gated UI removal). Worth doing before the audit because the audit should evaluate the shipped translation UX, not a half-finished one.

### 4. QA runbook + mobile audit last

This is foundational documentation and scoring work. It has no user-facing impact on its own — its value comes from the *follow-up* fix plans it produces. Run it **after** the three concrete bug/feature fixes so the audit benchmarks against an app that already has the recent fixes in place. Otherwise half the S0/S1 flags would be items already on this execution list.

## How to execute

Per CLAUDE.md phase workflow:

1. For each item, spin a new branch off `main`:
   - `fix/sprints-task-done-transition`
   - `fix/pulse-analytics`
   - `feat/translation-toggles`
   - `docs/qa-runbook-revamp` (+ `docs/mobile-audit-2026-04-21` in the same PR or separate)
2. One phase per branch. One PR per branch. Use conventional commits.
3. Run the validation matrix (lint, relevant vitest, build) before opening PR.
4. Each plan contains its own verification checklist — follow it, don't skip.

## Cross-cutting principles (from CLAUDE.md)

- Write tests for every change, especially security-adjacent (translation flag enforcement, task transition authorization).
- Don't alter RLS without explicit approval.
- Don't skip `/clear` before running `prototype-executor` for any revamp that follows the mobile audit.
- Keep diffs focused. If a fix grows beyond its plan, pause and re-plan.

## Session planning

Suggest spreading across ~1 week:

| Day | Focus | Deliverable |
|---|---|---|
| Day 1 AM | Sprints bug repro + fix | PR open, merged if small |
| Day 1 PM | Pulse diagnostic | Findings written back into the plan |
| Day 2 | Pulse fix + translation scaffolding | PRs open |
| Day 3 | Translation UI + admin tab | PR merged |
| Day 4 | QA runbook revamp | `docs/qa-runbook.md` rewritten |
| Day 5 | Mobile audit pass | `docs/plans/2026-04-21-mobile-audit-report.md` published |

Timeline is nominal — collapse or expand based on real findings.

## After iteration 1

Deliverables from the mobile audit feed directly into:

- `qa-fixer` for S0/S1 bugs (same session allowed).
- `prototype-executor` for any screen scoring < 6 on Hierarchy / Motion / States. **Always `/clear` before `prototype-executor`.**
- A new iteration plan `docs/plans/2026-04-28-app-audit-iter2.md` scoped around the highest-leverage revamps identified.
