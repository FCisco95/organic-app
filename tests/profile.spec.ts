import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type QaUser = {
  id: string;
  email: string;
  password: string;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const KEEP_FIXTURES = process.env.PROFILE_QA_KEEP_FIXTURES === 'true';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
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
  input: { email: string; password: string; name: string; organicId: number }
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
      role: 'member',
      organic_id: input.organicId,
      name: input.name,
      xp_total: 100,
    })
    .eq('id', created.user.id);

  if (updateError) throw updateError;

  return {
    id: created.user.id,
    email: input.email,
    password: input.password,
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

test.describe('Profile stats', () => {
  test('shows submissions, contributions, and points earned', async ({ page }) => {
    test.setTimeout(120_000);

    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missing = required.filter((name) => !process.env[name]);
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `profileqa_${Date.now()}`;
    const pass = 'ProfileQa!Pass123';
    let createdUserId: string | null = null;

    try {
      const user = await createQaUser(supabaseAdmin, {
        email: `${runId}.member@example.com`,
        password: pass,
        name: 'Profile QA Member',
        organicId: Math.floor(100000000 + Math.random() * 800000000),
      });
      createdUserId = user.id;

      const authCookie = await buildSessionCookie(
        supabaseUrl,
        anonKey,
        user.email,
        user.password
      );
      await page.context().addCookies([
        {
          name: authCookie.name,
          value: authCookie.value,
          url: BASE_URL,
        },
      ]);
      await page.context().setExtraHTTPHeaders({ 'ngrok-skip-browser-warning': '1' });

      await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Loading your profile...')).not.toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText('Activity')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Total submissions')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Approved submissions')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Contributions')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Points earned')).toBeVisible({ timeout: 20_000 });
    } finally {
      if (createdUserId && !KEEP_FIXTURES) {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      }
    }
  });
});
