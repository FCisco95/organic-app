/**
 * Seeds Easter campaign cards into the campaigns table.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-easter-campaigns.ts
 *
 * Safe to re-run — skips campaigns that already exist (matched by title).
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

const CAMPAIGNS = [
  {
    title: 'Launch Week \u2014 2x XP',
    description: 'All XP rewards are doubled during launch week! Complete tasks, vote on proposals, and engage with the community to earn bonus XP.',
    icon: '\ud83d\ude80',
    banner_url: '/campaigns/launch-week.jpg',
    cta_text: 'Start Earning',
    cta_link: '/tasks',
    starts_at: '2026-04-05T00:00:00Z',
    ends_at: '2026-04-12T23:59:59Z',
    priority: 10,
    is_active: true,
    target_audience: 'all',
    visibility_condition: 'always',
  },
  {
    title: 'Genesis Sprint',
    description: 'The first-ever Organic sprint is live! Complete tasks, earn badges, and climb the leaderboard.',
    icon: '\ud83c\udfc1',
    banner_url: '/campaigns/genesis-sprint.jpg',
    cta_text: 'View Sprint',
    cta_link: '/sprints',
    starts_at: '2026-04-05T00:00:00Z',
    ends_at: '2026-04-19T23:59:59Z',
    priority: 5,
    is_active: true,
    target_audience: 'members',
    visibility_condition: 'always',
  },
  {
    title: 'The Golden Eggs Are Real',
    description: '10 elemental eggs are hidden across the app. Find them, collect them, earn XP. Some say the Cosmic egg brings untold fortune...',
    icon: '\ud83e\udd5a',
    banner_url: '/campaigns/golden-eggs.jpg',
    cta_text: 'Learn More',
    cta_link: '/quests',
    starts_at: '2026-04-05T00:00:00Z',
    ends_at: '2026-04-20T23:59:59Z',
    priority: 20,
    is_active: true,
    target_audience: 'members',
    visibility_condition: 'egg_hunt_revealed',
  },
];

async function main() {
  // Resolve a created_by user — pick the first auth user
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1 });
  const createdBy = authData?.users?.[0]?.id;
  if (!createdBy) {
    console.error('No auth users found — cannot set created_by');
    process.exit(1);
  }
  console.log(`Using created_by: ${createdBy}`);

  for (const campaign of CAMPAIGNS) {
    // Check if campaign already exists by title
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('title', campaign.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Already exists: ${campaign.title}`);
      continue;
    }

    const { error } = await supabase
      .from('campaigns')
      .insert({ ...campaign, created_by: createdBy });

    if (error) {
      console.error(`Failed to seed "${campaign.title}":`, error.message);
    } else {
      console.log(`Seeded: ${campaign.title}`);
    }
  }

  console.log('Done.');
}

main().catch(console.error);
