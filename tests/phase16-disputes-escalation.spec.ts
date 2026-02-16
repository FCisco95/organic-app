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
const KEEP_FIXTURES = process.env.PHASE16_ESCALATION_KEEP_FIXTURES === 'true';

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
  method: 'POST',
  path: string,
  body: JsonRecord
): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

test.describe('Phase 16 sprint-bound dispute escalation', () => {
  test.describe.configure({ mode: 'serial' });

  test('auto-escalates unresolved disputes and extends admin-tier deadlines at sprint close', async () => {
    test.setTimeout(180_000);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `qaescalate${Date.now()}`;
    const pass = 'Phase16!Escalate123';
    const baseOrganic = Math.floor(100000000 + Math.random() * 800000000);

    const createdUserIds: string[] = [];
    const createdTaskIds: string[] = [];
    const createdSprintIds: string[] = [];
    let suspendedActiveSprintId: string | null = null;

    try {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('orgs')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      expect(orgError).toBeNull();
      if (!org) throw new Error('No org found for fixtures');

      const { data: existingActiveSprint, error: existingActiveSprintError } =
        await supabaseAdmin
          .from('sprints')
          .select('id')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

      expect(existingActiveSprintError).toBeNull();
      if (existingActiveSprint?.id) {
        const { error: suspendActiveError } = await supabaseAdmin
          .from('sprints')
          .update({ status: 'planning' })
          .eq('id', existingActiveSprint.id);
        expect(suspendActiveError).toBeNull();
        suspendedActiveSprintId = existingActiveSprint.id;
      }

      const users = {
        admin: await createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          xp: 2000,
          organicId: baseOrganic + 1,
          name: 'QA Escalation Admin',
        }),
        reviewer: await createQaUser(supabaseAdmin, {
          email: `${runId}.reviewer@example.com`,
          password: pass,
          role: 'member',
          xp: 2000,
          organicId: baseOrganic + 2,
          name: 'QA Escalation Reviewer',
        }),
        memberA: await createQaUser(supabaseAdmin, {
          email: `${runId}.membera@example.com`,
          password: pass,
          role: 'member',
          xp: 2000,
          organicId: baseOrganic + 3,
          name: 'QA Escalation Member A',
        }),
        memberB: await createQaUser(supabaseAdmin, {
          email: `${runId}.memberb@example.com`,
          password: pass,
          role: 'member',
          xp: 2000,
          organicId: baseOrganic + 4,
          name: 'QA Escalation Member B',
        }),
        memberC: await createQaUser(supabaseAdmin, {
          email: `${runId}.memberc@example.com`,
          password: pass,
          role: 'member',
          xp: 2000,
          organicId: baseOrganic + 5,
          name: 'QA Escalation Member C',
        }),
      };

      createdUserIds.push(
        users.admin.id,
        users.reviewer.id,
        users.memberA.id,
        users.memberB.id,
        users.memberC.id
      );

      const { data: sprint, error: sprintError } = await supabaseAdmin
        .from('sprints')
        .insert({
          org_id: org.id,
          name: `[${runId}] Escalation Sprint`,
          status: 'active',
          start_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          capacity_points: 1000,
          goal: 'Phase 16 escalation QA',
        })
        .select('id')
        .single();

      expect(sprintError).toBeNull();
      if (!sprint) throw new Error('Failed to create active sprint fixture');
      createdSprintIds.push(sprint.id);

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([
          {
            title: `[${runId}] Mediation dispute task`,
            description: 'Mediation-tier unresolved dispute fixture',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'review',
            base_points: 100,
            priority: 'medium',
            sprint_id: sprint.id,
          },
          {
            title: `[${runId}] Council dispute task`,
            description: 'Council-tier unresolved dispute fixture',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'review',
            base_points: 100,
            priority: 'medium',
            sprint_id: sprint.id,
          },
          {
            title: `[${runId}] Admin dispute task`,
            description: 'Admin-tier unresolved dispute fixture',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'review',
            base_points: 100,
            priority: 'medium',
            sprint_id: sprint.id,
          },
        ])
        .select('id, title');

      expect(taskError).toBeNull();
      expect(tasks?.length).toBe(3);
      const taskMediation = tasks?.[0];
      const taskCouncil = tasks?.[1];
      const taskAdmin = tasks?.[2];
      if (!taskMediation || !taskCouncil || !taskAdmin) {
        throw new Error('Failed to create task fixtures');
      }
      createdTaskIds.push(taskMediation.id, taskCouncil.id, taskAdmin.id);

      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('task_submissions')
        .insert([
          {
            task_id: taskMediation.id,
            user_id: users.memberA.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/3001',
            description: 'Mediation fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Needs work',
          },
          {
            task_id: taskCouncil.id,
            user_id: users.memberB.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/3002',
            description: 'Council fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Needs work',
          },
          {
            task_id: taskAdmin.id,
            user_id: users.memberC.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/3003',
            description: 'Admin fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Needs work',
          },
        ])
        .select('id, task_id');

      expect(submissionsError).toBeNull();
      expect(submissions?.length).toBe(3);

      const submissionMediation = submissions?.find((s) => s.task_id === taskMediation.id);
      const submissionCouncil = submissions?.find((s) => s.task_id === taskCouncil.id);
      const submissionAdmin = submissions?.find((s) => s.task_id === taskAdmin.id);
      if (!submissionMediation || !submissionCouncil || !submissionAdmin) {
        throw new Error('Failed to create submission fixtures');
      }

      const baselineAdminDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const { data: disputes, error: disputeError } = await supabaseAdmin
        .from('disputes')
        .insert([
          {
            submission_id: submissionMediation.id,
            task_id: taskMediation.id,
            sprint_id: sprint.id,
            disputant_id: users.memberA.id,
            reviewer_id: users.reviewer.id,
            status: 'mediation',
            tier: 'mediation',
            reason: 'rejected_unfairly',
            evidence_text: 'Mediation fixture evidence',
            evidence_links: [],
            xp_stake: 50,
          },
          {
            submission_id: submissionCouncil.id,
            task_id: taskCouncil.id,
            sprint_id: sprint.id,
            disputant_id: users.memberB.id,
            reviewer_id: users.reviewer.id,
            status: 'under_review',
            tier: 'council',
            reason: 'reviewer_bias',
            evidence_text: 'Council fixture evidence',
            evidence_links: [],
            xp_stake: 50,
          },
          {
            submission_id: submissionAdmin.id,
            task_id: taskAdmin.id,
            sprint_id: sprint.id,
            disputant_id: users.memberC.id,
            reviewer_id: users.reviewer.id,
            status: 'appealed',
            tier: 'admin',
            reason: 'low_quality_score',
            evidence_text: 'Admin fixture evidence',
            evidence_links: [],
            xp_stake: 50,
            appeal_deadline: baselineAdminDeadline,
          },
        ])
        .select('id, task_id');

      expect(disputeError).toBeNull();
      expect(disputes?.length).toBe(3);

      const mediationDispute = disputes?.find((d) => d.task_id === taskMediation.id);
      const councilDispute = disputes?.find((d) => d.task_id === taskCouncil.id);
      const adminDispute = disputes?.find((d) => d.task_id === taskAdmin.id);
      if (!mediationDispute || !councilDispute || !adminDispute) {
        throw new Error('Failed to create dispute fixtures');
      }

      const adminCookie = await buildSessionCookie(
        supabaseUrl,
        anonKey,
        users.admin.email,
        users.admin.password
      );

      const completeSprint = await apiRequest(
        adminCookie,
        'POST',
        `/api/sprints/${sprint.id}/complete`,
        { incomplete_action: 'backlog' }
      );

      expect(completeSprint.status).toBe(200);

      const escalatedCount = getNumber(completeSprint.json, 'disputes_escalated') ?? -1;
      const extendedCount = getNumber(completeSprint.json, 'admin_dispute_extensions') ?? -1;
      expect(escalatedCount).toBeGreaterThanOrEqual(2);
      expect(extendedCount).toBeGreaterThanOrEqual(2);

      const { data: escalatedMediation, error: mediationError } = await supabaseAdmin
        .from('disputes')
        .select('tier, status')
        .eq('id', mediationDispute.id)
        .single();
      expect(mediationError).toBeNull();
      expect(escalatedMediation?.tier).toBe('council');
      expect(escalatedMediation?.status).toBe('under_review');

      const { data: escalatedCouncil, error: councilError } = await supabaseAdmin
        .from('disputes')
        .select('tier, status, arbitrator_id')
        .eq('id', councilDispute.id)
        .single();
      expect(councilError).toBeNull();
      expect(escalatedCouncil?.tier).toBe('admin');
      expect(escalatedCouncil?.status).toBe('appealed');
      expect(escalatedCouncil?.arbitrator_id).toBeNull();

      const { data: extendedAdmin, error: adminError } = await supabaseAdmin
        .from('disputes')
        .select('appeal_deadline')
        .eq('id', adminDispute.id)
        .single();
      expect(adminError).toBeNull();
      const baselineMs = new Date(baselineAdminDeadline).getTime();
      const extendedMs = new Date(extendedAdmin?.appeal_deadline ?? 0).getTime();
      expect(Number.isFinite(extendedMs)).toBe(true);
      expect(extendedMs - baselineMs).toBeGreaterThanOrEqual(47 * 60 * 60 * 1000);
    } finally {
      if (!KEEP_FIXTURES) {
        for (const taskId of createdTaskIds) {
          await supabaseAdmin.from('tasks').delete().eq('id', taskId);
        }
        for (const sprintId of createdSprintIds) {
          await supabaseAdmin.from('sprints').delete().eq('id', sprintId);
        }
        for (const userId of createdUserIds) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      }

      if (suspendedActiveSprintId && !KEEP_FIXTURES) {
        await supabaseAdmin
          .from('sprints')
          .update({ status: 'active' })
          .eq('id', suspendedActiveSprintId);
      }
    }
  });
});
