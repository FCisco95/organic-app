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

test.describe('Dispute SLA and evidence hardening', () => {
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
  let disputeCreatedAt: string | null = null;
  let canRun = false;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('dispute_sla_qa');
    const pass = 'DisputeSla!Qa123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Dispute SLA QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Dispute SLA QA Member',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: 50_000,
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    sprintId = await getDisputeWindowSprintId(supabaseAdmin);
    if (!sprintId) {
      const { data: inFlightSprint } = await supabaseAdmin
        .from('sprints')
        .select('id')
        .in('status', ['active', 'review', 'dispute_window', 'settlement'])
        .limit(1)
        .maybeSingle();

      if (!inFlightSprint) {
        const orgId = await getFirstOrgId(supabaseAdmin);
        if (orgId) {
          ownedSprintId = await insertDisputeWindowSprint(
            supabaseAdmin,
            orgId,
            `QA Dispute SLA Sprint ${id}`
          );
          sprintId = ownedSprintId;
        }
      }
    }

    if (!sprintId) {
      return;
    }

    const orgId = await getFirstOrgId(supabaseAdmin);
    if (!orgId) return;

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: `QA Dispute SLA Task ${id}`,
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
        rejection_reason: 'QA fixture for dispute SLA hardening',
        reviewed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    submissionId = submission?.id ?? null;

    canRun = Boolean(submissionId);
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();

    if (disputeId) {
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

  test('rejects unsupported evidence file types', async ({ request }) => {
    test.skip(!canRun, 'No dispute-window sprint fixture available');

    const res = await request.post(`${BASE_URL}/api/disputes/evidence`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      multipart: {
        file: {
          name: 'evidence.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('plain text evidence'),
        },
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error ?? '')).toContain('Unsupported file type');
  });

  test('tags late evidence, blocks uploads after window close, and sweeps overdue SLA', async ({
    request,
  }) => {
    test.skip(!canRun, 'No dispute-window sprint fixture available');
    test.skip(!submissionId || !sprintId, 'Missing fixture ids');

    const createDisputeRes = await request.post(`${BASE_URL}/api/disputes`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        submission_id: submissionId,
        reason: 'rejected_unfairly',
        evidence_text:
          'Initial evidence payload for SLA hardening verification with enough detail.',
        evidence_links: [],
        request_mediation: false,
      },
    });
    expect(createDisputeRes.status()).toBe(201);
    const createDisputeBody = await createDisputeRes.json();
    disputeId = createDisputeBody.data.id as string;
    disputeCreatedAt = createDisputeBody.data.created_at as string;
    const disputeSprintId =
      (createDisputeBody.data.sprint_id as string | null | undefined) ?? sprintId;
    expect(disputeSprintId).toBeTruthy();

    const onTimeUploadRes = await request.post(`${BASE_URL}/api/disputes/evidence`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      multipart: {
        dispute_id: disputeId,
        file: {
          name: 'evidence.png',
          mimeType: 'image/png',
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        },
      },
    });
    expect(onTimeUploadRes.status()).toBe(200);
    const onTimeUploadBody = await onTimeUploadRes.json();
    expect(onTimeUploadBody.data.is_late).toBe(false);

    const supabaseAdmin = createAdminClient();
    const { error: responseDeadlineUpdateError } = await supabaseAdmin
      .from('disputes')
      .update({
        response_deadline: disputeCreatedAt,
      })
      .eq('id', disputeId);
    expect(responseDeadlineUpdateError).toBeNull();

    const lateUploadRes = await request.post(`${BASE_URL}/api/disputes/evidence`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      multipart: {
        dispute_id: disputeId,
        file: {
          name: 'late-evidence.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
      },
    });
    expect(lateUploadRes.status()).toBe(200);
    const lateUploadBody = await lateUploadRes.json();
    expect(lateUploadBody.data.is_late).toBe(true);

    const disputeDetailRes = await request.get(`${BASE_URL}/api/disputes/${disputeId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(disputeDetailRes.status()).toBe(200);
    const disputeDetailBody = await disputeDetailRes.json();
    const lateEvents = (disputeDetailBody.data.evidence_events ?? []).filter(
      (event: { is_late?: boolean }) => event.is_late
    );
    expect(lateEvents.length).toBeGreaterThanOrEqual(1);

    const closedWindowStartIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const closedWindowEndIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { error: closeWindowError } = await supabaseAdmin
      .from('sprints')
      .update({
        dispute_window_started_at: closedWindowStartIso,
        dispute_window_ends_at: closedWindowEndIso,
      })
      .eq('id', disputeSprintId as string);
    expect(closeWindowError).toBeNull();

    const closedWindowUploadRes = await request.post(`${BASE_URL}/api/disputes/evidence`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      multipart: {
        dispute_id: disputeId,
        file: {
          name: 'blocked.png',
          mimeType: 'image/png',
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        },
      },
    });
    expect(closedWindowUploadRes.status()).toBe(409);

    const { error: reopenWindowError } = await supabaseAdmin
      .from('sprints')
      .update({
        dispute_window_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq('id', disputeSprintId as string);
    expect(reopenWindowError).toBeNull();

    await supabaseAdmin
      .from('disputes')
      .update({
        status: 'open',
        tier: 'council',
        arbitrator_id: null,
        response_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .eq('id', disputeId);

    const { data: sweepResult } = await supabaseAdmin.rpc('sweep_overdue_dispute_reviewer_sla', {
      p_extension_hours: 24,
    });
    expect(Array.isArray(sweepResult)).toBe(true);
    expect(Number(sweepResult?.[0]?.escalated_count ?? 0)).toBeGreaterThanOrEqual(1);

    const { data: escalatedDispute } = await supabaseAdmin
      .from('disputes')
      .select('tier, status, response_deadline')
      .eq('id', disputeId)
      .single();
    expect(escalatedDispute?.tier).toBe('admin');
    expect(escalatedDispute?.status).toBe('under_review');
    expect(new Date(escalatedDispute?.response_deadline ?? 0).getTime()).toBeGreaterThan(
      Date.now()
    );
  });
});
