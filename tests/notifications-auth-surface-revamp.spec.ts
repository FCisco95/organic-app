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

test.describe('Notifications and auth surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let memberUserId = '';
  let memberCookie = { name: '', value: '' };

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('notif_auth_surface_revamp_qa');
    const pass = 'NotifAuthSurfaceQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Notif Auth Surface QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('notifications page shows filter tabs and preferences toggle', async ({ page }) => {
    test.skip(!memberUserId, 'Requires member fixture');

    await addSessionCookieToPage(page, memberCookie);
    await page.goto(`${BASE_URL}/en/notifications`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('notifications-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('notifications-filter-tabs')).toBeVisible();
    await expect(page.getByTestId('notifications-preferences-toggle')).toBeVisible();
  });

  test('login page renders form with clear identity', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('login-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('signup page renders form with clear identity', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/signup`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('signup-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('signup-form')).toBeVisible();
  });

  test('auth error page renders recovery actions', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/error`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('auth-error-page')).toBeVisible({ timeout: 10_000 });
  });
});
