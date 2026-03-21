/**
 * Creates QA fixture accounts for manual testing.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/create-qa-accounts.ts
 *
 * Creates 3 accounts (admin, council, member) with known credentials.
 * Safe to re-run — skips accounts that already exist.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const QA_ACCOUNTS = [
  {
    email: 'qa-admin@organic.test',
    password: 'QaAdmin2026!',
    name: 'QA Admin',
    role: 'admin' as const,
    organicId: 900001,
  },
  {
    email: 'qa-council@organic.test',
    password: 'QaCouncil2026!',
    name: 'QA Council',
    role: 'council' as const,
    organicId: 900002,
  },
  {
    email: 'qa-member@organic.test',
    password: 'QaMember2026!',
    name: 'QA Member',
    role: 'member' as const,
    organicId: 900003,
  },
];

async function waitForProfile(userId: string, maxWait = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (data) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Profile not created for ${userId} after ${maxWait}ms`);
}

async function main() {
  for (const account of QA_ACCOUNTS) {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('email', account.email)
      .maybeSingle();

    if (existing) {
      // Update role and organic_id in case they drifted
      await supabase
        .from('user_profiles')
        .update({ role: account.role, organic_id: account.organicId, name: account.name })
        .eq('id', existing.id);
      console.log(`[SKIP] ${account.email} already exists (updated role → ${account.role})`);
      continue;
    }

    // Create auth user
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { name: account.name },
    });

    if (error) {
      // User might exist in auth but not profiles — try to continue
      if (error.message.includes('already been registered')) {
        console.log(`[SKIP] ${account.email} auth user exists`);
        continue;
      }
      console.error(`[FAIL] ${account.email}: ${error.message}`);
      continue;
    }

    if (!created.user?.id) {
      console.error(`[FAIL] ${account.email}: no user ID returned`);
      continue;
    }

    // Wait for trigger to create profile
    await waitForProfile(created.user.id);

    // Update profile with role and organic_id
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        name: account.name,
        role: account.role,
        organic_id: account.organicId,
      })
      .eq('id', created.user.id);

    if (updateError) {
      console.error(`[FAIL] ${account.email} profile update: ${updateError.message}`);
      continue;
    }

    console.log(`[CREATED] ${account.email} → role: ${account.role}, organic_id: ${account.organicId}`);
  }

  console.log('\nDone. QA accounts ready.');
}

main().catch(console.error);
