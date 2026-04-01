/**
 * LAUNCH CLEANUP — Wipe everything except Cisco's account.
 *
 * Usage:
 *   npx tsx scripts/cleanup-for-launch.ts          # dry-run (shows what would be deleted)
 *   npx tsx scripts/cleanup-for-launch.ts --run     # actually delete
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** The ONLY account to keep */
const KEEP_EMAIL = 'fcisco95@proton.me';

const dryRun = !process.argv.includes('--run');

async function log(msg: string) {
  console.log(dryRun ? `[DRY-RUN] ${msg}` : msg);
}

async function deleteFrom(table: string, filter?: { column: string; op: string; value: string }) {
  if (dryRun) {
    log(`Would delete from "${table}"${filter ? ` where ${filter.column} ${filter.op} ${filter.value}` : ' (all rows)'}`);
    return;
  }

  try {
    let query = supabase.from(table).delete();
    if (filter) {
      query = query.neq(filter.column, filter.value);
    } else {
      // Delete all rows — need a filter, use id > 0 or created_at is not null
      query = query.gte('id', 0);
    }
    const { error, count } = await query;
    if (error) {
      // Try with uuid-style filter if int id fails
      if (error.message.includes('invalid input syntax')) {
        const { error: err2 } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err2) log(`  ⚠ ${table}: ${err2.message}`);
        else log(`  ✓ ${table}: cleaned`);
      } else {
        log(`  ⚠ ${table}: ${error.message}`);
      }
    } else {
      log(`  ✓ ${table}: cleaned`);
    }
  } catch (e: any) {
    log(`  ⚠ ${table}: ${e.message}`);
  }
}

async function main() {
  console.log('\n🧹 ORGANIC APP — LAUNCH CLEANUP');
  console.log(`   Keeping only: ${KEEP_EMAIL}`);
  console.log(`   Mode: ${dryRun ? 'DRY-RUN (no changes)' : '⚠️  LIVE — DELETING DATA'}\n`);

  if (!dryRun) {
    console.log('Starting in 5 seconds... Press Ctrl+C to abort.\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 1. Find Cisco's user ID
  const { data: ciscoProfile } = await supabase
    .from('user_profiles')
    .select('id, name, email, organic_id, role')
    .eq('email', KEEP_EMAIL)
    .single();

  if (!ciscoProfile) {
    console.error(`Could not find user with email ${KEEP_EMAIL}`);
    process.exit(1);
  }

  const ciscoId = ciscoProfile.id;
  log(`Found Cisco: id=${ciscoId}, name=${ciscoProfile.name}, organic_id=${ciscoProfile.organic_id}, role=${ciscoProfile.role}\n`);

  // 2. Delete all data tables (order matters — children before parents)
  log('--- Phase 1: Activity & Notifications ---');
  const activityTables = [
    'notifications', 'notification_batches', 'notification_batch_events',
    'notification_preferences', 'activity_log',
  ];
  for (const t of activityTables) await deleteFrom(t);

  log('\n--- Phase 2: Engagement & Campaigns ---');
  const engagementTables = [
    'egg_opens', 'golden_eggs', 'egg_hunt_luck', 'egg_hunt_config',
    'engagement_proofs', 'boost_requests', 'engagement_metrics_daily',
    'twitter_engagement_submissions', 'twitter_engagement_tasks',
    'twitter_oauth_sessions', 'twitter_accounts',
    'login_streaks', 'daily_task_progress',
    'donations', 'market_snapshots',
  ];
  for (const t of engagementTables) await deleteFrom(t);

  log('\n--- Phase 3: Gamification & Reputation ---');
  const gamificationTables = [
    'quest_completions', 'user_quests', 'user_activity_counts',
    'xp_events', 'user_achievements', 'user_achievement_progress',
    'points_ledger', 'points_escrow', 'point_burns',
    'user_badges', 'referral_rewards', 'referrals', 'referral_codes',
  ];
  for (const t of gamificationTables) await deleteFrom(t);

  log('\n--- Phase 4: Disputes ---');
  const disputeTables = [
    'dispute_evidence_events', 'dispute_comments', 'disputes',
  ];
  for (const t of disputeTables) await deleteFrom(t);

  log('\n--- Phase 5: Rewards ---');
  const rewardTables = [
    'reward_settlement_events', 'reward_claims', 'reward_distributions',
  ];
  for (const t of rewardTables) await deleteFrom(t);

  log('\n--- Phase 6: Voting & Proposals ---');
  const votingTables = [
    'votes', 'vote_delegations', 'proposal_voter_snapshots',
    'holder_snapshots', 'wallet_balance_snapshots',
    'comments', 'proposal_stage_events', 'proposal_versions',
    'proposals',
  ];
  for (const t of votingTables) await deleteFrom(t);

  log('\n--- Phase 7: Tasks & Submissions ---');
  const taskTables = [
    'task_comments', 'task_likes', 'task_submissions',
    'task_assignees', 'task_dependencies', 'recurring_task_instances',
    'tasks',
  ];
  for (const t of taskTables) await deleteFrom(t);

  log('\n--- Phase 8: Ideas ---');
  const ideaTables = [
    'idea_comments', 'idea_votes', 'idea_events',
    'idea_promotion_cycles', 'ideas',
  ];
  for (const t of ideaTables) await deleteFrom(t);

  log('\n--- Phase 9: Sprints ---');
  const sprintTables = ['sprint_snapshots', 'sprints'];
  for (const t of sprintTables) await deleteFrom(t);

  log('\n--- Phase 10: Posts & Social ---');
  const postTables = [
    'post_flags', 'post_likes', 'post_comments', 'post_thread_parts', 'posts',
    'user_follows',
  ];
  for (const t of postTables) await deleteFrom(t);

  log('\n--- Phase 11: Admin & Config ---');
  const adminTables = ['admin_config_audit_events'];
  for (const t of adminTables) await deleteFrom(t);

  log('\n--- Phase 12: Delete other users ---');
  // Delete wallet connections for non-Cisco users
  if (!dryRun) {
    const { error: wcErr } = await supabase
      .from('wallet_connections')
      .delete()
      .neq('user_id', ciscoId);
    log(wcErr ? `  ⚠ wallet_connections: ${wcErr.message}` : '  ✓ wallet_connections: cleaned (other users)');

    // Delete wallet nonces
    const { error: wnErr } = await supabase
      .from('wallet_nonces')
      .delete()
      .gte('id', 0);
    log(wnErr ? `  ⚠ wallet_nonces: ${wnErr.message}` : '  ✓ wallet_nonces: cleaned');

    // Delete other user profiles
    const { error: upErr } = await supabase
      .from('user_profiles')
      .delete()
      .neq('id', ciscoId);
    log(upErr ? `  ⚠ user_profiles: ${upErr.message}` : '  ✓ user_profiles: cleaned (kept Cisco)');

    // Delete other auth users via admin API
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authUsers?.users) {
      const othersCount = authUsers.users.filter((u) => u.id !== ciscoId).length;
      log(`  Deleting ${othersCount} auth users (keeping Cisco)...`);
      for (const user of authUsers.users) {
        if (user.id !== ciscoId) {
          const { error } = await supabase.auth.admin.deleteUser(user.id);
          if (error) log(`    ⚠ auth user ${user.email}: ${error.message}`);
        }
      }
      log('  ✓ auth users: cleaned');
    }
  } else {
    log('Would delete all wallet_connections, wallet_nonces, user_profiles, and auth users except Cisco');
  }

  log('\n--- Phase 13: Reset Cisco\'s stats ---');
  if (!dryRun) {
    const { error: resetErr } = await supabase
      .from('user_profiles')
      .update({
        xp: 0,
        level: 1,
        reputation_score: 0,
        contribution_count: 0,
        streak_days: 0,
        longest_streak: 0,
      })
      .eq('id', ciscoId);
    log(resetErr ? `  ⚠ Reset Cisco stats: ${resetErr.message}` : '  ✓ Cisco stats reset to zero');
  } else {
    log('Would reset Cisco xp=0, level=1, reputation=0, contributions=0, streaks=0');
  }

  console.log('\n✅ Cleanup complete!\n');
  if (dryRun) {
    console.log('This was a dry run. To actually delete, run:');
    console.log('  npx tsx scripts/cleanup-for-launch.ts --run\n');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
