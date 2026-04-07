/**
 * Grants the Cosmic Egg (#10) to Cisco's account.
 * Inserts golden_eggs row, awards 100 XP, logs activity, resets luck.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/grant-cosmic-egg.ts
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

const CISCO_EMAIL = 'fcisco95@proton.me';
const EGG_NUMBER = 10;
const ELEMENT = 'cosmic';
const XP_AMOUNT = 100;

async function main() {
  // 1. Find Cisco's user profile
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('id, name, email, organic_id')
    .eq('email', CISCO_EMAIL)
    .single();

  if (profileErr || !profile) {
    console.error('Could not find Cisco:', profileErr?.message);
    process.exit(1);
  }

  const userId = profile.id;
  console.log(`Found Cisco: id=${userId}, name=${profile.name}, organic_id=${profile.organic_id}`);

  // 2. Check if cosmic egg is already claimed
  const { data: existing } = await supabase
    .from('golden_eggs')
    .select('id, user_id')
    .eq('egg_number', EGG_NUMBER)
    .maybeSingle();

  if (existing) {
    if (existing.user_id === userId) {
      console.log('You already own the Cosmic Egg!');
    } else {
      console.log('Cosmic Egg is already claimed by another user.');
    }
    process.exit(0);
  }

  // 3. Insert cosmic egg
  const { data: egg, error: insertErr } = await supabase
    .from('golden_eggs')
    .insert({
      user_id: userId,
      egg_number: EGG_NUMBER,
      element: ELEMENT,
      found_on_page: '/en/dashboard',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Failed to insert egg:', insertErr.message);
    process.exit(1);
  }

  console.log(`Cosmic Egg claimed! id=${egg.id}`);

  // 4. Award 100 XP
  const { error: xpErr } = await supabase.from('xp_events').insert({
    user_id: userId,
    event_type: 'egg_found',
    xp_amount: XP_AMOUNT,
    source_type: 'golden_egg',
    source_id: egg.id,
    metadata: { egg_number: EGG_NUMBER, element: ELEMENT },
  });

  if (xpErr) {
    console.warn('XP award failed (egg still claimed):', xpErr.message);
  } else {
    console.log(`Awarded ${XP_AMOUNT} XP`);
  }

  // 5. Log to activity feed
  const { error: actErr } = await supabase.from('activity_log').insert({
    event_type: 'egg_found',
    actor_id: userId,
    subject_type: 'golden_egg',
    subject_id: egg.id,
    metadata: { egg_number: EGG_NUMBER, element: ELEMENT, element_name: 'Cosmic' },
  });

  if (actErr) {
    console.warn('Activity log failed:', actErr.message);
  } else {
    console.log('Activity log entry created');
  }

  // 6. Reset luck page loads
  const { error: luckErr } = await supabase.from('egg_hunt_luck').upsert({
    user_id: userId,
    page_loads_since_last_find: 0,
    luck_boost: 0,
    last_calculated_at: new Date().toISOString(),
  });

  if (luckErr) {
    console.warn('Luck reset failed:', luckErr.message);
  } else {
    console.log('Luck state reset');
  }

  console.log('\nDone! Cosmic Egg is yours.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
