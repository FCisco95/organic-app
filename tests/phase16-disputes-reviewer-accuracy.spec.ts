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
const KEEP_FIXTURES = process.env.PHASE16_REVIEWER_ACCURACY_KEEP_FIXTURES === 'true';

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

function getString(value: unknown, key: string): string | null {
  if (!isObject(value)) return null;
  const raw = value[key];
  return typeof raw === 'string' ? raw : null;
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
  path: string
): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Cookie: cookie,
    },
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

test.describe('Phase 16 reviewer accuracy stats', () => {
  test.describe.configure({ mode: 'serial' });

  test('returns reviewer overturned-rate derived accuracy', async () => {
    test.setTimeout(180_000);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `qareviewacc${Date.now()}`;
    const pass = 'Phase16!ReviewerAcc123';
    const baseOrganic = Math.floor(100000000 + Math.random() * 800000000);

    const createdUserIds: string[] = [];
    const createdTaskIds: string[] = [];

    try {
      const users = {
        admin: await createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          xp: 1000,
          organicId: baseOrganic + 1,
          name: 'QA Reviewer Accuracy Admin',
        }),
        reviewer: await createQaUser(supabaseAdmin, {
          email: `${runId}.reviewer@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 2,
          name: 'QA Reviewer Accuracy Reviewer',
        }),
        memberA: await createQaUser(supabaseAdmin, {
          email: `${runId}.membera@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 3,
          name: 'QA Reviewer Accuracy Member A',
        }),
        memberB: await createQaUser(supabaseAdmin, {
          email: `${runId}.memberb@example.com`,
          password: pass,
          role: 'member',
          xp: 1000,
          organicId: baseOrganic + 4,
          name: 'QA Reviewer Accuracy Member B',
        }),
      };

      createdUserIds.push(
        users.admin.id,
        users.reviewer.id,
        users.memberA.id,
        users.memberB.id
      );

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([
          {
            title: `[${runId}] Reviewer accuracy overturned`,
            description: 'Overturned fixture',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'backlog',
            base_points: 100,
            priority: 'medium',
          },
          {
            title: `[${runId}] Reviewer accuracy upheld`,
            description: 'Uphold fixture',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'backlog',
            base_points: 100,
            priority: 'medium',
          },
        ])
        .select('id');

      expect(taskError).toBeNull();
      expect(tasks?.length).toBe(2);
      const taskA = tasks?.[0];
      const taskB = tasks?.[1];
      if (!taskA || !taskB) throw new Error('Failed to create task fixtures');
      createdTaskIds.push(taskA.id, taskB.id);

      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('task_submissions')
        .insert([
          {
            task_id: taskA.id,
            user_id: users.memberA.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/4001',
            description: 'Overturned fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Fixture',
          },
          {
            task_id: taskB.id,
            user_id: users.memberB.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/4002',
            description: 'Uphold fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Fixture',
          },
        ])
        .select('id, task_id');

      expect(submissionsError).toBeNull();
      expect(submissions?.length).toBe(2);
      const submissionA = submissions?.find((s) => s.task_id === taskA.id);
      const submissionB = submissions?.find((s) => s.task_id === taskB.id);
      if (!submissionA || !submissionB) {
        throw new Error('Failed to create submission fixtures');
      }

      const now = new Date().toISOString();
      const { error: disputesError } = await supabaseAdmin
        .from('disputes')
        .insert([
          {
            submission_id: submissionA.id,
            task_id: taskA.id,
            disputant_id: users.memberA.id,
            reviewer_id: users.reviewer.id,
            status: 'resolved',
            tier: 'council',
            reason: 'rejected_unfairly',
            evidence_text: 'Reviewer accuracy fixture A',
            evidence_links: [],
            xp_stake: 50,
            resolution: 'overturned',
            resolution_notes: 'Fixture overturned',
            resolved_at: now,
          },
          {
            submission_id: submissionB.id,
            task_id: taskB.id,
            disputant_id: users.memberB.id,
            reviewer_id: users.reviewer.id,
            status: 'resolved',
            tier: 'council',
            reason: 'rejected_unfairly',
            evidence_text: 'Reviewer accuracy fixture B',
            evidence_links: [],
            xp_stake: 50,
            resolution: 'upheld',
            resolution_notes: 'Fixture upheld',
            resolved_at: now,
          },
        ]);

      expect(disputesError).toBeNull();

      const adminCookie = await buildSessionCookie(
        supabaseUrl,
        anonKey,
        users.admin.email,
        users.admin.password
      );

      const response = await apiRequest(
        adminCookie,
        `/api/disputes?reviewer_accuracy=true&reviewer_id=${users.reviewer.id}`
      );

      expect(response.status).toBe(200);
      const data = isObject(response.json) ? response.json.data : null;
      expect(data).toBeTruthy();
      expect(getString(data, 'reviewer_id')).toBe(users.reviewer.id);
      expect(getNumber(data, 'total_reviews_disputed')).toBe(2);
      expect(getNumber(data, 'overturned_count')).toBe(1);
      expect(getNumber(data, 'reviewer_accuracy')).toBe(50);
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
