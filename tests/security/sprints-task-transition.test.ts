import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression suite for the sprints review→done bug. Historically the sprint
// board wrote the new task status directly to Supabase from the browser,
// which bypassed Zod validation, skipped server-side authorization, and
// surfaced RLS failures as a generic "task update failed" toast. The bug
// left three tasks stuck in review in production.
//
// These tests lock in the shape of the fix:
//   1. The sprint board must route status changes through `PATCH /api/tasks/[id]`.
//   2. The PATCH handler must authenticate, authorize, and guard the
//      review→done transition for non-privileged callers.

describe('Sprints task transition (review → done regression)', () => {
  const sprintsPage = readFileSync('src/app/[locale]/sprints/page.tsx', 'utf-8');
  const tasksPatchRoute = readFileSync('src/app/api/tasks/[id]/route.ts', 'utf-8');

  it('sprint board routes status changes through the API, not direct Supabase', () => {
    const updateFn = sprintsPage.slice(
      sprintsPage.indexOf('const updateTaskStatus'),
      sprintsPage.indexOf('// Lifecycle handlers')
    );

    expect(updateFn).toMatch(/fetch\(`\/api\/tasks\/\$\{taskId\}`/);
    expect(updateFn).toMatch(/method:\s*['"]PATCH['"]/);
    // No more direct Supabase writes from the drag handler.
    expect(updateFn).not.toMatch(/supabase\s*\.from\(['"]tasks['"]\)\s*\.update/);
  });

  it('sprint board rolls back optimistic UI when the PATCH request fails', () => {
    const updateFn = sprintsPage.slice(
      sprintsPage.indexOf('const updateTaskStatus'),
      sprintsPage.indexOf('// Lifecycle handlers')
    );

    // A previous snapshot must be captured and restored on failure.
    expect(updateFn).toMatch(/previousTasks/);
    expect(updateFn).toMatch(/setCurrentSprintTasks\(previousTasks\)/);
  });

  it('sprint board surfaces the server error message instead of a generic toast', () => {
    const updateFn = sprintsPage.slice(
      sprintsPage.indexOf('const updateTaskStatus'),
      sprintsPage.indexOf('// Lifecycle handlers')
    );

    // The catch branch should prefer the thrown Error's message.
    expect(updateFn).toMatch(/updateError instanceof Error/);
    expect(updateFn).toMatch(/toast\.error\(message\)/);
  });

  it('PATCH /api/tasks/[id] authenticates before any task work', () => {
    const authCheckPos = tasksPatchRoute.indexOf('auth.getUser()');
    const patchStart = tasksPatchRoute.indexOf('export async function PATCH');
    const patchBody = tasksPatchRoute.slice(patchStart);
    const firstUpdate = patchBody.indexOf("from('tasks')");

    expect(authCheckPos).toBeGreaterThan(-1);
    expect(patchStart).toBeGreaterThan(-1);
    // auth must be checked before any tasks query within PATCH.
    expect(tasksPatchRoute.indexOf('auth.getUser()', patchStart)).toBeLessThan(
      patchStart + firstUpdate
    );
  });

  it('PATCH /api/tasks/[id] returns 401 when the caller is unauthenticated', () => {
    expect(tasksPatchRoute).toMatch(
      /if \(authError \|\| !user\)[\s\S]{0,120}Not authenticated[\s\S]{0,80}status:\s*401/
    );
  });

  it('PATCH /api/tasks/[id] rejects callers who are neither admin, council, owner, nor assignee', () => {
    expect(tasksPatchRoute).toMatch(/!isPrivileged && !isOwner && !isAssignee/);
    expect(tasksPatchRoute).toMatch(
      /do not have permission to update this task[\s\S]{0,80}status:\s*403/
    );
  });

  it('PATCH /api/tasks/[id] requires an approved submission for non-privileged review→done', () => {
    // Guard block: status==='done', current status==='review', caller not privileged.
    expect(tasksPatchRoute).toMatch(
      /input\.status === 'done'[\s\S]{0,120}existingTask\.status === 'review'[\s\S]{0,60}!isPrivileged/
    );
    // Must check task_submissions for an approved row by this user.
    expect(tasksPatchRoute).toMatch(/task_submissions/);
    expect(tasksPatchRoute).toMatch(/review_status['"],?\s*['"]approved['"]/);
    expect(tasksPatchRoute).toMatch(
      /Approved submission required[\s\S]{0,80}status:\s*403/
    );
  });

  it('PATCH /api/tasks/[id] surfaces the underlying error on update failure', () => {
    // The old handler swallowed the real message and always returned a
    // generic "Failed to update task". The fix forwards `error.message` so
    // the drag-and-drop client can render something actionable.
    expect(tasksPatchRoute).toMatch(
      /error\.message \|\| 'Failed to update task'/
    );
  });
});
