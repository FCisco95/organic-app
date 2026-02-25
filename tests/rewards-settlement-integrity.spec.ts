import { test, expect, type APIRequestContext } from '@playwright/test';
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

async function cleanupSprintArtifacts(sprintId: string) {
  const supabaseAdmin = createAdminClient();
  const nowMs = Date.now();
  const { error: releaseError } = await supabaseAdmin
    .from('sprints')
    .update({
      settlement_integrity_flags: [],
      reward_settlement_status: 'pending',
      reward_settlement_kill_switch_at: null,
      dispute_window_started_at: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
      dispute_window_ends_at: new Date(nowMs - 60 * 60 * 1000).toISOString(),
      settlement_blocked_reason: null,
    })
    .eq('id', sprintId);
  if (releaseError) {
    throw releaseError;
  }

  // Best effort to release in-flight lock before hard cleanup.
  await supabaseAdmin
    .from('sprints')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      settlement_blocked_reason: 'qa cleanup reset',
    })
    .eq('id', sprintId);
}

async function cleanupStaleQaRewardsSprints() {
  const supabaseAdmin = createAdminClient();
  const { data: staleSprints, error: staleError } = await supabaseAdmin
    .from('sprints')
    .select('id')
    .in('status', ['active', 'review', 'dispute_window', 'settlement'])
    .ilike('name', 'QA Rewards Integrity%');

  if (staleError) {
    throw staleError;
  }

  for (const sprint of staleSprints ?? []) {
    await cleanupSprintArtifacts(sprint.id);
  }
}

test.describe('Rewards settlement integrity', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let orgId: string | null = null;
  let originalRewardsConfig: unknown = null;
  let canRun = true;

  async function createSettlementSprint(
    request: APIRequestContext,
    name: string
  ): Promise<string> {
    await cleanupStaleQaRewardsSprints();

    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const createRes = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        name,
        start_at: now.toISOString(),
        end_at: end.toISOString(),
        reward_pool: 0,
      },
    });
    expect(createRes.status()).toBe(200);
    const sprintId = (await createRes.json()).sprint.id as string;

    const startRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/start`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    const startBody = await startRes.json();
    expect(startRes.status(), JSON.stringify(startBody)).toBe(200);

    const toReviewRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toReviewRes.status()).toBe(200);
    expect((await toReviewRes.json()).sprint.status).toBe('review');

    const toWindowRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toWindowRes.status()).toBe(200);
    expect((await toWindowRes.json()).sprint.status).toBe('dispute_window');

    const supabaseAdmin = createAdminClient();
    const nowMs = Date.now();
    const { error: closeWindowError } = await supabaseAdmin
      .from('sprints')
      .update({
        dispute_window_started_at: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
        dispute_window_ends_at: new Date(nowMs - 60 * 60 * 1000).toISOString(),
      })
      .eq('id', sprintId);
    expect(closeWindowError).toBeNull();

    const toSettlementRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toSettlementRes.status()).toBe(200);
    expect((await toSettlementRes.json()).sprint.status).toBe('settlement');

    return sprintId;
  }

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
    test.skip(!canRun, 'Skipped: another sprint is already in progress in this environment');
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('rewards_settlement_integrity_qa');
    const pass = 'RewardsSettlementQa!123';

    await cleanupStaleQaRewardsSprints();

    const { data: inFlight } = await supabaseAdmin
      .from('sprints')
      .select('id')
      .in('status', ['active', 'review', 'dispute_window', 'settlement'])
      .limit(1)
      .maybeSingle();
    canRun = !inFlight;

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Rewards Settlement QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Rewards Settlement QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;

    const { data: org } = await supabaseAdmin
      .from('orgs')
      .select('id, rewards_config')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    orgId = org?.id ?? null;
    originalRewardsConfig = org?.rewards_config ?? null;
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();

    if (orgId) {
      await supabaseAdmin
        .from('orgs')
        .update({ rewards_config: originalRewardsConfig })
        .eq('id', orgId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('blocks settlement when reward pool exceeds emission cap', async ({ request }) => {
    const sprintId = await createSettlementSprint(
      request,
      `QA Rewards Integrity Hold ${Date.now()}`
    );

    const supabaseAdmin = createAdminClient();

    await supabaseAdmin
      .from('orgs')
      .update({
        rewards_config: {
          enabled: true,
          points_to_token_rate: 100,
          min_claim_threshold: 500,
          default_epoch_pool: 0,
          claim_requires_wallet: true,
          settlement_fixed_cap_per_sprint: 10,
          settlement_emission_percent: 0.01,
          settlement_carryover_sprint_cap: 3,
          treasury_balance_for_emission: 500,
        },
      })
      .eq('id', orgId!);

    await supabaseAdmin
      .from('sprints')
      .update({ reward_pool: 25 })
      .eq('id', sprintId);

    const completeRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { incomplete_action: 'backlog' },
    });
    expect(completeRes.status()).toBe(409);
    const completeBody = await completeRes.json();
    expect(completeBody.reward_settlement?.code).toBe('EMISSION_CAP_BREACH');

    const { data: sprintRow } = await supabaseAdmin
      .from('sprints')
      .select('status, reward_settlement_status')
      .eq('id', sprintId)
      .single();
    expect(sprintRow?.status).toBe('settlement');
    expect(sprintRow?.reward_settlement_status).toBe('held');

    const rewardsRes = await request.get(`${BASE_URL}/api/rewards`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(rewardsRes.status()).toBe(200);
    const rewardsBody = await rewardsRes.json();
    expect(rewardsBody.latest_reward_settlement_status).toBe('held');

    await cleanupSprintArtifacts(sprintId);
  });

  test('triggers kill-switch when duplicate epoch settlement path is detected', async ({ request }) => {
    const sprintId = await createSettlementSprint(
      request,
      `QA Rewards Integrity Kill ${Date.now()}`
    );

    const supabaseAdmin = createAdminClient();

    await supabaseAdmin
      .from('orgs')
      .update({
        rewards_config: {
          enabled: true,
          points_to_token_rate: 100,
          min_claim_threshold: 500,
          default_epoch_pool: 0,
          claim_requires_wallet: true,
          settlement_fixed_cap_per_sprint: 1000,
          settlement_emission_percent: 0.01,
          settlement_carryover_sprint_cap: 3,
          treasury_balance_for_emission: 500000,
        },
      })
      .eq('id', orgId!);

    await supabaseAdmin
      .from('sprints')
      .update({ reward_pool: 50 })
      .eq('id', sprintId);

    const { error: seedError } = await supabaseAdmin.from('reward_distributions').insert({
      user_id: memberUserId,
      type: 'epoch',
      sprint_id: sprintId,
      token_amount: 1,
      category: 'epoch_reward',
      reason: 'seed duplicate epoch path',
      created_by: adminUserId,
    });
    expect(seedError).toBeNull();

    const completeRes = await request.post(`${BASE_URL}/api/sprints/${sprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { incomplete_action: 'backlog' },
    });
    expect(completeRes.status()).toBe(409);
    const completeBody = await completeRes.json();
    expect(completeBody.reward_settlement?.code).toBe('SETTLEMENT_KILL_SWITCH');

    const { data: sprintRow } = await supabaseAdmin
      .from('sprints')
      .select('status, reward_settlement_status')
      .eq('id', sprintId)
      .single();
    expect(sprintRow?.status).toBe('settlement');
    expect(sprintRow?.reward_settlement_status).toBe('killed');

    const rewardsRes = await request.get(`${BASE_URL}/api/rewards`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(rewardsRes.status()).toBe(200);
    const rewardsBody = await rewardsRes.json();
    expect(rewardsBody.latest_reward_settlement_status).toBe('killed');

    await cleanupSprintArtifacts(sprintId);
  });
});
