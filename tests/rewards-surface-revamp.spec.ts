import { test, expect } from '@playwright/test';
import {
  addSessionCookieToPage,
  BASE_URL,
  buildSessionCookie,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Rewards surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };
  let seededPendingClaimId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('rewards_surface_revamp_qa');
    const pass = 'RewardsSurfaceQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Rewards Surface QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Rewards Surface QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    const oldCreatedAt = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();

    const { data: seededClaim } = await supabaseAdmin
      .from('reward_claims')
      .insert({
        user_id: memberUserId,
        points_amount: 900,
        token_amount: 9,
        conversion_rate: 100,
        status: 'pending',
        created_at: oldCreatedAt,
      })
      .select('id')
      .single();

    seededPendingClaimId = seededClaim?.id ?? null;
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (seededPendingClaimId) {
      await supabaseAdmin.from('reward_claims').delete().eq('id', seededPendingClaimId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('member page shows claimability, settlement posture, and guidance', async ({ page }) => {
    await addSessionCookieToPage(page, memberCookie, BASE_URL);

    await page.goto(`${BASE_URL}/en/rewards`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('rewards-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('rewards-trust-panel')).toBeVisible();
    await expect(page.getByTestId('rewards-claimability-panel')).toBeVisible();
    await expect(page.getByTestId('rewards-claim-flow-panel')).toBeVisible();
    await expect(page.getByTestId('rewards-settlement-panel')).toBeVisible();
    await expect(page.getByTestId('rewards-claim-guidance')).toBeVisible();

    await page.getByTestId('rewards-tab-distributions').click();
    await expect(page.getByTestId('rewards-history-section')).toBeVisible();
  });

  test('admin page surfaces pending triage, risk markers, and payout guardrails', async ({ page }) => {
    await addSessionCookieToPage(page, adminCookie, BASE_URL);

    await page.goto(`${BASE_URL}/en/admin/rewards`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('admin-rewards-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('rewards-admin-command-deck')).toBeVisible();
    await expect(page.getByTestId('rewards-admin-pending-triage')).toBeVisible();
    await expect(page.getByTestId('rewards-admin-payout-guardrails')).toBeVisible();
    await expect(page.getByTestId('rewards-admin-distribution-integrity')).toBeVisible();
    await expect(page.locator('[data-testid="rewards-claim-risk-urgent"] >> visible=true').first()).toBeVisible();

    await page.getByTestId('rewards-admin-tab-distributions').click();
    await expect(
      page.locator(
        '[data-testid=\"rewards-distributions-table\"], [data-testid=\"rewards-distributions-empty\"]'
      )
    ).toBeVisible();
  });
});
