import { test, expect, type BrowserContext } from '@playwright/test';
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
  taskIds: string[];
  submissionIds: string[];
  sprintId: string | null;
  sprintCreated: boolean;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const KEEP_FIXTURES = process.env.PHASE2_UI_KEEP_FIXTURES === 'true';

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
    organicId: number | null;
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

async function loginInContext(
  context: BrowserContext,
  creds: { email: string; password: string }
) {
  const page = await context.newPage();
  await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await page.locator('form button[type="submit"]').click();
  try {
    await page.waitForFunction(() => {
      const authKey = Object.keys(window.localStorage).find((key) => key.includes('-auth-token'));
      if (!authKey) return false;

      const raw = window.localStorage.getItem(authKey);
      if (!raw) return false;

      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.access_token);
      } catch {
        return false;
      }
    }, { timeout: 20_000 });
  } catch {
    const errorText = await page
      .locator('[role="alert"], .text-\\[\\#f85149\\]')
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(
      `Login failed for ${creds.email}. URL: ${page.url()}${errorText ? ` | UI: ${errorText.trim()}` : ''}`
    );
  }

  return page;
}

async function cleanupFixtures(
  supabaseAdmin: SupabaseClient,
  fixtures: CreatedFixtures
): Promise<void> {
  if (KEEP_FIXTURES) return;

  if (fixtures.submissionIds.length > 0) {
    await supabaseAdmin.from('task_submissions').delete().in('id', fixtures.submissionIds);
  }

  if (fixtures.taskIds.length > 0) {
    await supabaseAdmin.from('tasks').delete().in('id', fixtures.taskIds);
  }

  if (fixtures.sprintCreated && fixtures.sprintId) {
    await supabaseAdmin.from('sprints').delete().eq('id', fixtures.sprintId);
  }

  for (const userId of fixtures.userIds) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

test.describe('Phase 2 tasks UI flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('covers guest/member visibility, review queue, and mobile task layout', async ({ browser }) => {
    test.setTimeout(300_000);

    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missing = required.filter((name) => !process.env[name]);
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `phase2ui_${Date.now()}`;
    const pass = 'Phase2Ui!Pass123';
    const baseOrganic = Math.floor(Date.now() / 1000) % 1000000;

    const fixtures: CreatedFixtures = {
      userIds: [],
      taskIds: [],
      submissionIds: [],
      sprintId: null,
      sprintCreated: false,
    };

    try {
      let sprintId: string;
      const { data: activeSprint, error: sprintLookupError } = await supabaseAdmin
        .from('sprints')
        .select('id')
        .eq('status', 'active')
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sprintLookupError) throw sprintLookupError;

      if (activeSprint?.id) {
        sprintId = activeSprint.id;
      } else {
        const { data: org, error: orgError } = await supabaseAdmin
          .from('orgs')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (orgError) throw orgError;

        const { data: createdSprint, error: createSprintError } = await supabaseAdmin
          .from('sprints')
          .insert({
            org_id: org.id,
            name: `[${runId}] UI QA Sprint`,
            status: 'active',
            start_at: new Date().toISOString(),
            end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            capacity_points: 1_000,
            goal: 'Phase 2 UI QA sprint',
          })
          .select('id')
          .single();

        if (createSprintError || !createdSprint) {
          throw createSprintError || new Error('Failed to create active sprint for QA');
        }

        sprintId = createdSprint.id;
        fixtures.sprintId = createdSprint.id;
        fixtures.sprintCreated = true;
      }

      const [adminUser, councilUser, memberUser, guestUser] = await Promise.all([
        createQaUser(supabaseAdmin, {
          email: `${runId}.admin@example.com`,
          password: pass,
          role: 'admin',
          organicId: baseOrganic + 1,
          name: 'Phase2 UI Admin',
        }),
        createQaUser(supabaseAdmin, {
          email: `${runId}.council@example.com`,
          password: pass,
          role: 'council',
          organicId: baseOrganic + 2,
          name: 'Phase2 UI Council',
        }),
        createQaUser(supabaseAdmin, {
          email: `${runId}.member@example.com`,
          password: pass,
          role: 'member',
          organicId: baseOrganic + 3,
          name: 'Phase2 UI Member',
        }),
        createQaUser(supabaseAdmin, {
          email: `${runId}.guest@example.com`,
          password: pass,
          role: 'guest',
          organicId: null,
          name: 'Phase2 UI Guest',
        }),
      ]);

      const users = {
        admin: adminUser,
        council: councilUser,
        member: memberUser,
        guest: guestUser,
      };

      fixtures.userIds.push(users.admin.id, users.council.id, users.member.id, users.guest.id);

      const detailTaskTitle = `[${runId}] Mobile Join Task`;
      const reviewTaskTitle = `[${runId}] Pending Review Task`;

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([
          {
            title: detailTaskTitle,
            description: 'Fixture task for mobile join button check',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'todo',
            base_points: 50,
            priority: 'medium',
            sprint_id: sprintId,
            labels: ['qa'],
          },
          {
            title: reviewTaskTitle,
            description: 'Fixture task for review queue visibility',
            created_by: users.admin.id,
            task_type: 'development',
            status: 'review',
            base_points: 100,
            priority: 'high',
            sprint_id: sprintId,
            labels: ['qa', 'review'],
          },
        ])
        .select('id, title');

      expect(taskError).toBeNull();
      expect(tasks?.length).toBe(2);

      const detailTask = tasks?.find((task) => task.title === detailTaskTitle);
      const reviewTask = tasks?.find((task) => task.title === reviewTaskTitle);
      if (!detailTask || !reviewTask) {
        throw new Error('Failed to create task fixtures');
      }

      fixtures.taskIds.push(detailTask.id, reviewTask.id);

      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('task_submissions')
        .insert({
          task_id: reviewTask.id,
          user_id: users.member.id,
          submission_type: 'development',
          pr_link: 'https://github.com/example/repo/pull/4242',
          description: 'Fixture pending submission for review queue',
          review_status: 'pending',
        })
        .select('id')
        .single();

      expect(submissionError).toBeNull();
      if (!submission) throw new Error('Failed to create pending submission fixture');
      fixtures.submissionIds.push(submission.id);

      const guestContext = await browser.newContext({ baseURL: BASE_URL });
      try {
        const guestPage = await loginInContext(guestContext, {
          email: users.guest.email,
          password: users.guest.password,
        });

        await guestPage.goto('/en/tasks', { waitUntil: 'domcontentloaded' });
        await expect(guestPage.getByRole('button', { name: /backlog/i })).toHaveCount(0);
      } finally {
        await guestContext.close();
      }

      const memberContext = await browser.newContext({ baseURL: BASE_URL });
      try {
        const memberPage = await loginInContext(memberContext, {
          email: users.member.email,
          password: users.member.password,
        });

        await memberPage.goto('/en/tasks', { waitUntil: 'domcontentloaded' });
        await expect(memberPage.getByRole('button', { name: /backlog/i })).toBeVisible();
      } finally {
        await memberContext.close();
      }

      const councilContext = await browser.newContext({ baseURL: BASE_URL });
      try {
        const councilPage = await loginInContext(councilContext, {
          email: users.council.email,
          password: users.council.password,
        });

        await councilPage.goto('/en/admin/submissions', { waitUntil: 'domcontentloaded' });
        await expect(councilPage.getByText(reviewTaskTitle)).toBeVisible({ timeout: 15_000 });
      } finally {
        await councilContext.close();
      }

      const mobileContext = await browser.newContext({
        baseURL: BASE_URL,
        viewport: { width: 375, height: 812 },
      });
      try {
        const mobilePage = await loginInContext(mobileContext, {
          email: users.member.email,
          password: users.member.password,
        });

        await mobilePage.goto('/en/tasks', { waitUntil: 'domcontentloaded' });

        const hasHorizontalOverflow = await mobilePage.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 2
        );
        expect(hasHorizontalOverflow).toBe(false);

        await expect(mobilePage.getByText(/filters/i)).toBeVisible();

        const detailTaskLink = mobilePage.getByRole('link', {
          name: new RegExp(escapeRegExp(detailTaskTitle), 'i'),
        });
        await expect(detailTaskLink).toBeVisible({ timeout: 15_000 });
        await detailTaskLink.click();

        await expect(
          mobilePage.getByRole('heading', {
            name: new RegExp(escapeRegExp(detailTaskTitle), 'i'),
          })
        ).toBeVisible({ timeout: 15_000 });

        await expect(
          mobilePage.getByRole('button', { name: /join task|leave task/i })
        ).toBeVisible();
      } finally {
        await mobileContext.close();
      }
    } finally {
      await cleanupFixtures(supabaseAdmin, fixtures);
    }
  });
});
