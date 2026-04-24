# Sprints: Review → Done Transition Bug

**Created:** 2026-04-21
**Branch:** `fix/app-audit-iter1` (or spin `fix/sprint-task-done` off main)
**Status:** Planned — not implemented
**Owner:** TBD
**Severity:** S0 — blocking live users in production

---

## Goal

Admin/users cannot move tasks from `review` → `done` column on the sprint board. An error is shown, tasks stay in review. Three tasks currently stuck.

## Initial hypothesis

Looking at `src/app/[locale]/sprints/page.tsx` lines 508–533, `updateTaskStatus` writes **directly to Supabase from the client**:

```ts
const { error: updateError } = await supabase
  .from('tasks')
  .update({ status: newStatus, completed_at: ... })
  .eq('id', taskId);
```

This bypasses the Zod-validated API route at `src/app/api/tasks/[id]/route.ts`. The update therefore depends entirely on RLS policies on the `tasks` table.

**Likely root causes (ranked):**

1. **RLS policy blocks review→done for the drag-and-drop actor.** The policy probably allows transitions like `todo → in_progress → review` for the assignee, but reserves `review → done` for a reviewer/admin. Client update silently fails or throws 403.
2. **RLS policy requires an approved submission row.** Review-stage tasks often move to done only via the submission-approval flow (`src/app/api/submissions/[id]/review/route.ts`). A direct client update violates that invariant.
3. **Trigger or check constraint** on `tasks` table validates status transitions and raises when the prior state is `review` without a linked approved submission.

Supporting evidence from repo:
- `src/app/api/tasks/[id]/claim/route.ts` line 119–120: `"Don't allow leaving tasks that are in review or done"` — suggests review/done are protected terminal-ish states.
- `src/app/api/tasks/[id]/submissions/route.ts` line 400: `"Update task status to review unless already done"` — indicates the intended path is submission → review → reviewer approves → done.

## Plan

### Step 1 — Reproduce and capture the exact error

1. Log in as `claude-test@organic-dao.dev` (admin).
2. Open the sprint with the three stuck tasks.
3. Drag one task from `review` to `done`.
4. Capture:
   - Browser console error (toast shows generic `toastTaskUpdateFailed`).
   - Network tab: the Supabase PostgREST response body and status code.
   - Supabase logs in the dashboard for the failing UPDATE.
5. Record findings in an `## Investigation` section at the bottom of this plan.

### Step 2 — Decide the fix shape based on step 1

**If the error is RLS (most likely):**
- **Option A (preferred):** Route the status update through the API. Change `updateTaskStatus` in `src/app/[locale]/sprints/page.tsx` to POST to `PATCH /api/tasks/[id]` which is already auth-gated and Zod-validated. Server-side service role (or policy designed for it) performs the update after authorization.
  - Pro: consistent with repo convention. Zod validation. One place to add business rules (e.g., require submission approval, or bypass for admin).
  - Con: small refactor; need to handle optimistic UI updates.
- **Option B:** Extend RLS to allow admins + task owners to transition `review → done` directly. Narrower fix but keeps client-direct-write pattern.

**If the error is a CHECK constraint / trigger:**
- Investigate the migration that created the constraint. Decide whether the constraint should permit admin overrides, or whether the UI should open a submission-approval flow instead of a direct transition.

**If the error is from a missing approved submission (business-logic intent):**
- The correct UX is: dragging to `done` from `review` opens the submission-approval panel, not a direct status write. Plan for a follow-up UX change and add a short-term admin-only escape hatch.

### Step 3 — Implement the chosen fix

For Option A (preferred):

1. In `src/app/[locale]/sprints/page.tsx`:
   - Replace direct `supabase.from('tasks').update(...)` with `fetch('/api/tasks/<id>', { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })`.
   - Keep optimistic UI update and roll back on error.
2. In `src/app/api/tasks/[id]/route.ts`:
   - Confirm the PATCH handler (lines 133–225) handles the `review → done` transition. It currently does — `updates.status = input.status` and sets `completed_at`.
   - Add a specific authorization check: admin OR task assignee with an approved submission. Return a descriptive 403/409 otherwise.
3. Improve the client toast — replace generic `toastTaskUpdateFailed` with the server-returned error message when the response is non-2xx.

### Step 4 — Regression test

- `tests/security/sprints-task-transition.test.ts`:
  - Admin can move review → done.
  - Non-admin with no submission gets 403.
  - Non-admin with approved submission succeeds.
  - Anonymous user gets 401.

### Step 5 — Unblock the three stuck tasks

Either:
- Use the admin UI after the fix ships, or
- Service-role one-off SQL in Supabase console: `UPDATE tasks SET status='done', completed_at=NOW() WHERE id IN (...)` — only if agreed with the user that manual unblock is acceptable.

## Files to touch

- `src/app/[locale]/sprints/page.tsx` — switch to API route for status updates
- `src/app/api/tasks/[id]/route.ts` — tighten auth / error messages
- `tests/security/sprints-task-transition.test.ts` — new regression test

If RLS change is chosen (Option B):
- New migration file `supabase/migrations/<timestamp>_allow_admin_task_status_transition.sql` — **requires explicit user approval** per CLAUDE.md RLS rules.

## Verification

**Commands:**
```bash
npm run lint
npx vitest run tests/security/
npm run build
```

**Manual checks:**
1. Log in as admin. Drag a review task to done. Task moves. `completed_at` is set. Toast shows success.
2. Log in as a non-assignee non-admin. Attempt the same drag. Expect a clear toast explaining why it's blocked.
3. The three previously stuck tasks now show `done` and appear in sprint velocity stats.
4. Refresh the page — state persists from Supabase.
5. Attempt PATCH directly with curl as unauthenticated — 401.

## Risks

- **RLS change** (Option B) requires explicit approval per CLAUDE.md non-negotiables.
- **Sprint velocity / XP** — moving a task to `done` may fire XP awards or sprint-complete hooks. Confirm behavior before manually unsticking the three tasks.
- **Optimistic UI** — rollback logic must not double-apply state if both the optimistic update and the server response resolve.

---

## Investigation (fill in after step 1)

> To be populated during repro. Include raw network response, Supabase log line, and the decided-upon fix shape.
