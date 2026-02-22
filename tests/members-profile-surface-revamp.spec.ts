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

test.describe('Members and profile surface revamp', () => {
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
    const id = runId('members_profile_surface_revamp_qa');
    const pass = 'MembersProfileSurfaceQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Members Profile QA Member',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: 5_000,
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    // Ensure profile is publicly visible for member detail assertions
    await supabaseAdmin
      .from('user_profiles')
      .update({ profile_visible: true })
      .eq('id', memberUserId);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('members directory shows high-signal filters and trust cues on cards', async ({ page }) => {
    test.skip(!memberUserId, 'Requires member fixture');

    await addSessionCookieToPage(page, memberCookie);
    await page.goto(`${BASE_URL}/en/members`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('members-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('members-filter-search')).toBeVisible();
    await expect(page.getByTestId('members-filter-role')).toBeVisible();
    await expect(page.getByTestId('members-grid')).toBeVisible();
  });

  test('member profile page shows header, stats grid, and reputation section', async ({ page }) => {
    test.skip(!memberUserId, 'Requires member fixture');

    await addSessionCookieToPage(page, memberCookie);
    await page.goto(`${BASE_URL}/en/members/${memberUserId}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('member-profile-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('member-profile-header')).toBeVisible();
    await expect(page.getByTestId('member-section-nav')).toBeVisible();
    await expect(
      page.getByTestId('member-section-nav').getByRole('link', { name: 'Overview' })
    ).toBeVisible();
    await expect(page.getByTestId('member-stats-grid')).toBeVisible();
    await expect(page.getByTestId('member-reputation-section')).toBeVisible();
    await expect(page.getByTestId('member-achievements-grid')).toBeVisible();
  });

  test('my profile page shows distinct sections for identity, activity, and preferences', async ({
    page,
  }) => {
    test.skip(!memberUserId, 'Requires member fixture');

    await addSessionCookieToPage(page, memberCookie);
    await page.goto(`${BASE_URL}/en/profile`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('profile-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('profile-identity-section')).toBeVisible();
    await expect(page.getByTestId('profile-activity-section')).toBeVisible();
    await expect(page.getByTestId('profile-privacy-section')).toBeVisible();
    await expect(page.getByTestId('profile-privacy-toggle')).toBeVisible();
    await expect(page.getByTestId('profile-preferences-section')).toBeVisible();
  });
});
