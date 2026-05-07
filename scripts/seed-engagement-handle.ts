/**
 * Seeds an X handle into engagement_handles so the XER cron starts polling.
 *
 * Why: PR #77 shipped the XER backend and crons but the engagement_handles
 * table was empty, so every poll cron returned {discoveredPosts: 0}. Once
 * a handle is active, the next poll uses the oldest active twitter_accounts
 * row as the crawler and discovers recent tweets from that handle into
 * engagement_posts automatically.
 *
 * Idempotent — checks for an existing row on (org_id, lower(handle)) before
 * insert. Re-running won't create duplicates.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-engagement-handle.ts <handle> [display_name]
 *
 *   handle:        the X handle (without @), e.g. "organic_bonk"
 *   display_name:  optional friendly label, e.g. "Organic"
 *
 * Defaults: org slug "organic", is_active=true, added_by=NULL.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_SLUG = process.env.SEED_ORG_SLUG ?? 'organic';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const handleArg = process.argv[2];
const displayName = process.argv[3] ?? null;

if (!handleArg) {
  console.error('Usage: npx tsx scripts/seed-engagement-handle.ts <handle> [display_name]');
  process.exit(1);
}

// Strip leading @ if user pasted the full mention
const handle = handleArg.replace(/^@/, '').trim();
if (!handle) {
  console.error('Handle is empty after trimming.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: org, error: orgErr } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('slug', ORG_SLUG)
    .maybeSingle();
  if (orgErr || !org) {
    console.error(`Org with slug "${ORG_SLUG}" not found. Set SEED_ORG_SLUG to override.`);
    process.exit(1);
  }
  console.log(`Org: ${org.name} (${org.id})`);

  const { data: existing } = await supabase
    .from('engagement_handles')
    .select('id, handle, is_active, last_polled_at')
    .eq('org_id', org.id)
    .ilike('handle', handle)
    .maybeSingle();

  if (existing) {
    console.log(`Handle @${existing.handle} already exists (id=${existing.id}, is_active=${existing.is_active}, last_polled=${existing.last_polled_at ?? 'never'}).`);
    if (!existing.is_active) {
      const { error } = await supabase
        .from('engagement_handles')
        .update({ is_active: true })
        .eq('id', existing.id);
      if (error) {
        console.error('Failed to re-activate:', error.message);
        process.exit(1);
      }
      console.log('Re-activated.');
    }
    return;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('engagement_handles')
    .insert({
      org_id: org.id,
      handle,
      display_name: displayName,
      is_active: true,
    })
    .select('id, handle, display_name, is_active, created_at')
    .single();

  if (insertErr) {
    console.error('Insert failed:', insertErr.message);
    process.exit(1);
  }

  console.log(`Inserted: @${inserted.handle} (id=${inserted.id}). Cron will poll on the next run (every 15 min).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
