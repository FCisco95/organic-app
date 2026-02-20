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

test.describe('Proposals lifecycle stage engine', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let memberUserId = '';
  let councilUserId = '';
  let memberCookie = { name: '', value: '' };
  let councilCookie = { name: '', value: '' };
  let proposalId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('proposal_lifecycle_qa');
    const pass = 'LifecycleQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Lifecycle QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });

    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    const council = await createQaUser(supabaseAdmin, {
      email: `${id}.council@example.com`,
      password: pass,
      name: 'Lifecycle QA Council',
      role: 'council',
      organicId: randomOrganicId(),
    });

    councilUserId = council.id;
    councilCookie = await buildSessionCookie(council.email, pass);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (proposalId) {
      await supabaseAdmin.from('proposals').delete().eq('id', proposalId);
    }

    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
    if (councilUserId) await deleteQaUser(supabaseAdmin, councilUserId);
  });

  test('enforces forward-only transitions and version markers', async ({ request, page }) => {
    test.setTimeout(120_000);

    const createRes = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        status: 'public',
        title: 'Lifecycle QA Proposal',
        category: 'governance',
        summary:
          'This is a lifecycle QA summary with enough detail to satisfy the minimum length requirement.',
        motivation:
          'We need deterministic forward-only transitions to ensure governance integrity and avoid ambiguous lifecycle behavior when proposals evolve over time.',
        solution:
          'Introduce an explicit lifecycle stage engine with immutable discussion versions and stage-event logging so every transition and edit remains auditable.',
      },
    });

    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    proposalId = created.id;
    expect(created.status).toBe('public');

    const toQualifiedRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'qualified' },
    });

    expect(toQualifiedRes.status()).toBe(200);
    expect((await toQualifiedRes.json()).status).toBe('qualified');

    const backwardRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'public' },
    });

    expect(backwardRes.status()).toBe(400);

    const toDiscussionRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'discussion' },
    });

    expect(toDiscussionRes.status()).toBe(200);
    expect((await toDiscussionRes.json()).status).toBe('discussion');

    const commentRes = await request.post(`${BASE_URL}/api/proposals/${proposalId}/comments`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { body: 'Comment bound to discussion version v1 for lifecycle QA.' },
    });

    expect(commentRes.status()).toBe(201);

    const updateRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        summary:
          'Updated summary after discussion feedback. This creates a new immutable proposal version for auditability.',
      },
    });

    expect(updateRes.status()).toBe(200);

    const proposalRes = await request.get(`${BASE_URL}/api/proposals/${proposalId}`);
    expect(proposalRes.status()).toBe(200);
    const proposal = await proposalRes.json();

    const currentVersion =
      proposal?.proposal_versions?.version_number ?? proposal?.current_version_number ?? 1;
    expect(currentVersion).toBeGreaterThan(1);

    const commentsRes = await request.get(`${BASE_URL}/api/proposals/${proposalId}/comments`);
    expect(commentsRes.status()).toBe(200);
    const commentsPayload = await commentsRes.json();
    const comment = commentsPayload.comments[0];

    const commentVersion = comment?.proposal_versions?.version_number ?? 1;
    expect(commentVersion).toBeLessThan(currentVersion);

    const baseUrl = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: memberCookie.name,
        value: memberCookie.value,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${BASE_URL}/en/proposals/${proposalId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Updated since this comment')).toBeVisible({ timeout: 20_000 });
  });
});
