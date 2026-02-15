import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Role = 'admin' | 'council' | 'member';

type QaUser = {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
};

type JsonRecord = Record<string, unknown>;

type ApiResult = {
  status: number;
  ok: boolean;
  json: unknown;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const KEEP_FIXTURES = process.env.PHASE16_QA_KEEP_FIXTURES === 'true';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown, key: string): string | null {
  if (!isObject(value)) return null;
  const raw = value[key];
  return typeof raw === 'string' ? raw : null;
}

function getNumber(value: unknown, key: string): number | null {
  if (!isObject(value)) return null;
  const raw = value[key];
  return typeof raw === 'number' ? raw : null;
}

async function waitForProfile(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for user_profiles row: ${userId}`);
}

async function createQaUser(
  supabaseAdmin: SupabaseClient,
  input: {
    email: string;
    password: string;
    role: Role;
    xp: number;
    organicId: number;
    name: string;
  }
): Promise<QaUser> {
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    });

  if (createError) throw createError;
  if (!created.user?.id) throw new Error(`No user id returned for ${input.email}`);

  await waitForProfile(supabaseAdmin, created.user.id);

  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      role: input.role,
      xp_total: input.xp,
      organic_id: input.organicId,
      name: input.name,
    })
    .eq('id', created.user.id);

  if (updateError) throw updateError;

  return {
    id: created.user.id,
    email: input.email,
    password: input.password,
    role: input.role,
    name: input.name,
  };
}

async function buildSessionCookie(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<string> {
  const storage: Record<string, string> = {};

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const authEntry = Object.entries(storage).find(([key]) =>
    key.includes('-auth-token')
  );

  if (!authEntry) {
    throw new Error(`No auth token stored after sign-in: ${email}`);
  }

  const [cookieName, rawValue] = authEntry;
  const encoded = `base64-${toBase64Url(rawValue)}`;
  return `${cookieName}=${encoded}`;
}

async function apiRequest(
  cookie: string,
  method: 'GET' | 'POST',
  path: string,
  body?: JsonRecord
): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
  };
}

test.describe('Phase 16 disputes API role matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('validates member/reviewer/council/admin flow end-to-end', async () => {
    test.setTimeout(180_000);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `qa${Date.now()}`;
    const pass = 'Phase16!Pass123';
    const baseOrganic = Math.floor(Date.now() / 1000) % 1000000;
    const createdUserIds: string[] = [];
    const createdTaskIds: string[] = [];
    const results: Array<Record<string, unknown>> = [];

    try {
      const users = {
        admin: await createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          xp: 1000,
          organicId: baseOrganic + 1,
          name: 'QA Admin',
        }),
        council: await createQaUser(supabaseAdmin, {
          email: `${runId}.council@example.com`,
          password: pass,
          role: 'council',
          xp: 1000,
          organicId: baseOrganic + 2,
          name: 'QA Council',
        }),
        reviewer: await createQaUser(supabaseAdmin, {
          email: `${runId}.reviewer@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 3,
          name: 'QA Reviewer',
        }),
        member1: await createQaUser(supabaseAdmin, {
          email: `${runId}.member1@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 4,
          name: 'QA Member One',
        }),
        member2: await createQaUser(supabaseAdmin, {
          email: `${runId}.member2@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 5,
          name: 'QA Member Two',
        }),
      };
      createdUserIds.push(
        users.admin.id,
        users.council.id,
        users.reviewer.id,
        users.member1.id,
        users.member2.id
      );

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([
          {
            title: `[${runId}] Dispute Escalation Task`,
            description: 'Fixture task for phase 16 escalation QA',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'backlog',
            base_points: 100,
            priority: 'medium',
          },
          {
            title: `[${runId}] Dispute Mediation Task`,
            description: 'Fixture task for phase 16 mediation QA',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'backlog',
            base_points: 100,
            priority: 'medium',
          },
        ])
        .select('id, title');

      expect(taskError).toBeNull();
      expect(tasks?.length).toBe(2);

      const taskA = tasks?.[0];
      const taskB = tasks?.[1];
      if (!taskA || !taskB) throw new Error('Failed to create fixture tasks');
      createdTaskIds.push(taskA.id, taskB.id);

      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('task_submissions')
        .insert([
          {
            task_id: taskA.id,
            user_id: users.member1.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/2001',
            description: 'Initial submission for escalation test',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Needs substantial changes',
            reviewer_notes: 'Please improve implementation quality',
          },
          {
            task_id: taskB.id,
            user_id: users.member2.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/2002',
            description: 'Initial submission for mediation test',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Needs substantial changes',
            reviewer_notes: 'Please improve implementation quality',
          },
        ])
        .select('id, task_id');

      expect(submissionsError).toBeNull();
      expect(submissions?.length).toBe(2);

      const submissionA = submissions?.find((item) => item.task_id === taskA.id);
      const submissionB = submissions?.find((item) => item.task_id === taskB.id);
      if (!submissionA || !submissionB) {
        throw new Error('Failed to create fixture submissions');
      }

      const cookies = {
        admin: await buildSessionCookie(
          supabaseUrl,
          anonKey,
          users.admin.email,
          users.admin.password
        ),
        council: await buildSessionCookie(
          supabaseUrl,
          anonKey,
          users.council.email,
          users.council.password
        ),
        reviewer: await buildSessionCookie(
          supabaseUrl,
          anonKey,
          users.reviewer.email,
          users.reviewer.password
        ),
        member1: await buildSessionCookie(
          supabaseUrl,
          anonKey,
          users.member1.email,
          users.member1.password
        ),
        member2: await buildSessionCookie(
          supabaseUrl,
          anonKey,
          users.member2.email,
          users.member2.password
        ),
      };

      const baselinePending = await apiRequest(
        cookies.council,
        'GET',
        '/api/disputes?pending_count=true'
      );
      expect(baselinePending.status).toBe(200);
      const baselinePendingCount = getNumber(baselinePending.json, 'count') ?? 0;
      results.push({
        step: 'Captured baseline pending count',
        pass: true,
        baselinePendingCount,
      });

      const configCheck = await apiRequest(
        cookies.member1,
        'GET',
        '/api/disputes?config=true'
      );
      expect(configCheck.status).toBe(200);
      results.push({
        step: 'Authenticated session cookie works on protected disputes API',
        pass: true,
      });

      const preEligibility = await apiRequest(
        cookies.member1,
        'GET',
        `/api/disputes?check_eligibility=${submissionA.id}`
      );
      expect(preEligibility.status).toBe(200);
      expect(isObject(preEligibility.json) && preEligibility.json.eligible).toBe(true);
      results.push({
        step: 'Member eligibility is true before filing dispute',
        pass: true,
      });

      const createA = await apiRequest(cookies.member1, 'POST', '/api/disputes', {
        submission_id: submissionA.id,
        reason: 'rejected_unfairly',
        evidence_text:
          'This review missed key acceptance criteria and evidence from the PR.',
        evidence_links: [],
        request_mediation: false,
      });
      expect(createA.status).toBe(201);
      const disputeAId = getString(
        isObject(createA.json) ? createA.json.data : null,
        'id'
      );
      expect(disputeAId).toBeTruthy();
      results.push({
        step: 'Member files dispute (escalation path)',
        pass: true,
        disputeId: disputeAId,
      });

      const postEligibility = await apiRequest(
        cookies.member1,
        'GET',
        `/api/disputes?check_eligibility=${submissionA.id}`
      );
      expect(postEligibility.status).toBe(200);
      expect(isObject(postEligibility.json) && postEligibility.json.eligible).toBe(false);
      results.push({
        step: 'Active dispute blocks duplicate filing for same submission',
        pass: true,
      });

      const memberAssignBlocked = await apiRequest(
        cookies.member1,
        'POST',
        `/api/disputes/${disputeAId}/assign`
      );
      expect(memberAssignBlocked.status).toBe(403);
      results.push({
        step: 'Member blocked from arbitrator self-assignment',
        pass: true,
      });

      const reviewerRespond = await apiRequest(
        cookies.reviewer,
        'POST',
        `/api/disputes/${disputeAId}/respond`,
        {
          response_text:
            'The original rejection was based on missing test coverage and failed acceptance checks.',
          response_links: [],
        }
      );
      expect(reviewerRespond.status).toBe(200);
      results.push({
        step: 'Reviewer submits counter-argument',
        pass: true,
      });

      const reviewerResolveBlocked = await apiRequest(
        cookies.reviewer,
        'POST',
        `/api/disputes/${disputeAId}/resolve`,
        {
          resolution: 'upheld',
          resolution_notes: 'Not allowed due to role.',
          new_quality_score: null,
        }
      );
      expect(reviewerResolveBlocked.status).toBe(403);
      results.push({
        step: 'Reviewer blocked from resolving disputes',
        pass: true,
      });

      const councilPending = await apiRequest(
        cookies.council,
        'GET',
        '/api/disputes?pending_count=true'
      );
      expect(councilPending.status).toBe(200);
      const councilPendingCount = getNumber(councilPending.json, 'count') ?? 0;
      expect(councilPendingCount).toBeGreaterThanOrEqual(baselinePendingCount + 1);
      results.push({
        step: 'Council pending count reflects open disputes',
        pass: true,
        count: councilPendingCount,
      });

      const councilStatsBefore = await apiRequest(
        cookies.council,
        'GET',
        '/api/disputes?stats=true'
      );
      expect(councilStatsBefore.status).toBe(200);
      const beforeStats = isObject(councilStatsBefore.json)
        ? (councilStatsBefore.json.data as JsonRecord | undefined)
        : undefined;
      const resolvedBefore =
        (beforeStats ? getNumber(beforeStats, 'resolved_count') : null) ?? 0;

      const councilAssign = await apiRequest(
        cookies.council,
        'POST',
        `/api/disputes/${disputeAId}/assign`
      );
      expect(councilAssign.status).toBe(200);

      const councilResolve = await apiRequest(
        cookies.council,
        'POST',
        `/api/disputes/${disputeAId}/resolve`,
        {
          resolution: 'upheld',
          resolution_notes:
            'Council reviewed both sides and upheld the original review decision.',
          new_quality_score: null,
        }
      );
      expect(councilResolve.status).toBe(200);
      results.push({
        step: 'Council assigns self and resolves dispute',
        pass: true,
      });

      const councilStatsAfter = await apiRequest(
        cookies.council,
        'GET',
        '/api/disputes?stats=true'
      );
      expect(councilStatsAfter.status).toBe(200);
      const afterStats = isObject(councilStatsAfter.json)
        ? (councilStatsAfter.json.data as JsonRecord | undefined)
        : undefined;
      const resolvedAfter =
        (afterStats ? getNumber(afterStats, 'resolved_count') : null) ?? 0;
      expect(resolvedAfter).toBeGreaterThanOrEqual(resolvedBefore + 1);
      results.push({
        step: 'Council resolved_count increments in stats',
        pass: true,
        resolvedCountBefore: resolvedBefore,
        resolvedCountAfter: resolvedAfter,
      });

      const appealA = await apiRequest(
        cookies.member1,
        'POST',
        `/api/disputes/${disputeAId}/appeal`,
        {
          appeal_reason:
            'I disagree with the council decision and request an admin review.',
        }
      );
      expect(appealA.status).toBe(200);
      results.push({
        step: 'Disputant appeals council ruling to admin',
        pass: true,
      });

      const adminAssign = await apiRequest(
        cookies.admin,
        'POST',
        `/api/disputes/${disputeAId}/assign`
      );
      expect(adminAssign.status).toBe(200);

      const adminResolve = await apiRequest(
        cookies.admin,
        'POST',
        `/api/disputes/${disputeAId}/resolve`,
        {
          resolution: 'dismissed',
          resolution_notes:
            'Admin final review determined no grounds to overturn council ruling.',
          new_quality_score: null,
        }
      );
      expect(adminResolve.status).toBe(200);
      results.push({
        step: 'Admin performs final ruling on appealed dispute',
        pass: true,
      });

      const createB = await apiRequest(cookies.member2, 'POST', '/api/disputes', {
        submission_id: submissionB.id,
        reason: 'low_quality_score',
        evidence_text:
          'The score does not match the quality rubric and documented work output.',
        evidence_links: [],
        request_mediation: true,
      });
      expect(createB.status).toBe(201);
      const disputeBId = getString(
        isObject(createB.json) ? createB.json.data : null,
        'id'
      );
      expect(disputeBId).toBeTruthy();

      const mediateFirst = await apiRequest(
        cookies.member2,
        'POST',
        `/api/disputes/${disputeBId}/mediate`,
        {
          agreed_outcome:
            'Both parties agree to close this dispute with a neutral mediated resolution.',
        }
      );
      expect(mediateFirst.status).toBe(202);
      expect(
        isObject(mediateFirst.json) && mediateFirst.json.pending_confirmation
      ).toBe(true);
      results.push({
        step: 'First mediation confirmation returns pending (202)',
        pass: true,
      });

      const mediateSecond = await apiRequest(
        cookies.reviewer,
        'POST',
        `/api/disputes/${disputeBId}/mediate`,
        {
          agreed_outcome:
            'Both parties agree to close this dispute with a neutral mediated resolution.',
        }
      );
      expect(mediateSecond.status).toBe(200);
      expect(
        getString(isObject(mediateSecond.json) ? mediateSecond.json.data : null, 'status')
      ).toBe('mediated');
      results.push({
        step: 'Second party confirms mediation and dispute closes as mediated',
        pass: true,
      });

      const finalPending = await apiRequest(
        cookies.council,
        'GET',
        '/api/disputes?pending_count=true'
      );
      expect(finalPending.status).toBe(200);
      const finalPendingCount = getNumber(finalPending.json, 'count') ?? -1;
      expect(finalPendingCount).toBe(baselinePendingCount);
      results.push({
        step: 'Pending dispute count returns to baseline after closures',
        pass: true,
        baselinePendingCount,
        finalPendingCount,
      });

      await test.info().attach('phase16-role-matrix-results', {
        contentType: 'application/json',
        body: Buffer.from(
          JSON.stringify(
            {
              ok: true,
              baseUrl: BASE_URL,
              keepFixtures: KEEP_FIXTURES,
              fixture: {
                runId,
                taskAId: taskA.id,
                taskBId: taskB.id,
                submissionAId: submissionA.id,
                submissionBId: submissionB.id,
                disputeAId,
                disputeBId,
              },
              users,
              results,
            },
            null,
            2
          )
        ),
      });
    } finally {
      if (!KEEP_FIXTURES) {
        for (const taskId of createdTaskIds) {
          await supabaseAdmin.from('tasks').delete().eq('id', taskId);
        }
        for (const userId of createdUserIds) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      }
    }
  });
});
