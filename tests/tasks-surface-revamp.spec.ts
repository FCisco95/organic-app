import { test, expect } from '@playwright/test';
import {
  addSessionCookieToPage,
  BASE_URL,
  buildSessionCookie,
  cookieHeader,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  getActiveSprintId,
  getFirstOrgId,
  insertActiveSprint,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Tasks surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let ownedSprintId: string | null = null;
  let activeSprintId: string | null = null;
  let blockerTaskId: string | null = null;
  let primaryTaskId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async ({ request }) => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('tasks_surface_revamp_qa');
    const pass = 'TasksSurfaceQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Tasks Surface QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Tasks Surface QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;

    const existingSprintId = await getActiveSprintId(supabaseAdmin);
    if (existingSprintId) {
      activeSprintId = existingSprintId;
    } else {
      const orgId = await getFirstOrgId(supabaseAdmin);
      if (orgId) {
        ownedSprintId = await insertActiveSprint(supabaseAdmin, orgId, `Tasks Surface Sprint ${id}`);
        activeSprintId = ownedSprintId;
      }
    }

    const blockerRes = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'Surface blocker task',
        description: 'Dependency source task for surface revamp QA checks.',
        task_type: 'custom',
        priority: 'medium',
        base_points: 10,
        sprint_id: activeSprintId,
      },
    });

    expect(blockerRes.status()).toBe(201);
    blockerTaskId = (await blockerRes.json()).task.id;

    const primaryRes = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'Surface operator task',
        description: 'Primary task used to verify list/detail execution cockpit surfaces.',
        task_type: 'custom',
        priority: 'high',
        base_points: 60,
        sprint_id: activeSprintId,
        assignee_id: memberUserId,
      },
    });

    expect(primaryRes.status()).toBe(201);
    primaryTaskId = (await primaryRes.json()).task.id;

    if (primaryTaskId && blockerTaskId) {
      await supabaseAdmin.from('task_dependencies').insert({
        task_id: primaryTaskId,
        depends_on_task_id: blockerTaskId,
        created_by: adminUserId,
      });
    }
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (primaryTaskId) {
      await supabaseAdmin.from('task_dependencies').delete().eq('task_id', primaryTaskId);
    }

    if (primaryTaskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', primaryTaskId);
    }

    if (blockerTaskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', blockerTaskId);
    }

    if (ownedSprintId) {
      await supabaseAdmin.from('sprints').delete().eq('id', ownedSprintId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('shows execution cockpit and filter hierarchy on tasks list', async ({ page }) => {
    test.skip(!primaryTaskId, 'Requires primary task fixture');

    await addSessionCookieToPage(page, adminCookie, BASE_URL);

    await page.goto(`${BASE_URL}/en/tasks`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('tasks-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('tasks-execution-cockpit')).toBeVisible();
    await expect(page.getByTestId('tasks-sprint-context-banner')).toBeVisible();
    await expect(page.getByTestId('tasks-status-lanes')).toBeVisible();
    await expect(page.getByTestId('tasks-filters-bar')).toBeVisible();
    await expect(page.getByTestId('tasks-filter-search')).toBeVisible();
    await expect(page.getByTestId(`task-card-${primaryTaskId}`)).toBeVisible({ timeout: 20_000 });
  });

  test('shows operator action zones on task detail', async ({ page }) => {
    test.skip(!primaryTaskId, 'Requires primary task fixture');

    await addSessionCookieToPage(page, adminCookie, BASE_URL);

    await page.goto(`${BASE_URL}/en/tasks/${primaryTaskId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('task-detail-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('task-operator-layout')).toBeVisible();
    await expect(page.getByTestId('task-delivery-checklist')).toBeVisible();
    await expect(page.getByTestId('task-submission-cta-block')).toBeVisible();
    await expect(page.getByTestId('task-dependency-surface')).toBeVisible();
    await expect(page.getByTestId('task-submissions-surface')).toBeVisible();
  });
});
