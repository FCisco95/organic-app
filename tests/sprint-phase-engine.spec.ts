import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  buildSessionCookie,
  cookieHeader,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  getFirstOrgId,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Sprint phase engine', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let createdSprintId: string | null = null;
  let createdTaskId: string | null = null;
  let createdSubmissionId: string | null = null;
  let createdDisputeId: string | null = null;
  let canRunLifecycle = true;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('sprint_phase_engine_qa');
    const pass = 'SprintPhase!Qa123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Sprint Phase QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Sprint Phase QA Member',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberUserId = member.id;

    const { data: inFlightSprint } = await supabaseAdmin
      .from('sprints')
      .select('id')
      .in('status', ['active', 'review', 'dispute_window', 'settlement'])
      .limit(1)
      .maybeSingle();
    canRunLifecycle = !inFlightSprint;
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();

    if (createdDisputeId) {
      await supabaseAdmin.from('disputes').delete().eq('id', createdDisputeId);
    }
    if (createdSubmissionId) {
      await supabaseAdmin.from('task_submissions').delete().eq('id', createdSubmissionId);
    }
    if (createdTaskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', createdTaskId);
    }
    if (createdSprintId) {
      await supabaseAdmin.from('sprint_snapshots').delete().eq('sprint_id', createdSprintId);
      await supabaseAdmin.from('sprints').delete().eq('id', createdSprintId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('advances phases and enforces dispute window + settlement blockers', async ({ request }) => {
    test.skip(!canRunLifecycle, 'Skipped: another sprint is already in progress');

    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const createSprintRes = await request.post(`${BASE_URL}/api/sprints`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {
        name: 'QA Sprint Phase Engine',
        start_at: now.toISOString(),
        end_at: end.toISOString(),
        goal: 'Validate phase engine transitions',
      },
    });
    expect(createSprintRes.status()).toBe(200);
    createdSprintId = (await createSprintRes.json()).sprint.id as string;

    const startRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/start`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(startRes.status()).toBe(200);
    expect((await startRes.json()).sprint.status).toBe('active');

    const supabaseAdmin = createAdminClient();
    const orgId = await getFirstOrgId(supabaseAdmin);
    expect(orgId).toBeTruthy();

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        org_id: orgId!,
        title: 'Sprint phase QA task',
        task_type: 'custom',
        status: 'review',
        created_by: adminUserId,
        sprint_id: createdSprintId,
        base_points: 100,
        priority: 'medium',
      })
      .select('id')
      .single();
    createdTaskId = task?.id ?? null;
    expect(createdTaskId).toBeTruthy();

    const { data: submission } = await supabaseAdmin
      .from('task_submissions')
      .insert({
        task_id: createdTaskId!,
        user_id: memberUserId,
        submission_type: 'custom',
        review_status: 'rejected',
        reviewer_id: adminUserId,
        rejection_reason: 'QA rejected for dispute escalation test',
        reviewed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    createdSubmissionId = submission?.id ?? null;
    expect(createdSubmissionId).toBeTruthy();

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .insert({
        submission_id: createdSubmissionId!,
        task_id: createdTaskId!,
        sprint_id: createdSprintId,
        disputant_id: memberUserId,
        reviewer_id: adminUserId,
        tier: 'council',
        status: 'open',
        reason: 'rejected_unfairly',
        evidence_text: 'QA evidence payload',
        xp_stake: 50,
        response_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    createdDisputeId = dispute?.id ?? null;
    expect(createdDisputeId).toBeTruthy();

    const toReviewRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: {},
    });
    expect(toReviewRes.status()).toBe(200);
    expect((await toReviewRes.json()).sprint.status).toBe('review');

    const toDisputeWindowRes = await request.post(
      `${BASE_URL}/api/sprints/${createdSprintId}/complete`,
      {
        headers: { Cookie: cookieHeader(adminCookie) },
        data: {},
      }
    );
    expect(toDisputeWindowRes.status()).toBe(200);
    const toDisputeWindowBody = await toDisputeWindowRes.json();
    expect(toDisputeWindowBody.sprint.status).toBe('dispute_window');
    expect(Number(toDisputeWindowBody.reviewer_sla?.escalated_count ?? 0)).toBeGreaterThanOrEqual(1);

    const { data: escalatedDispute } = await supabaseAdmin
      .from('disputes')
      .select('tier, status, response_deadline')
      .eq('id', createdDisputeId)
      .single();
    expect(escalatedDispute?.tier).toBe('admin');
    expect(escalatedDispute?.status).toBe('under_review');
    expect(new Date(escalatedDispute?.response_deadline ?? 0).getTime()).toBeGreaterThan(Date.now());

    const stillOpenWindowRes = await request.post(
      `${BASE_URL}/api/sprints/${createdSprintId}/complete`,
      {
        headers: { Cookie: cookieHeader(adminCookie) },
        data: {},
      }
    );
    expect(stillOpenWindowRes.status()).toBe(409);

    await supabaseAdmin
      .from('sprints')
      .update({
        dispute_window_ends_at: new Date(Date.now() - 60 * 1000).toISOString(),
      })
      .eq('id', createdSprintId);

    const blockedSettlementRes = await request.post(
      `${BASE_URL}/api/sprints/${createdSprintId}/complete`,
      {
        headers: { Cookie: cookieHeader(adminCookie) },
        data: {},
      }
    );
    expect(blockedSettlementRes.status()).toBe(409);

    await supabaseAdmin
      .from('disputes')
      .update({
        status: 'resolved',
        resolution: 'upheld',
        resolution_notes: 'QA resolution to unblock settlement',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', createdDisputeId);

    const toSettlementRes = await request.post(
      `${BASE_URL}/api/sprints/${createdSprintId}/complete`,
      {
        headers: { Cookie: cookieHeader(adminCookie) },
        data: {},
      }
    );
    expect(toSettlementRes.status()).toBe(200);
    expect((await toSettlementRes.json()).sprint.status).toBe('settlement');

    const toCompletedRes = await request.post(`${BASE_URL}/api/sprints/${createdSprintId}/complete`, {
      headers: { Cookie: cookieHeader(adminCookie) },
      data: { incomplete_action: 'backlog' },
    });
    expect(toCompletedRes.status()).toBe(200);
    const toCompletedBody = await toCompletedRes.json();
    expect(toCompletedBody.sprint.status).toBe('completed');
    expect(toCompletedBody).toHaveProperty('snapshot');
  });

  test('sprint detail exposes phase timeline and readiness anchors', async ({ page }) => {
    test.skip(!createdSprintId, 'Requires lifecycle sprint fixture');

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

    await page.goto(`${BASE_URL}/en/sprints/${createdSprintId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('sprint-detail-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('sprint-detail-phase-timeline')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-blockers-panel')).toBeVisible();
    await expect(page.getByTestId('sprint-detail-readiness-checklist')).toBeVisible();
  });
});
