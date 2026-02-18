/**
 * Proposals API smoke tests.
 *
 * Covers:
 *  1. Create proposal as verified member
 *  2. Public GET (no auth required)
 *  3. Update draft (submit it)
 *  4. Vote endpoint auth and weight check
 *  5. Delete as author
 *  6. Role enforcement (guest cannot create)
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

test.describe('Proposal lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let memberUserId = '';
  let guestUserId = '';
  let memberCookie = { name: '', value: '' };
  let guestCookie = { name: '', value: '' };
  let proposalId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('proposals_qa');
    const pass = 'ProposalsQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Proposals QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    const guest = await createQaUser(supabaseAdmin, {
      email: `${id}.guest@example.com`,
      password: pass,
      name: 'Proposals QA Guest',
      role: 'guest',
    });
    guestUserId = guest.id;
    guestCookie = await buildSessionCookie(guest.email, pass);
  });

  test.afterAll(async () => {
    if (!memberUserId && !guestUserId) return;
    const supabaseAdmin = createAdminClient();
    if (proposalId) {
      await supabaseAdmin.from('proposals').delete().eq('id', proposalId);
    }
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
    if (guestUserId) await deleteQaUser(supabaseAdmin, guestUserId);
  });

  test('verified member creates a draft proposal', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        title: 'QA Proposal: Improve test coverage',
        category: 'development',
        summary: 'This proposal improves automated test coverage across all core flows.',
        motivation:
          'Currently the project has minimal automated test coverage, which creates risk for regressions during active development.',
        solution:
          'Add Playwright E2E smoke tests grouped by domain: tasks, sprints, proposals, disputes, rewards.',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.status).toBe('draft');
    expect(body.title).toBe('QA Proposal: Improve test coverage');
    proposalId = body.id;
  });

  test('guest cannot create a proposal (403)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(guestCookie) },
      data: {
        title: 'Guest proposal attempt',
        category: 'community',
        summary: 'Should not be allowed for guests.',
        motivation: 'Testing role enforcement for the proposals endpoint.',
        solution: 'Expect a 403 response for users without organic_id.',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated GET returns proposal (public read)', async ({ request }) => {
    test.skip(!proposalId, 'Requires proposal creation step');

    const res = await request.get(`${BASE_URL}/api/proposals/${proposalId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(proposalId);
    expect(body.title).toBe('QA Proposal: Improve test coverage');
  });

  test('invalid proposal payload returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        title: 'Too short', // summary, motivation, solution all missing
        category: 'governance',
        summary: 'Too short', // min 50 chars
        motivation: 'Too short', // min 100 chars
        solution: 'Too short', // min 100 chars
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('author submits a draft proposal', async ({ request }) => {
    test.skip(!proposalId, 'Requires proposal creation step');

    const res = await request.patch(`${BASE_URL}/api/proposals/${proposalId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { status: 'submitted' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('submitted');
  });

  test('vote endpoint returns voting weight for member', async ({ request }) => {
    test.skip(!proposalId, 'Requires proposal creation step');

    // The proposal is 'submitted' (not 'voting'), so can_vote may be false,
    // but the endpoint should return 200 with a weight field.
    const res = await request.get(`${BASE_URL}/api/proposals/${proposalId}/vote`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('can_vote');
    expect(body).toHaveProperty('voting_weight');
    expect(body).toHaveProperty('vote');
  });

  test('casting a vote on non-voting proposal returns 400', async ({ request }) => {
    test.skip(!proposalId, 'Requires proposal creation step');

    const res = await request.post(`${BASE_URL}/api/proposals/${proposalId}/vote`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { value: 'yes' },
    });
    // Proposal is 'submitted', not 'voting' → API returns 400
    expect(res.status()).toBe(400);
  });

  test('author deletes the proposal', async ({ request }) => {
    test.skip(!proposalId, 'Requires proposal creation step');

    // Re-check status — delete is only allowed for draft proposals by author
    // (admin/council can delete any). Since we submitted it, try as admin or skip.
    // For this test: use service role to reset to draft first.
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('proposals').update({ status: 'draft' }).eq('id', proposalId);

    const res = await request.delete(`${BASE_URL}/api/proposals/${proposalId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
    proposalId = null;
  });
});
