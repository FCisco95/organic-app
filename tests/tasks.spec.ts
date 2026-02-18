/**
 * Tasks API smoke tests.
 *
 * Covers:
 *  1. CRUD auth + role enforcement (unauthenticated → 401, member → 403)
 *  2. Task creation, fetch, update, delete as admin
 *  3. Full submit → review lifecycle (member submits, admin approves)
 *
 * Tests skip automatically when Supabase env vars are absent (e.g. standard CI
 * without secrets). Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * and SUPABASE_SERVICE_ROLE_KEY to enable them.
 */

import { test, expect } from '@playwright/test';
import {
  missingEnvVars,
  createAdminClient,
  createQaUser,
  buildSessionCookie,
  deleteQaUser,
  randomOrganicId,
  runId,
  getFirstOrgId,
  getActiveSprintId,
  insertActiveSprint,
  cookieHeader,
  BASE_URL,
} from './helpers';

// ─── Task CRUD ───────────────────────────────────────────────────────────────

test.describe('Task CRUD', () => {
  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };
  let createdTaskId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('tasks_crud');
    const pass = 'TasksCrud!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Tasks CRUD Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Tasks CRUD Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();
    if (createdTaskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', createdTaskId);
    }
    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('unauthenticated GET returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/tasks/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });

  test('admin creates a task', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'QA Smoke Task',
        task_type: 'custom',
        priority: 'medium',
        base_points: 100,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.task).toHaveProperty('id');
    expect(body.task.title).toBe('QA Smoke Task');
    expect(body.task.status).toBe('backlog');
    createdTaskId = body.task.id;
  });

  test('member cannot create a task (403)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { title: 'Should fail', task_type: 'custom', priority: 'medium' },
    });
    expect(res.status()).toBe(403);
  });

  test('invalid payload returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { title: '', task_type: 'not_a_real_type' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('admin fetches a task', async ({ request }) => {
    test.skip(!createdTaskId, 'Requires task creation test to pass first');

    const res = await request.get(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(res.status()).toBe(200);
    const { task } = await res.json();
    expect(task.id).toBe(createdTaskId);
    expect(task).toHaveProperty('submissions');
  });

  test('admin updates a task', async ({ request }) => {
    test.skip(!createdTaskId, 'Requires task creation test to pass first');

    const res = await request.patch(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { priority: 'high', base_points: 200 },
    });
    expect(res.status()).toBe(200);
    const { task } = await res.json();
    expect(task.priority).toBe('high');
    expect(task.base_points).toBe(200);
  });

  test('admin deletes a task', async ({ request }) => {
    test.skip(!createdTaskId, 'Requires task creation test to pass first');

    const res = await request.delete(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
    createdTaskId = null;
  });
});

// ─── Submission + Review Lifecycle ────────────────────────────────────────────

test.describe('Task submission and review lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };
  let taskId: string | null = null;
  let submissionId: string | null = null;
  let ownedSprintId: string | null = null; // sprint created by this test suite
  let activeSprintId: string | null = null; // whichever sprint to use

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('submit_flow');
    const pass = 'SubmitFlow!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Submit Flow Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Submit Flow Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    // Reuse existing active sprint, or create a fixture sprint via service role
    const existingSprintId = await getActiveSprintId(supabaseAdmin);
    if (existingSprintId) {
      activeSprintId = existingSprintId;
    } else {
      const orgId = await getFirstOrgId(supabaseAdmin);
      if (orgId) {
        ownedSprintId = await insertActiveSprint(supabaseAdmin, orgId, `QA Sprint ${id}`);
        activeSprintId = ownedSprintId;
      }
    }
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();

    // Clean up in reverse dependency order
    if (submissionId) {
      await supabaseAdmin.from('task_submissions').delete().eq('id', submissionId);
    }
    if (taskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', taskId);
    }
    if (ownedSprintId) {
      await supabaseAdmin.from('sprints').delete().eq('id', ownedSprintId);
    }
    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('admin creates task in active sprint', async ({ request }) => {
    test.skip(!activeSprintId, 'No active sprint available — skipping submission flow');

    const res = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'QA Submit Flow Task',
        task_type: 'custom',
        priority: 'medium',
        base_points: 50,
        sprint_id: activeSprintId,
        assignee_id: memberUserId,
      },
    });

    expect(res.status()).toBe(201);
    const { task } = await res.json();
    expect(task.sprint_id).toBe(activeSprintId);
    taskId = task.id;
  });

  test('member submits work', async ({ request }) => {
    test.skip(!taskId, 'Requires task creation step');

    const res = await request.post(`${BASE_URL}/api/tasks/${taskId}/submissions`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        submission_type: 'custom',
        description: 'QA smoke submission from automated test run',
      },
    });

    expect(res.status()).toBe(201);
    const { submission } = await res.json();
    expect(submission.review_status).toBe('pending');
    submissionId = submission.id;
  });

  test('task moves to review status after submission', async ({ request }) => {
    test.skip(!taskId, 'Requires task creation step');

    const res = await request.get(`${BASE_URL}/api/tasks/${taskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).task.status).toBe('review');
  });

  test('admin approves submission', async ({ request }) => {
    test.skip(!submissionId, 'Requires submission step');

    const res = await request.post(`${BASE_URL}/api/submissions/${submissionId}/review`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        action: 'approve',
        quality_score: 4,
        reviewer_notes: 'QA approved by automated test',
      },
    });

    expect(res.status()).toBe(200);
    const { submission } = await res.json();
    expect(submission.review_status).toBe('approved');
    // 50 base_points * 0.8 (quality 4) = 40
    expect(submission.earned_points).toBe(40);
  });

  test('task is marked done after approval', async ({ request }) => {
    test.skip(!taskId, 'Requires task creation step');

    const res = await request.get(`${BASE_URL}/api/tasks/${taskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect((await res.json()).task.status).toBe('done');
  });

  test('member cannot review a submission (403)', async ({ request }) => {
    test.skip(!submissionId, 'Requires submission step');

    const res = await request.post(`${BASE_URL}/api/submissions/${submissionId}/review`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { action: 'approve', quality_score: 5 },
    });
    expect(res.status()).toBe(403);
  });

  test('review with missing rejection_reason returns 400', async ({ request }) => {
    test.skip(!submissionId, 'Requires submission step');

    const res = await request.post(`${BASE_URL}/api/submissions/${submissionId}/review`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { action: 'reject', quality_score: 2 },
    });
    expect(res.status()).toBe(400);
  });
});
