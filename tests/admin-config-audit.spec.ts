import { expect, test } from '@playwright/test';
import {
  BASE_URL,
  addSessionCookieToPage,
  buildSessionCookie,
  cookieHeader,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Admin settings page structure', () => {
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
    const id = runId('admin_settings_page_qa');
    const pass = 'AdminSettingsPageQa!123';
    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Admin Settings Page QA',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);
  });

  test.afterAll(async () => {
    if (missing.length > 0 || !adminUserId) return;
    const supabaseAdmin = createAdminClient();
    await deleteQaUser(supabaseAdmin, adminUserId);
  });

  test('settings page exposes tabs and content panel', async ({ page }) => {
    test.skip(!adminUserId, 'Requires admin fixture');

    await addSessionCookieToPage(page, adminCookie);
    await page.goto(`${BASE_URL}/en/admin/settings`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('admin-settings-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('admin-settings-tabs')).toBeVisible();
    await expect(page.getByTestId('admin-settings-content')).toBeVisible();
  });
});

test.describe('Admin settings config audit requirements', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };
  let orgId = '';
  let originalOrgConfig: Record<string, unknown> | null = null;
  let originalVotingConfig: Record<string, unknown> | null = null;

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('admin_config_audit_qa');
    const password = 'AdminConfigAuditQa!123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password,
      name: 'Admin Config QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, password);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password,
      name: 'Admin Config QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, password);

    const { data: org } = await supabaseAdmin
      .from('orgs')
      .select('id, governance_policy, sprint_policy, rewards_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    orgId = org?.id ?? '';
    originalOrgConfig = org ?? null;

    const { data: voting } = await supabaseAdmin
      .from('voting_config')
      .select(
        'id, org_id, quorum_percentage, approval_threshold, voting_duration_days, proposal_threshold_org, proposer_cooldown_days, max_live_proposals, abstain_counts_toward_quorum'
      )
      .eq('org_id', orgId)
      .single();
    originalVotingConfig = voting ?? null;
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();

    if (orgId && originalOrgConfig) {
      await supabaseAdmin
        .from('orgs')
        .update({
          governance_policy: originalOrgConfig.governance_policy ?? {},
          sprint_policy: originalOrgConfig.sprint_policy ?? {},
          rewards_config: originalOrgConfig.rewards_config ?? {},
        })
        .eq('id', orgId);
    }

    if (orgId && originalVotingConfig) {
      await supabaseAdmin
        .from('voting_config')
        .update({
          quorum_percentage: originalVotingConfig.quorum_percentage,
          approval_threshold: originalVotingConfig.approval_threshold,
          voting_duration_days: originalVotingConfig.voting_duration_days,
          proposal_threshold_org: originalVotingConfig.proposal_threshold_org,
          proposer_cooldown_days: originalVotingConfig.proposer_cooldown_days,
          max_live_proposals: originalVotingConfig.max_live_proposals,
          abstain_counts_toward_quorum: originalVotingConfig.abstain_counts_toward_quorum,
        })
        .eq('org_id', orgId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('rejects settings update when reason is missing', async ({ request }) => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const res = await request.patch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        default_sprint_capacity: 111,
      },
    });

    expect(res.status()).toBe(400);
  });

  test('writes append-only audit events for config updates with reason', async ({ request }) => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const reason = `Task8 QA policy update ${Date.now()}`;
    const res = await request.patch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        reason,
        quorum_percentage: 9,
        governance_policy: {
          qualification_threshold_percent: 7,
          anti_spam_min_hours_between_proposals: 24,
          override_ttl_days: 7,
          override_requires_council_review: true,
        },
        sprint_policy: {
          dispute_window_hours: 48,
          reviewer_sla_hours: 72,
          reviewer_sla_extension_hours: 24,
        },
        rewards_config: {
          enabled: true,
          points_to_token_rate: 100,
          min_claim_threshold: 500,
          default_epoch_pool: 0,
          claim_requires_wallet: true,
          settlement_emission_percent: 0.01,
          settlement_fixed_cap_per_sprint: 10000,
          settlement_carryover_sprint_cap: 3,
          treasury_balance_for_emission: 500,
        },
      },
    });

    expect(res.status()).toBe(200);

    const supabaseAdmin = createAdminClient();
    const { data: rows, error } = await supabaseAdmin
      .from('admin_config_audit_events')
      .select('actor_id, reason, change_scope, previous_payload, new_payload')
      .eq('reason', reason);

    expect(error).toBeNull();
    expect((rows ?? []).length).toBeGreaterThanOrEqual(4);

    const scopes = new Set((rows ?? []).map((row) => row.change_scope));
    expect(scopes.has('voting_config')).toBeTruthy();
    expect(scopes.has('governance_policy')).toBeTruthy();
    expect(scopes.has('sprint_policy')).toBeTruthy();
    expect(scopes.has('rewards_config')).toBeTruthy();

    for (const row of rows ?? []) {
      expect(row.actor_id).toBe(adminUserId);
      expect(row.reason).toBe(reason);
      expect(row.previous_payload).toBeTruthy();
      expect(row.new_payload).toBeTruthy();
    }
  });

  test('forbids non-admin settings update even with reason', async ({ request }) => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const res = await request.patch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        reason: 'Member attempt should fail due to role restrictions.',
        default_sprint_capacity: 123,
      },
    });

    expect(res.status()).toBe(403);
  });
});
