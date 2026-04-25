# Sprints Review→Done Bug — No Repro Receipt (2026-04-25)

**Outcome:** No fix shipped. Bug is not reproducible on production today.
**Branch:** `fix/sprints-review-to-done` (closing as no-repro after this doc lands).
**Supersedes:** [`docs/plans/2026-04-21-sprints-review-to-done-bug.md`](2026-04-21-sprints-review-to-done-bug.md).

---

## Why this file exists

The 2026-04-21 plan claimed three tasks were stuck in `review` on the sprints board. We sat down on 2026-04-25 to diagnose and fix it. When we looked at production, **the failure cohort no longer existed** — there was nothing to drag, nothing to capture, nothing to fix.

Rather than delete the branch silently, this doc records what we checked so the next person who hears "tasks are stuck in review" can answer "did we already look?" in 30 seconds without re-running the diagnostic.

---

## What was checked (2026-04-25)

**Method:** Live login as `claude-test@organic-dao.dev` (admin, organic_id 999) on https://organichub.fun. Production sprint state queried via the authenticated `/api/sprints` and `/api/sprints/<id>` endpoints from the browser context (no DB CLI access from this environment, so the planned read-only SQL was substituted with the equivalent API enumeration).

**Sprint inventory at time of check:**

| Sprint | ID | Status | reward_settlement_status | reward_settlement_committed_at |
|---|---|---|---|---|
| Genesis Sprint | `91f42eb8-2139-4f3a-ad3c-cc7cb19bcd5d` | `dispute_window` | `pending` | `null` |

Genesis was the only sprint in production. Not settlement-locked.

**Task status counts in Genesis Sprint (9 tasks total):**

| Status | Count |
|---|---|
| `done` | 5 |
| `todo` | 4 |
| **`review`** | **0** |
| `in_progress` | 0 |

The Review column header in the sprint board UI read "0 tasks". The Tasks page metric "Pending review" read 0.

---

## Why we believe the cohort drained

The 2026-04-21 plan's hypothesis was that `updateTaskStatus` in the sprint board wrote directly to Supabase from the client, bypassing Zod validation and the API auth layer, so RLS rejected review→done silently with a generic toast. That hypothesis was correct *at the time the plan was written* — but PR #62 (`f1f1f95 fix(sprints): allow review→done transition via API route`) had already shipped before this audit ran. After that fix, the sprint-board drag goes through `PATCH /api/tasks/[id]` with proper auth, role checks, and an approved-submission requirement for non-privileged callers.

Most likely the original three-task cohort either drained naturally (assignees retried the drag and now succeeded via the API path) or was unstuck out of band. Either way, on 2026-04-25 there was no failing case to capture.

The "What's already shipped (do not redo)" section of the plan (now removed) flagged this in writing — `src/app/[locale]/sprints/page.tsx:508–538` already routes through the API; `src/app/api/tasks/[id]/route.ts:163–213` already enforces the auth and business-rule gates; `tests/security/sprints-task-transition.test.ts` is the regression suite for those.

---

## Decision: no fix shipped

We considered shipping the planned admin-only `POST /api/tasks/[id]/force-done` route as a future-proofing escape hatch. We chose not to. CLAUDE.md is explicit about not building for hypothetical requirements, and without a captured failing response we'd be guessing at a problem that no longer exists.

If the failure recurs — a new task lands in `review` and the drag fails for an admin who knows they should be allowed — open a fresh diagnostic with the actual captured 4xx/5xx body and revisit the four candidate fix paths from this branch's deleted plan:

- **API auth 403** — UX-only toast clarification.
- **API business-rule 403** (no approved submission) — UX-only toast clarification.
- **DB trigger 500** (`trg_tasks_enforce_proposal_provenance` rejecting because the proposal was re-versioned) — trigger relaxation migration. Requires explicit user approval.
- **RLS silent drop** (team-task helper acting on a task whose `assignee_id` is someone else) — RLS update policy extension. Requires explicit user approval.

The brainstorm and rationale are still readable in the git history of this branch's first proposal commit (`9bf189e`, since reset away — recover via `git reflog` if needed) for whoever picks this back up.

---

## If you came here from a future incident

1. Capture the **actual** failing PATCH response body and status code from the user's browser before doing anything else. Without it, every diagnosis path is speculation.
2. Compare against the four signatures listed above. Pick the matching path.
3. Treat any RLS or trigger migration as approval-gated per CLAUDE.md.
4. The proposal-provenance trigger lives in `supabase/migrations/20260220100000_proposal_task_linkage.sql:226`. The tasks RLS UPDATE policy is in `supabase/migrations/20260328300000_security_hardening.sql:11–21` and only checks `assignee_id` (singular), not the `task_assignees` join table — that's a known potential gap if a team helper hits it.

---

## Operational notes from the diagnostic

- `auth.json` (saved Playwright session) was expired (last saved 2026-04-17). Refreshed and re-saved. File remains gitignored — `git check-ignore auth.json` confirms.
- No DB CLI access was configured in this environment. Future diagnostics that need `is_team_task`, `proposal_id`, or `proposal_version_id` for review-stage tasks should arrange Supabase dashboard SQL access first — the public API does not expose those fields.
