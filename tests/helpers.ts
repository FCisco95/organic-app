/**
 * Shared test fixtures and helpers for Playwright E2E smoke tests.
 *
 * Each test file should import from here rather than duplicating this logic.
 * The pattern for auth: create user via service-role admin client, build a
 * Supabase session cookie, then pass that cookie on API requests.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type QaUser = {
  id: string;
  email: string;
  password: string;
};

export const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/** Returns the names of any missing required env vars. */
export function missingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
}

/** Throws if the env var is not set; otherwise returns its value. */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Creates a Supabase admin client using the service role key. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Encodes a string as base64url (no padding, URL-safe). */
export function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** Polls until the user_profiles row is created (up to 10 s). */
export async function waitForProfile(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
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

/** Creates a QA test user via the service-role admin client. */
export async function createQaUser(
  supabaseAdmin: SupabaseClient,
  input: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'council' | 'member' | 'guest';
    organicId?: number;
    xpTotal?: number;
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

  const updates: Record<string, unknown> = { name: input.name };
  if (input.role !== undefined) updates.role = input.role;
  if (input.organicId !== undefined) updates.organic_id = input.organicId;
  if (input.xpTotal !== undefined) updates.xp_total = input.xpTotal;

  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('id', created.user.id);

  if (updateError) throw updateError;

  return { id: created.user.id, email: input.email, password: input.password };
}

/**
 * Signs in with email/password using the anon client and extracts the
 * Supabase session cookie (name + base64-encoded value) for use with
 * `page.context().addCookies()` or as a `Cookie:` request header.
 */
export async function buildSessionCookie(
  email: string,
  password: string
): Promise<{ name: string; value: string }> {
  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
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
  if (!authEntry) throw new Error(`No auth token stored after sign-in: ${email}`);

  const [name, rawValue] = authEntry;
  return { name, value: `base64-${toBase64Url(rawValue)}` };
}

/** Deletes a QA user from Supabase Auth (cascades to user_profiles). */
export async function deleteQaUser(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

/** Returns a random 9-digit integer suitable for organic_id. */
export function randomOrganicId(): number {
  return Math.floor(100_000_000 + Math.random() * 800_000_000);
}

/** Returns a unique prefix string for test fixture IDs. */
export function runId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

/**
 * Returns the first org's id, or null if no orgs exist.
 * Used to satisfy org_id when inserting sprints/tasks directly via service role.
 */
export async function getFirstOrgId(supabaseAdmin: SupabaseClient): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('orgs')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Returns the id of the currently active sprint, or null if none.
 */
export async function getActiveSprintId(supabaseAdmin: SupabaseClient): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('sprints')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Creates a sprint directly in the DB via service role (bypasses API auth/conflict checks).
 * Useful for fixture setup when an active sprint is needed for submissions.
 */
export async function insertActiveSprint(
  supabaseAdmin: SupabaseClient,
  orgId: string,
  name: string
): Promise<string | null> {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const { data } = await supabaseAdmin
    .from('sprints')
    .insert({
      org_id: orgId,
      name,
      start_at: now.toISOString(),
      end_at: end.toISOString(),
      status: 'active',
    })
    .select('id')
    .single();
  return data?.id ?? null;
}

/** Cookie header string from a session cookie object. */
export function cookieHeader(cookie: { name: string; value: string }): string {
  return `${cookie.name}=${cookie.value}`;
}
