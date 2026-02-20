import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  buildSessionCookie,
  cookieHeader,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Sprints surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let adminCookie = { name: '', value: '' };
  let createdSprintId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async ({ request }) => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('sprints_surface_revamp_qa');
    const pass = 'SprintsSurfaceQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Sprints Surface QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });

    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const createRes = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        name: `Sprints Surface Sprint ${id}`,
        start_at: now.toISOString(),
        end_at: end.toISOString(),
        goal: 'Validate sprint surface command deck and operator rails.',
        capacity_points: 180,
      },
    });

    expect(createRes.status()).toBe(200);
    createdSprintId = (await createRes.json()).sprint.id;
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (createdSprintId) {
      await supabaseAdmin.from('sprint_snapshots').delete().eq('sprint_id', createdSprintId);
      await supabaseAdmin.from('sprints').delete().eq('id', createdSprintId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
  });

  test('shows sprint board command deck anchors', async ({ page }) => {
    const baseUrl = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: adminCookie.name,
        value: adminCookie.value,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${BASE_URL}/en/sprints`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('sprints-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('sprints-command-deck')).toBeVisible();
    await expect(page.getByTestId('sprints-phase-rail')).toBeVisible();
    await expect(page.getByTestId('sprints-phase-chip-planning')).toBeVisible();
    await expect(page.getByTestId('sprints-settlement-panel')).toBeVisible();
    await expect(page.getByTestId('sprints-view-tabs')).toBeVisible();
  });

  test('shows sprint detail operator rail anchors', async ({ page }) => {
    test.skip(!createdSprintId, 'Requires created sprint fixture');

    const baseUrl = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: adminCookie.name,
        value: adminCookie.value,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${BASE_URL}/en/sprints/${createdSprintId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('sprint-detail-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('sprint-detail-header')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-operator-grid')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-phase-timeline')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-blockers-panel')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-readiness-checklist')).toBeVisible();
  });
});
