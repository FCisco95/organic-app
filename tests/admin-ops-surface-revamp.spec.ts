import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  addSessionCookieToPage,
  buildSessionCookie,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Admin ops surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let adminCookie = { name: '', value: '' };

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('admin_ops_surface_revamp_qa');
    const pass = 'AdminOpsSurfaceQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Admin Ops Surface QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();
    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
  });

  test('admin settings page shows tabs and content panel', async ({ page }) => {
    test.skip(!adminUserId, 'Requires admin fixture');

    await addSessionCookieToPage(page, adminCookie);
    await page.goto(`${BASE_URL}/en/admin/settings`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('admin-settings-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('admin-settings-tabs')).toBeVisible();
    await expect(page.getByTestId('admin-settings-content')).toBeVisible();
  });

  test('admin submissions page renders the review queue', async ({ page }) => {
    test.skip(!adminUserId, 'Requires admin fixture');

    await addSessionCookieToPage(page, adminCookie);
    await page.goto(`${BASE_URL}/en/admin/submissions`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('admin-submissions-page')).toBeVisible({ timeout: 20_000 });
  });
});
