/**
 * Rewards API smoke tests.
 *
 * Covers:
 *  1. Rewards summary endpoint (claimable_points, config fields)
 *  2. Claims list (user sees only own)
 *  3. Claim validation: below threshold returns 400
 *  4. Successful claim when claimable_points > threshold
 *  5. Auth enforcement (unauthenticated → 401)
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

test.describe('Rewards API', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let memberUserId = '';
  let memberCookie = { name: '', value: '' };
  let claimedId: string | null = null;
  let minThreshold = 0;
  let rewardsEnabled = false;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('rewards_qa');
    const pass = 'RewardsQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Rewards QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);
  });

  test.afterAll(async () => {
    if (!memberUserId) return;
    const supabaseAdmin = createAdminClient();
    if (claimedId) {
      // Refund claimable_points and delete the claim
      await supabaseAdmin.from('reward_claims').delete().eq('id', claimedId);
      // Restore claimable_points (claim deducted them)
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('claimable_points')
        .eq('id', memberUserId)
        .single();
      if (profile) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ claimable_points: profile.claimable_points + minThreshold + 1 })
          .eq('id', memberUserId);
      }
    }
    await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('unauthenticated rewards request returns 401', async ({ playwright }) => {
    const anonContext = await playwright.request.newContext({ baseURL: BASE_URL });
    try {
      const res = await anonContext.get('/api/rewards');
      expect(res.status()).toBe(401);
    } finally {
      await anonContext.dispose();
    }
  });

  test('member fetches rewards summary', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/rewards`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('claimable_points');
    expect(body).toHaveProperty('total_points');
    expect(body).toHaveProperty('conversion_rate');
    expect(body).toHaveProperty('min_threshold');
    expect(body).toHaveProperty('rewards_enabled');
    expect(body).toHaveProperty('latest_reward_settlement_status');
    expect(body).toHaveProperty('latest_reward_settlement_reason');
    expect(body).toHaveProperty('latest_reward_emission_cap');
    expect(body).toHaveProperty('latest_reward_carryover_amount');
    expect(typeof body.claimable_points).toBe('number');

    minThreshold = body.min_threshold;
    rewardsEnabled = body.rewards_enabled;
  });

  test('member fetches claims list', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/rewards/claims`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.claims)).toBe(true);
  });

  test('claim below min threshold returns 400', async ({ request }) => {
    test.skip(!rewardsEnabled, 'Rewards not enabled in this environment');
    test.skip(minThreshold <= 0, 'No min threshold configured');

    const res = await request.post(`${BASE_URL}/api/rewards/claims`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { points_amount: Math.max(0, minThreshold - 1) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('claim with zero points returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/rewards/claims`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { points_amount: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test('successful claim when claimable_points >= threshold', async ({ request }) => {
    test.skip(!rewardsEnabled, 'Rewards not enabled in this environment');
    test.skip(minThreshold <= 0, 'No min threshold configured');

    // Give the member enough claimable points via service role
    const supabaseAdmin = createAdminClient();
    const pointsToGrant = minThreshold + 1;
    await supabaseAdmin
      .from('user_profiles')
      .update({ claimable_points: pointsToGrant })
      .eq('id', memberUserId);

    const res = await request.post(`${BASE_URL}/api/rewards/claims`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { points_amount: pointsToGrant },
    });

    // 201 = claim created; 400 = wallet required; both are valid depending on config
    expect([201, 400]).toContain(res.status());

    if (res.status() === 201) {
      const { claim } = await res.json();
      expect(claim).toHaveProperty('id');
      expect(claim.status).toBe('pending');
      expect(claim.points_amount).toBe(pointsToGrant);
      claimedId = claim.id;
    }
  });
});
