import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  buildSessionCookie,
  cookieHeader,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  getDisputeWindowSprintId,
  getFirstOrgId,
  insertDisputeWindowSprint,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Disputes surface revamp', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };

  let ownedSprintId: string | null = null;
  let sprintId: string | null = null;
  let taskId: string | null = null;
  let submissionId: string | null = null;
  let disputeId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async ({ request }) => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('disputes_surface_revamp_qa');
    const pass = 'DisputesSurfaceQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Disputes Surface QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Disputes Surface QA Member',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: 50_000,
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    sprintId = await getDisputeWindowSprintId(supabaseAdmin);
    if (!sprintId) {
      const orgId = await getFirstOrgId(supabaseAdmin);
      if (orgId) {
        ownedSprintId = await insertDisputeWindowSprint(
          supabaseAdmin,
          orgId,
          `Disputes Surface Sprint ${id}`
        );
        sprintId = ownedSprintId;
      }
    }

    if (!sprintId) return;

    const orgId = await getFirstOrgId(supabaseAdmin);
    if (!orgId) return;

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: `Disputes Surface Task ${id}`,
        task_type: 'custom',
        org_id: orgId,
        created_by: adminUserId,
        sprint_id: sprintId,
        status: 'review',
        base_points: 100,
        priority: 'medium',
      })
      .select('id')
      .single();

    taskId = task?.id ?? null;
    if (!taskId) return;

    const { data: submission } = await supabaseAdmin
      .from('task_submissions')
      .insert({
        task_id: taskId,
        user_id: memberUserId,
        submission_type: 'custom',
        review_status: 'rejected',
        reviewer_id: adminUserId,
        quality_score: 2,
        rejection_reason: 'Surface revamp fixture: rejected for dispute workflow validation.',
        reviewed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    submissionId = submission?.id ?? null;
    if (!submissionId) return;

    const createDisputeRes = await request.post(`${BASE_URL}/api/disputes`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        submission_id: submissionId,
        reason: 'rejected_unfairly',
        evidence_text:
          'Surface revamp evidence payload with enough detail to ensure the dispute is accepted by schema validation.',
        evidence_links: [],
        request_mediation: false,
      },
    });

    if (createDisputeRes.status() !== 201) return;

    const createDisputeBody = await createDisputeRes.json();
    disputeId = createDisputeBody.data.id as string;

    await supabaseAdmin
      .from('disputes')
      .update({
        status: 'awaiting_response',
        tier: 'council',
        response_deadline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', disputeId);

    await request.post(`${BASE_URL}/api/disputes/evidence`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      multipart: {
        dispute_id: disputeId,
        file: {
          name: 'surface-late-evidence.png',
          mimeType: 'image/png',
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        },
      },
    });
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (disputeId) {
      await supabaseAdmin.from('dispute_comments').delete().eq('dispute_id', disputeId);
      await supabaseAdmin.from('disputes').delete().eq('id', disputeId);
    }

    if (submissionId) {
      await supabaseAdmin.from('task_submissions').delete().eq('id', submissionId);
    }

    if (taskId) {
      await supabaseAdmin.from('tasks').delete().eq('id', taskId);
    }

    if (ownedSprintId) {
      await supabaseAdmin.from('sprints').delete().eq('id', ownedSprintId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('queue page exposes triage counters, SLA filters, and escalation controls', async ({ page }) => {
    test.skip(!disputeId, 'Requires dispute fixture');

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

    await page.goto(`${BASE_URL}/en/disputes`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('disputes-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('disputes-command-deck')).toBeVisible();
    await expect(page.getByTestId('disputes-triage-deck')).toBeVisible();
    await expect(page.getByTestId('disputes-sla-counter-overdue')).toBeVisible();
    await expect(page.getByTestId('disputes-sla-counter-at-risk')).toBeVisible();
    await expect(page.getByTestId('disputes-sla-filter-tabs')).toBeVisible();
    await expect(page.getByTestId('disputes-tier-filter-tabs')).toBeVisible();
    await expect(page.getByTestId('disputes-escalation-controls')).toBeVisible();

    await page.getByTestId('disputes-sla-filter-overdue').click();
    await page.getByTestId('disputes-escalation-toggle').click();
    await expect(page.getByTestId(`dispute-card-${disputeId}`)).toBeVisible({ timeout: 20_000 });
  });

  test('detail page exposes integrity rail and late evidence chronology', async ({ page }) => {
    test.skip(!disputeId, 'Requires dispute fixture');

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

    await page.goto(`${BASE_URL}/en/disputes/${disputeId}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('dispute-detail-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('dispute-integrity-rail')).toBeVisible();
    await expect(page.getByTestId('dispute-response-deadline-panel')).toBeVisible();
    await expect(page.getByTestId('dispute-evidence-chronology-panel')).toBeVisible();
    await expect(page.getByTestId('dispute-response-status-panel')).toBeVisible();
    await expect(page.getByTestId('dispute-mediation-path-panel')).toBeVisible();
    await expect(page.getByTestId('dispute-evidence-chronology')).toBeVisible();
    await expect(page.getByTestId('dispute-late-evidence-tag')).toBeVisible();
  });
});
