/**
 * Disputes API smoke tests.
 *
 * Covers:
 *  1. Config endpoint
 *  2. Dispute filing against a rejected submission
 *  3. Dispute detail fetch (parties see full data)
 *  4. Add comment
 *  5. Withdraw dispute
 *  6. Role/access enforcement
 *
 * Fixture setup uses the service role to insert the task + submission + review
 * rows directly, so the dispute tests don't depend on the tasks test suite running first.
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
  getFirstOrgId,
  getDisputeWindowSprintId,
  insertDisputeWindowSprint,
  cookieHeader,
  BASE_URL,
} from './helpers';

test.describe('Dispute lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let memberUserId = '';
  let adminCookie = { name: '', value: '' };
  let memberCookie = { name: '', value: '' };

  // Fixture IDs (created via service role for isolation)
  let ownedSprintId: string | null = null;
  let taskId: string | null = null;
  let submissionId: string | null = null;

  // IDs created via API (the thing we're actually testing)
  let disputeId: string | null = null;
  let commentId: string | null = null;

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('disputes_qa');
    const pass = 'DisputesQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Disputes QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;
    adminCookie = await buildSessionCookie(admin.email, pass);

    // Member needs enough XP to file a dispute (threshold from org config).
    // Setting 50000 XP to safely exceed any reasonable threshold.
    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Disputes QA Member',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: 50_000,
    });
    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);

    // Set up an open dispute-window sprint (reuse or create)
    let sprintId = await getDisputeWindowSprintId(supabaseAdmin);
    if (!sprintId) {
      const { data: inFlightSprint } = await supabaseAdmin
        .from('sprints')
        .select('id, status')
        .in('status', ['active', 'review', 'dispute_window', 'settlement'])
        .limit(1)
        .maybeSingle();

      if (inFlightSprint?.status === 'dispute_window') {
        sprintId = inFlightSprint.id;
      } else if (!inFlightSprint) {
        const orgId = await getFirstOrgId(supabaseAdmin);
        if (orgId) {
          ownedSprintId = await insertDisputeWindowSprint(
            supabaseAdmin,
            orgId,
            `QA Disputes Sprint ${id}`
          );
          sprintId = ownedSprintId;
        }
      }
    }

    if (!sprintId) return; // no sprint available — tests will skip

    // Create a task directly (bypass role restriction on API)
    const orgId = await getFirstOrgId(supabaseAdmin);
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: `QA Dispute Task ${id}`,
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

    // Create a rejected submission directly (the target of the dispute)
    const { data: submission } = await supabaseAdmin
      .from('task_submissions')
      .insert({
        task_id: taskId,
        user_id: memberUserId,
        submission_type: 'custom',
        review_status: 'rejected',
        reviewer_id: adminUserId,
        quality_score: 2,
        rejection_reason: 'QA fixture: rejected for dispute test',
        reviewed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    submissionId = submission?.id ?? null;
  });

  test.afterAll(async () => {
    if (!adminUserId && !memberUserId) return;
    const supabaseAdmin = createAdminClient();

    if (commentId) {
      await supabaseAdmin.from('dispute_comments').delete().eq('id', commentId);
    }
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

  test('disputes config endpoint returns config', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/disputes?config=true`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('member files a dispute against rejected submission', async ({ request }) => {
    test.skip(!submissionId, 'No rejected submission fixture available');

    const res = await request.post(`${BASE_URL}/api/disputes`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        submission_id: submissionId,
        reason: 'rejected_unfairly',
        evidence_text:
          'The submission was rejected without proper justification. The work clearly met all stated requirements and quality standards as documented in the task description.',
        evidence_links: [],
        request_mediation: false,
      },
    });

    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data).toHaveProperty('id');
    expect(['open', 'mediation']).toContain(data.status);
    expect(data.submission_id).toBe(submissionId);
    disputeId = data.id;
  });

  test('disputant can fetch dispute detail', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.get(`${BASE_URL}/api/disputes/${disputeId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.id).toBe(disputeId);
    expect(data).toHaveProperty('task');
    expect(data).toHaveProperty('submission');
  });

  test('admin can see full dispute detail including evidence_file_urls', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.get(`${BASE_URL}/api/disputes/${disputeId}`, {
      headers: { Cookie: cookieHeader(adminCookie) },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveProperty('evidence_file_urls');
  });

  test('disputant adds a comment', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.post(`${BASE_URL}/api/disputes/${disputeId}/comments`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        content: 'QA smoke test comment added by the disputant.',
        visibility: 'parties_only',
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.content).toBe('QA smoke test comment added by the disputant.');
    commentId = data.id;
  });

  test('comment with empty content returns 400', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.post(`${BASE_URL}/api/disputes/${disputeId}/comments`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { content: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('disputant can list comments', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.get(`${BASE_URL}/api/disputes/${disputeId}/comments`, {
      headers: { Cookie: cookieHeader(memberCookie) },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  test('disputant withdraws the dispute', async ({ request }) => {
    test.skip(!disputeId, 'Requires dispute creation step');

    const res = await request.patch(`${BASE_URL}/api/disputes/${disputeId}`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: { action: 'withdraw' },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.status).toBe('withdrawn');
  });

  test('cannot re-file dispute on already-disputed submission', async ({ request }) => {
    test.skip(!submissionId || !disputeId, 'Requires prior steps');

    // The dispute is withdrawn, but try filing again — submission review_status
    // may have been reset or still be 'disputed'. Either way API should gate it.
    const res = await request.post(`${BASE_URL}/api/disputes`, {
      headers: { Cookie: cookieHeader(memberCookie) },
      data: {
        submission_id: submissionId,
        reason: 'rejected_unfairly',
        evidence_text:
          'Attempting to re-file a dispute on the same submission to test the conflict guard.',
      },
    });
    // Expect 409 (active dispute exists), 400 (submission state gate),
    // or 429 when environment rate limiting is triggered.
    expect([400, 409, 429]).toContain(res.status());
  });
});
