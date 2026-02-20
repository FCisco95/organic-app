import { test, expect } from '@playwright/test';
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

test.describe('Proposal task provenance flow', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let taskId: string | null = null;
  let publicProposalId: string | null = null;
  let publicProposalVersionId: string | null = null;
  let finalizedProposalId: string | null = null;
  let finalizedProposalVersionId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('proposal_task_flow');
    const pass = 'ProposalTaskFlow!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Proposal Task QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Proposal Task QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;

    const { data: publicProposal, error: publicProposalError } = await supabaseAdmin
      .from('proposals')
      .insert({
        title: `Task Flow Public Proposal ${id}`,
        body: 'Public proposal used to verify proposal-task creation guard.',
        category: 'governance',
        status: 'public',
        created_by: member.id,
      })
      .select('id, current_version_id')
      .single();

    if (publicProposalError || !publicProposal) {
      throw publicProposalError ?? new Error('Failed to create public proposal fixture');
    }

    publicProposalId = publicProposal.id;
    publicProposalVersionId = publicProposal.current_version_id;

    const { data: finalizedProposal, error: finalizedProposalError } = await supabaseAdmin
      .from('proposals')
      .insert({
        title: `Task Flow Finalized Proposal ${id}`,
        body: 'Finalized proposal used to verify immutable provenance linkage.',
        category: 'governance',
        status: 'finalized',
        result: 'passed',
        created_by: member.id,
      })
      .select('id, current_version_id')
      .single();

    if (finalizedProposalError || !finalizedProposal) {
      throw finalizedProposalError ?? new Error('Failed to create finalized proposal fixture');
    }

    finalizedProposalId = finalizedProposal.id;
    finalizedProposalVersionId = finalizedProposal.current_version_id;
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (taskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', taskId);
    }
    if (publicProposalId) {
      await supabaseAdmin.from('proposals').delete().eq('id', publicProposalId);
    }
    if (finalizedProposalId) {
      await supabaseAdmin.from('proposals').delete().eq('id', finalizedProposalId);
    }
    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('enforces finalized/passed gate and immutable proposal provenance', async ({ request, page }) => {
    test.setTimeout(120_000);

    test.skip(!publicProposalId || !finalizedProposalId, 'Fixture proposals are required');
    test.skip(
      !publicProposalVersionId || !finalizedProposalVersionId,
      'Fixture proposal versions are required'
    );

    const blockedCreate = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'Should fail from public proposal',
        task_type: 'custom',
        priority: 'medium',
        proposal_id: publicProposalId,
        proposal_version_id: publicProposalVersionId,
      },
    });

    expect(blockedCreate.status()).toBe(400);
    const blockedBody = await blockedCreate.json();
    expect(blockedBody.error).toContain('finalized passed');

    const mismatchedVersionCreate = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'Should fail with mismatched version',
        task_type: 'custom',
        priority: 'medium',
        proposal_id: finalizedProposalId,
        proposal_version_id: publicProposalVersionId,
      },
    });

    expect(mismatchedVersionCreate.status()).toBe(400);
    expect((await mismatchedVersionCreate.json()).error).toContain('current version');

    const createTask = await request.post(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        title: 'QA Execution Task from Finalized Proposal',
        task_type: 'custom',
        priority: 'medium',
        base_points: 42,
        proposal_id: finalizedProposalId,
      },
    });

    expect(createTask.status()).toBe(201);
    const createPayload = await createTask.json();
    expect(createPayload.task).toBeTruthy();
    expect(createPayload.task.proposal_id).toBe(finalizedProposalId);
    expect(createPayload.task.proposal_version_id).toBe(finalizedProposalVersionId);
    taskId = createPayload.task.id;

    const getTask = await request.get(`${BASE_URL}/api/tasks/${taskId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });

    expect(getTask.status()).toBe(200);
    const getPayload = await getTask.json();
    expect(getPayload.task.proposal.id).toBe(finalizedProposalId);
    expect(getPayload.task.proposal_version.version_number).toBe(1);

    const supabaseAdmin = createAdminClient();
    const { error: mutationError } = await supabaseAdmin
      .from('tasks')
      .update({
        proposal_id: publicProposalId,
        proposal_version_id: publicProposalVersionId,
      })
      .eq('id', taskId as string);

    expect(mutationError).toBeTruthy();
    expect(mutationError?.message ?? '').toContain('immutable');

    const { data: persistedTask, error: persistedTaskError } = await supabaseAdmin
      .from('tasks')
      .select('proposal_id, proposal_version_id')
      .eq('id', taskId as string)
      .single();

    expect(persistedTaskError).toBeNull();
    expect(persistedTask?.proposal_id).toBe(finalizedProposalId);
    expect(persistedTask?.proposal_version_id).toBe(finalizedProposalVersionId);

    const baseUrl = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: adminCookie.name,
        value: adminCookie.value,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${BASE_URL}/en/tasks/${taskId as string}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading task...')).not.toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Governance source')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Immutable proposal reference')).toBeVisible({ timeout: 20_000 });
  });
});
