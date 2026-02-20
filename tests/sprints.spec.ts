/**
 * Sprints API smoke tests.
 *
 * Covers:
 *  1. List and get sprints (authenticated)
 *  2. Create sprint as admin
 *  3. Start sprint (planning → active), with 409 conflict guard
 *  4. Complete sprint across phased engine
 *     (active → review → dispute_window → settlement → completed)
 *  5. Auth and role enforcement
 *
 * All tests skip when Supabase env vars are absent.
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
  cookieHeader,
  BASE_URL,
} from './helpers';

test.describe('Sprint lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };
  let createdSprintId: string | null = null;
  let canStart = false; // false if another sprint is already active

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('sprints_qa');
    const pass = 'SprintsQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Sprints QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Sprints QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    // Check whether an active sprint already exists (affects start test)
    const { data: active } = await supabaseAdmin
      .from('sprints')
      .select('id')
      .in('status', ['active', 'review', 'dispute_window', 'settlement'])
      .limit(1)
      .maybeSingle();
    canStart = !active;
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();

    if (createdSprintId) {
      // Delete the sprint regardless of final status (test cleanup)
      await supabaseAdmin.from('sprint_snapshots').delete().eq('sprint_id', createdSprintId);
      await supabaseAdmin.from('sprints').delete().eq('id', createdSprintId);
    }
    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('member can list sprints', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('sprints');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.sprints)).toBe(true);
  });

  test('unauthenticated list returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/sprints`);
    expect(res.status()).toBe(401);
  });

  test('admin creates a sprint', async ({ request }) => {
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const res = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        name: 'QA Test Sprint',
        start_at: now.toISOString(),
        end_at: end.toISOString(),
        goal: 'Automated QA smoke run',
        capacity_points: 200,
      },
    });

    expect(res.status()).toBe(200);
    const { sprint } = await res.json();
    expect(sprint.name).toBe('QA Test Sprint');
    expect(sprint.status).toBe('planning');
    createdSprintId = sprint.id;
  });

  test('member cannot create a sprint (403)', async ({ request }) => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const res = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        name: 'Should fail',
        start_at: now.toISOString(),
        end_at: end.toISOString(),
      },
    });
    expect(res.status()).toBe(403);
  });

  test('invalid sprint payload returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { name: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('admin fetches sprint detail', async ({ request }) => {
    test.skip(!createdSprintId, 'Requires sprint creation step');

    const res = await request.get(`${BASE_URL}/api/sprints/${createdSprintId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.sprint.id).toBe(createdSprintId);
    expect(body).toHaveProperty('tasks');
  });

  test('admin updates a sprint', async ({ request }) => {
    test.skip(!createdSprintId, 'Requires sprint creation step');

    const res = await request.patch(`${BASE_URL}/api/sprints/${createdSprintId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { goal: 'Updated QA goal' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).sprint.goal).toBe('Updated QA goal');
  });

  test('admin starts sprint (planning → active)', async ({ request }) => {
    test.skip(!createdSprintId, 'Requires sprint creation step');
    test.skip(!canStart, 'Skipped: another sprint is already active in this environment');

    const res = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/start`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).sprint.status).toBe('active');
  });

  test('starting a second sprint returns 409', async ({ request }) => {
    test.skip(!createdSprintId, 'Requires sprint creation step');
    test.skip(!canStart, 'Skipped: environment already had an active sprint');

    // At this point our sprint is active; creating and starting a second one should conflict
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const createRes = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { name: 'Conflict Sprint', start_at: now.toISOString(), end_at: end.toISOString() },
    });
    expect(createRes.status()).toBe(200);
    const conflictSprintId = (await createRes.json()).sprint.id;

    const startRes = await request.post(`${BASE_URL}/api/sprints/${conflictSprintId}/start`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(startRes.status()).toBe(409);

    // Cleanup the conflict sprint
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('sprints').delete().eq('id', conflictSprintId);
  });

  test('admin completes sprint through phased engine and snapshot is created', async ({
    request,
  }) => {
    test.skip(!createdSprintId, 'Requires sprint creation step');
    test.skip(!canStart, 'Skipped: sprint start was not tested in this environment');

    const toReviewRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toReviewRes.status()).toBe(200);
    expect((await toReviewRes.json()).sprint.status).toBe('review');

    const toWindowRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toWindowRes.status()).toBe(200);
    expect((await toWindowRes.json()).sprint.status).toBe('dispute_window');

    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from('sprints')
      .update({ dispute_window_ends_at: new Date(Date.now() - 60 * 1000).toISOString() })
      .eq('id', createdSprintId);

    const toSettlementRes = await request.post(
      `${BASE_URL}/api/sprints/${createdSprintId}/complete`,
      {
        headers: { Cookie: cookieHeader(adminCookie) },
        data: {},
      }
    );
    expect(toSettlementRes.status()).toBe(200);
    expect((await toSettlementRes.json()).sprint.status).toBe('settlement');

    const toCompletedRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { incomplete_action: 'backlog' },
    });
    expect(toCompletedRes.status()).toBe(200);
    const body = await toCompletedRes.json();
    expect(body.sprint.status).toBe('completed');
    expect(body).toHaveProperty('snapshot');
    expect(body.snapshot).toHaveProperty('completion_rate');
  });
});
