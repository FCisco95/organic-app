import { test, expect } from '@playwright/test';
import {
  addSessionCookieToPage,
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

test.describe('Proposals surface revamp', () => {
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
    const id = runId('proposal_surface_revamp_qa');
    const pass = 'ProposalSurfaceQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Proposal Surface QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });

    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    const council = await createQaUser(supabaseAdmin, {
      email: `${id}.council@example.com`,
      password: pass,
      name: 'Proposal Surface QA Council',
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

  test('shows governance signal strip and detail decision rail anchors', async ({ request, page }) => {
    test.setTimeout(120_000);

    const createRes = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        status: 'public',
        title: 'Surface revamp QA proposal',
        category: 'governance',
        summary:
          'This proposal validates wave-2 governance surface trust rails and clear decision context for contributors.',
        motivation:
          'Members need faster context and stronger confidence signals when deciding where to participate during each governance stage.',
        solution:
          'Introduce explicit governance signal strips, lifecycle decision rails, immutable provenance context, and stable UI anchors for quality checks.',
      },
    });

    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    proposalId = created.id;

    const toQualifiedRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'qualified' },
    });
    expect(toQualifiedRes.status()).toBe(200);

    const toDiscussionRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'discussion' },
    });
    expect(toDiscussionRes.status()).toBe(200);

    const commentRes = await request.post(`${BASE_URL}/api/proposals/${proposalId}/comments`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { body: 'Surface revamp QA comment to create version context.' },
    });
    expect(commentRes.status()).toBe(201);

    const updateRes = await request.patch(`${BASE_URL}/api/proposals/${proposalId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        summary:
          'Updated summary after discussion feedback to validate version context and outdated comment signals in the decision rail.',
      },
    });
    expect(updateRes.status()).toBe(200);

    await addSessionCookieToPage(page, memberCookie, BASE_URL);

    await page.goto(`${BASE_URL}/en/proposals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('proposals-governance-strip')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('proposals-stage-chips')).toBeVisible();
    await expect(page.getByTestId('proposals-cta-primary')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('proposals-cta-secondary')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(`proposal-card-${proposalId}`)).toBeVisible({ timeout: 20_000 });

    await page.goto(`${BASE_URL}/en/proposals/${proposalId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('proposal-showcase')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('proposal-decision-rail')).toBeVisible();
    await expect(page.getByTestId('proposal-vote-window')).toBeVisible();
    await expect(page.getByTestId('proposal-version-context')).toBeVisible();
    await expect(page.getByTestId('proposal-provenance-callout')).toBeVisible();
  });
});
