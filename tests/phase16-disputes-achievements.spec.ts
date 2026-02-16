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
const KEEP_FIXTURES = process.env.PHASE16_ACHIEVEMENTS_KEEP_FIXTURES === 'true';

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

function getBoolean(value: unknown, key: string): boolean | null {
  if (!isObject(value)) return null;
  const raw = value[key];
  return typeof raw === 'boolean' ? raw : null;
}

async function waitForProfile(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
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
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
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

  const authEntry = Object.entries(storage).find(([key]) => key.includes('-auth-token'));
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
  path: string
): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
  });

  const raw = await response.text();
  let json: unknown = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = raw || null;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
  };
}

async function waitForCounterAtLeast(
  supabaseAdmin: SupabaseClient,
  userId: string,
  field: 'disputes_resolved' | 'disputes_won',
  minimum: number
): Promise<number> {
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await supabaseAdmin
      .from('user_activity_counts')
      .select(field)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const value = getNumber(data, field) ?? 0;
      if (value >= minimum) return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return 0;
}

async function waitForAchievementUnlock(
  supabaseAdmin: SupabaseClient,
  userId: string,
  achievementId: string
): Promise<boolean> {
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (!error && data) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

test.describe('Phase 16 dispute achievements', () => {
  test.describe.configure({ mode: 'serial' });

  test('unlocks dispute achievements and exposes them via achievements API', async () => {
    test.setTimeout(180_000);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `qaach${Date.now()}`;
    const pass = 'Phase16!Achieve123';
    const baseOrganic = Math.floor(100000000 + Math.random() * 800000000);

    const createdUserIds: string[] = [];
    const createdTaskIds: string[] = [];
    const createdSubmissionIds: string[] = [];
    const createdDisputeIds: string[] = [];

    try {
      const users = {
        admin: await createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          xp: 3000,
          organicId: baseOrganic + 1,
          name: 'QA Achievement Admin',
        }),
        arbitrator: await createQaUser(supabaseAdmin, {
          email: `${runId}.council@example.com`,
          password: pass,
          role: 'council',
          xp: 3000,
          organicId: baseOrganic + 2,
          name: 'QA Achievement Council',
        }),
        reviewer: await createQaUser(supabaseAdmin, {
          email: `${runId}.reviewer@example.com`,
          password: pass,
          role: 'member',
          xp: 3000,
          organicId: baseOrganic + 3,
          name: 'QA Achievement Reviewer',
        }),
        disputantA: await createQaUser(supabaseAdmin, {
          email: `${runId}.membera@example.com`,
          password: pass,
          role: 'member',
          xp: 3000,
          organicId: baseOrganic + 4,
          name: 'QA Achievement Member A',
        }),
        disputantB: await createQaUser(supabaseAdmin, {
          email: `${runId}.memberb@example.com`,
          password: pass,
          role: 'member',
          xp: 3000,
          organicId: baseOrganic + 5,
          name: 'QA Achievement Member B',
        }),
      };
      createdUserIds.push(
        users.admin.id,
        users.arbitrator.id,
        users.reviewer.id,
        users.disputantA.id,
        users.disputantB.id
      );

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([
          {
            title: `[${runId}] Achievement arbitrator task`,
            description: 'Fixture task for first_arbiter achievement',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'backlog',
            base_points: 100,
            priority: 'medium',
          },
          {
            title: `[${runId}] Achievement disputant task`,
            description: 'Fixture task for vindicated achievement',
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
      if (!taskA || !taskB) {
        throw new Error('Failed to create achievement fixture tasks');
      }
      createdTaskIds.push(taskA.id, taskB.id);

      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('task_submissions')
        .insert([
          {
            task_id: taskA.id,
            user_id: users.disputantA.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/6001',
            description: 'Arbitrator achievement fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Fixture',
          },
          {
            task_id: taskB.id,
            user_id: users.disputantB.id,
            submission_type: 'development',
            pr_link: 'https://github.com/example/repo/pull/6002',
            description: 'Vindicated achievement fixture submission',
            review_status: 'rejected',
            reviewer_id: users.reviewer.id,
            rejection_reason: 'Fixture',
          },
        ])
        .select('id, task_id');

      expect(submissionsError).toBeNull();
      expect(submissions?.length).toBe(2);
      const submissionA = submissions?.find((item) => item.task_id === taskA.id);
      const submissionB = submissions?.find((item) => item.task_id === taskB.id);
      if (!submissionA || !submissionB) {
        throw new Error('Failed to create achievement fixture submissions');
      }
      createdSubmissionIds.push(submissionA.id, submissionB.id);

      const { data: disputes, error: disputesError } = await supabaseAdmin
        .from('disputes')
        .insert([
          {
            submission_id: submissionA.id,
            task_id: taskA.id,
            disputant_id: users.disputantA.id,
            reviewer_id: users.reviewer.id,
            status: 'open',
            tier: 'council',
            reason: 'rejected_unfairly',
            evidence_text: 'Arbitrator achievement dispute fixture evidence',
            evidence_links: [],
            xp_stake: 50,
          },
          {
            submission_id: submissionB.id,
            task_id: taskB.id,
            disputant_id: users.disputantB.id,
            reviewer_id: users.reviewer.id,
            status: 'open',
            tier: 'council',
            reason: 'rejected_unfairly',
            evidence_text: 'Vindicated achievement dispute fixture evidence',
            evidence_links: [],
            xp_stake: 50,
          },
        ])
        .select('id, task_id');

      expect(disputesError).toBeNull();
      expect(disputes?.length).toBe(2);
      const disputeA = disputes?.find((item) => item.task_id === taskA.id);
      const disputeB = disputes?.find((item) => item.task_id === taskB.id);
      if (!disputeA || !disputeB) {
        throw new Error('Failed to create achievement fixture disputes');
      }
      createdDisputeIds.push(disputeA.id, disputeB.id);

      const resolutionTime = new Date().toISOString();
      const { error: resolveAError } = await supabaseAdmin
        .from('disputes')
        .update({
          status: 'resolved',
          resolution: 'upheld',
          resolution_notes: 'Fixture upheld for first_arbiter unlock path',
          arbitrator_id: users.arbitrator.id,
          resolved_at: resolutionTime,
        })
        .eq('id', disputeA.id);
      expect(resolveAError).toBeNull();

      const { error: resolveBError } = await supabaseAdmin
        .from('disputes')
        .update({
          status: 'resolved',
          resolution: 'overturned',
          resolution_notes: 'Fixture overturned for vindicated unlock path',
          arbitrator_id: users.arbitrator.id,
          resolved_at: resolutionTime,
        })
        .eq('id', disputeB.id);
      expect(resolveBError).toBeNull();

      const arbitratorResolvedCount = await waitForCounterAtLeast(
        supabaseAdmin,
        users.arbitrator.id,
        'disputes_resolved',
        2
      );
      expect(arbitratorResolvedCount).toBeGreaterThanOrEqual(2);

      const disputantWinCount = await waitForCounterAtLeast(
        supabaseAdmin,
        users.disputantB.id,
        'disputes_won',
        1
      );
      expect(disputantWinCount).toBeGreaterThanOrEqual(1);

      const firstArbiterUnlocked = await waitForAchievementUnlock(
        supabaseAdmin,
        users.arbitrator.id,
        'first_arbiter'
      );
      expect(firstArbiterUnlocked).toBe(true);

      const vindicatedUnlocked = await waitForAchievementUnlock(
        supabaseAdmin,
        users.disputantB.id,
        'vindicated'
      );
      expect(vindicatedUnlocked).toBe(true);

      const adminCookie = await buildSessionCookie(
        supabaseUrl,
        anonKey,
        users.admin.email,
        users.admin.password
      );

      const arbitratorAchievementsResponse = await apiRequest(
        adminCookie,
        'GET',
        `/api/achievements?userId=${users.arbitrator.id}`
      );
      expect(arbitratorAchievementsResponse.status).toBe(200);
      const arbitratorAchievements =
        isObject(arbitratorAchievementsResponse.json) &&
        Array.isArray(arbitratorAchievementsResponse.json.achievements)
          ? arbitratorAchievementsResponse.json.achievements
          : [];

      const firstArbiterAchievement = arbitratorAchievements.find(
        (item) => getString(item, 'id') === 'first_arbiter'
      );
      expect(firstArbiterAchievement).toBeTruthy();
      expect(getBoolean(firstArbiterAchievement, 'unlocked')).toBe(true);
      expect(getString(firstArbiterAchievement, 'unlocked_at')).toBeTruthy();

      const disputantAchievementsResponse = await apiRequest(
        adminCookie,
        'GET',
        `/api/achievements?userId=${users.disputantB.id}`
      );
      expect(disputantAchievementsResponse.status).toBe(200);
      const disputantAchievements =
        isObject(disputantAchievementsResponse.json) &&
        Array.isArray(disputantAchievementsResponse.json.achievements)
          ? disputantAchievementsResponse.json.achievements
          : [];

      const vindicatedAchievement = disputantAchievements.find(
        (item) => getString(item, 'id') === 'vindicated'
      );
      expect(vindicatedAchievement).toBeTruthy();
      expect(getBoolean(vindicatedAchievement, 'unlocked')).toBe(true);
      expect(getString(vindicatedAchievement, 'unlocked_at')).toBeTruthy();
    } finally {
      if (!KEEP_FIXTURES) {
        for (const disputeId of createdDisputeIds) {
          await supabaseAdmin.from('disputes').delete().eq('id', disputeId);
        }

        for (const submissionId of createdSubmissionIds) {
          await supabaseAdmin.from('task_submissions').delete().eq('id', submissionId);
        }

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
