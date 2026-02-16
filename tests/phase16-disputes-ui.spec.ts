import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Role = 'admin' | 'council' | 'member' | 'guest';

type QaUser = {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
};

type CreatedFixtures = {
  userIds: string[];
  taskId: string | null;
  submissionId: string | null;
  disputeId: string | null;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const KEEP_FIXTURES = process.env.PHASE16_UI_KEEP_FIXTURES === 'true';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
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
      organic_id: input.organicId,
      name: input.name,
      xp_total: 1000,
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
): Promise<{ name: string; value: string }> {
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

  const [name, rawValue] = authEntry;
  return {
    name,
    value: `base64-${toBase64Url(rawValue)}`,
  };
}

async function cleanupFixtures(
  supabaseAdmin: SupabaseClient,
  fixtures: CreatedFixtures
): Promise<void> {
  if (KEEP_FIXTURES) return;

  if (fixtures.disputeId) {
    await supabaseAdmin.from('disputes').delete().eq('id', fixtures.disputeId);
  }

  if (fixtures.submissionId) {
    await supabaseAdmin
      .from('task_submissions')
      .delete()
      .eq('id', fixtures.submissionId);
  }

  if (fixtures.taskId) {
    await supabaseAdmin.from('tasks').delete().eq('id', fixtures.taskId);
  }

  for (const userId of fixtures.userIds) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

test.describe('Phase 16 disputes UI regressions', () => {
  test.describe.configure({ mode: 'serial' });

  test('clicking dispute card opens detail without runtime overlay', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter((name) => !process.env[name]);
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `phase16ui_${Date.now()}`;
    const pass = 'Phase16Ui!Pass123';
    const baseOrganic = Math.floor(100000000 + Math.random() * 800000000);

    const fixtures: CreatedFixtures = {
      userIds: [],
      taskId: null,
      submissionId: null,
      disputeId: null,
    };

    try {
      const [adminUser, memberUser, observerUser] = await Promise.all([
        createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          organicId: baseOrganic + 1,
          name: 'Phase16 UI Admin',
        }),
        createQaUser(supabaseAdmin, {
          email: `${runId}.member@example.com`,
          password: pass,
          role: 'member',
          organicId: baseOrganic + 2,
          name: 'Phase16 UI Member',
        }),
        createQaUser(supabaseAdmin, {
          email: `${runId}.observer@example.com`,
          password: pass,
          role: 'member',
          organicId: baseOrganic + 3,
          name: 'Phase16 UI Observer',
        }),
      ]);

      fixtures.userIds.push(adminUser.id, memberUser.id, observerUser.id);

      const taskTitle = `[${runId}] Dispute Detail Runtime Task`;

      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          title: taskTitle,
          description: 'Fixture task for dispute detail click-through regression',
          created_by: adminUser.id,
          task_type: 'development',
          status: 'backlog',
          base_points: 100,
          priority: 'medium',
        })
        .select('id')
        .single();

      expect(taskError).toBeNull();
      if (!task) throw new Error('Failed to create task fixture');
      fixtures.taskId = task.id;

      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('task_submissions')
        .insert({
          task_id: task.id,
          user_id: memberUser.id,
          submission_type: 'development',
          pr_link: 'https://github.com/example/repo/pull/9999',
          description: 'Fixture submission for dispute detail click-through',
          review_status: 'rejected',
          reviewer_id: adminUser.id,
          rejection_reason: 'Fixture rejection',
          reviewer_notes: 'Fixture reviewer notes',
        })
        .select('id')
        .single();

      expect(submissionError).toBeNull();
      if (!submission) throw new Error('Failed to create submission fixture');
      fixtures.submissionId = submission.id;

      const { data: dispute, error: disputeError } = await supabaseAdmin
        .from('disputes')
        .insert({
          submission_id: submission.id,
          task_id: task.id,
          disputant_id: memberUser.id,
          reviewer_id: adminUser.id,
          status: 'open',
          tier: 'council',
          reason: 'rejected_unfairly',
          evidence_text:
            'This is a deterministic fixture used to verify dispute detail navigation.',
          evidence_links: [],
          xp_stake: 50,
          response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();

      expect(disputeError).toBeNull();
      if (!dispute) throw new Error('Failed to create dispute fixture');
      fixtures.disputeId = dispute.id;

      const memberContext = await browser.newContext({ baseURL: BASE_URL });
      try {
        const authCookie = await buildSessionCookie(
          supabaseUrl,
          anonKey,
          memberUser.email,
          memberUser.password
        );
        await memberContext.addCookies([
          {
            name: authCookie.name,
            value: authCookie.value,
            url: BASE_URL,
          },
        ]);
        const memberPage = await memberContext.newPage();

        await memberPage.goto('/en/disputes', { waitUntil: 'domcontentloaded' });
        await expect
          .poll(
            async () => {
              const response = await memberPage.request.get('/api/disputes?my_disputes=true');
              if (!response.ok()) return false;
              const body = await response.text();
              return body.includes(dispute.id);
            },
            { timeout: 30_000 }
          )
          .toBe(true);

        const disputeLink = memberPage
          .locator(`a[href*="/disputes/${dispute.id}"]`)
          .first();
        await expect
          .poll(
            async () =>
              memberPage.locator(`a[href*="/disputes/${dispute.id}"]`).count(),
            { timeout: 45_000 }
          )
          .toBeGreaterThan(0);
        await disputeLink.click();

        await expect(memberPage).toHaveURL(new RegExp(`/en/disputes/${dispute.id}$`));
        await expect(
          memberPage.getByRole('heading', { name: new RegExp(escapeRegExp(taskTitle), 'i') })
        ).toBeVisible({ timeout: 15_000 });
        await expect(memberPage.getByText(/Unhandled Runtime Error/i)).toHaveCount(0);
        const disputesNotificationsResponse = await memberPage.request.get(
          '/api/notifications?category=disputes&limit=20'
        );
        expect(disputesNotificationsResponse.status()).toBe(200);
      } finally {
        await memberContext.close();
      }

      const observerContext = await browser.newContext({ baseURL: BASE_URL });
      try {
        const observerAuthCookie = await buildSessionCookie(
          supabaseUrl,
          anonKey,
          observerUser.email,
          observerUser.password
        );
        await observerContext.addCookies([
          {
            name: observerAuthCookie.name,
            value: observerAuthCookie.value,
            url: BASE_URL,
          },
        ]);
        const observerPage = await observerContext.newPage();
        await observerPage.goto(`/en/disputes/${dispute.id}`, {
          waitUntil: 'domcontentloaded',
        });
        await expect(observerPage).toHaveURL(new RegExp(`/en/disputes/${dispute.id}$`));
        await expect(
          observerPage.getByRole('heading', {
            name: new RegExp(escapeRegExp(taskTitle), 'i'),
          })
        ).toBeVisible({ timeout: 15_000 });
        await expect(observerPage.getByText(/Unhandled Runtime Error/i)).toHaveCount(0);
      } finally {
        await observerContext.close();
      }
    } finally {
      await cleanupFixtures(supabaseAdmin, fixtures);
    }
  });
});
