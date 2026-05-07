/**
 * Inspects current X Engagement Rewards (XER) data state.
 *
 * Reports:
 *   • twitter_accounts active rows (do we have a linked admin/council X account?)
 *   • engagement_handles (what handles are tracked, if any)
 *   • engagement_posts (with open windows)
 *   • engagement_submissions (any user submissions yet?)
 *
 * Usage:
 *   set -a; source .env.local; set +a; npx tsx scripts/inspect-xer-state.ts
 *
 * Read-only — never mutates anything.
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

async function main() {
  console.log('=== twitter_accounts (need is_active=true) ===');
  const { data: accounts, error: accErr, count: accCount } = await supabase
    .from('twitter_accounts')
    .select('id, user_id, twitter_username, is_active, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);
  if (accErr) console.error('error:', accErr.message);
  else {
    console.log(`total rows: ${accCount}`);
    for (const a of accounts ?? []) {
      console.log(
        `  ${a.is_active ? '✅' : '❌'} @${a.twitter_username}  user_id=${a.user_id}  created=${a.created_at?.slice(0, 10)}`
      );
    }
  }

  console.log('');
  console.log('=== engagement_handles (org-allowlisted X handles to track) ===');
  const { data: handles, error: hErr, count: hCount } = await supabase
    .from('engagement_handles')
    .select('id, handle, display_name, is_active, last_polled_at, last_seen_tweet_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);
  if (hErr) console.error('error:', hErr.message);
  else {
    console.log(`total rows: ${hCount}`);
    for (const h of handles ?? []) {
      console.log(
        `  ${h.is_active ? '✅' : '❌'} @${h.handle}  display="${h.display_name ?? '-'}"  last_polled=${h.last_polled_at ?? 'never'}`
      );
    }
  }

  console.log('');
  console.log('=== engagement_posts (tracked posts with engagement windows) ===');
  const { data: posts, error: pErr, count: pCount } = await supabase
    .from('engagement_posts')
    .select('id, tweet_id, handle_id, posted_at, engagement_window_ends_at, pool_size, is_excluded', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(10);
  if (pErr) console.error('error:', pErr.message);
  else {
    console.log(`total rows: ${pCount}`);
    const now = Date.now();
    for (const p of posts ?? []) {
      const winEnds = new Date(p.engagement_window_ends_at).getTime();
      const isOpen = !p.is_excluded && winEnds > now;
      console.log(
        `  ${isOpen ? '🟢 open' : '⚪ closed'} tweet=${p.tweet_id}  pool=${p.pool_size}  window_ends=${p.engagement_window_ends_at?.slice(0, 16)}`
      );
    }
  }

  console.log('');
  console.log('=== engagement_submissions (user-submitted engagements) ===');
  const { count: sCount } = await supabase
    .from('engagement_submissions')
    .select('id', { count: 'exact', head: true });
  console.log(`total rows: ${sCount ?? 0}`);

  console.log('');
  console.log('=== orgs (need org_id for handles) ===');
  const { data: orgs } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .order('created_at', { ascending: true })
    .limit(5);
  for (const o of orgs ?? []) {
    console.log(`  org=${o.id}  slug=${o.slug}  name="${o.name}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
