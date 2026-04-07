/**
 * Removes ALL QA/test data from the production database.
 * Keeps only real users and their data.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/cleanup-all-qa-data.ts
 *
 * DRY RUN by default — pass --execute to actually delete.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const execute = process.argv.includes('--execute');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Emails patterns that indicate QA/test accounts */
const QA_PATTERNS = [
  'example.com',
  'qa1',
  'qa-',
  'voting_integrity',
  'phase16ui',
  'claude-test',
  'organic.test',
];

/** Real user emails to NEVER delete */
const REAL_EMAILS = [
  'fcisco95@proton.me',
  'organic_community@proton.me',
  'anasmusasalisu33@gmail.com',
];

function isQaEmail(email: string | null): boolean {
  if (!email) return false;
  // Never touch real users
  if (REAL_EMAILS.includes(email)) return false;
  return QA_PATTERNS.some((pattern) => email.includes(pattern));
}

async function getQaUserIds(): Promise<string[]> {
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email');

  if (error || !users) {
    console.error('Failed to fetch users:', error?.message);
    return [];
  }

  return users.filter((u) => isQaEmail(u.email)).map((u) => u.id);
}

async function deleteInBatches(
  table: string,
  column: string,
  ids: string[],
  label: string
): Promise<number> {
  if (ids.length === 0) return 0;

  let total = 0;
  const batchSize = 50;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    if (execute) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .in(column, batch);

      if (error) {
        console.error(`  Error deleting from ${table}:`, error.message);
      } else {
        total += count || 0;
      }
    } else {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .in(column, batch);
      total += count || 0;
    }
  }

  console.log(`  ${label}: ${total} rows ${execute ? 'DELETED' : 'would be deleted'}`);
  return total;
}

async function deleteQaSprints(): Promise<number> {
  // Delete sprints with QA-related names
  if (execute) {
    const { error, count } = await supabase
      .from('sprints')
      .delete({ count: 'exact' })
      .or('name.ilike.%qa%,name.ilike.%test%,name.ilike.%integrity%');

    if (error) {
      console.error('  Error deleting QA sprints:', error.message);
      return 0;
    }
    console.log(`  QA sprints: ${count} DELETED`);
    return count || 0;
  } else {
    const { count } = await supabase
      .from('sprints')
      .select('id', { count: 'exact', head: true })
      .or('name.ilike.%qa%,name.ilike.%test%,name.ilike.%integrity%');

    console.log(`  QA sprints: ${count} would be deleted`);
    return count || 0;
  }
}

async function deleteQaAuthUsers(qaUserIds: string[]): Promise<number> {
  if (qaUserIds.length === 0) return 0;

  let deleted = 0;
  for (const id of qaUserIds) {
    if (execute) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) {
        // Ignore "user not found" errors — profile may exist without auth user
        if (!error.message.includes('not found')) {
          console.error(`  Error deleting auth user ${id}:`, error.message);
        }
      } else {
        deleted++;
      }
    } else {
      deleted++;
    }
  }

  console.log(`  Auth users: ${deleted} ${execute ? 'DELETED' : 'would be deleted'}`);
  return deleted;
}

async function main() {
  console.log(execute ? '=== EXECUTING CLEANUP ===' : '=== DRY RUN (pass --execute to delete) ===');
  console.log('');

  // Step 1: Get QA user IDs
  console.log('Finding QA users...');
  const qaIds = await getQaUserIds();
  console.log(`  Found ${qaIds.length} QA users\n`);

  if (qaIds.length === 0) {
    console.log('No QA users found. Nothing to clean up.');
    return;
  }

  // Step 2: Delete dependent data first (FK constraints)
  console.log('Cleaning dependent data...');
  await deleteInBatches('xp_events', 'user_id', qaIds, 'XP events');
  await deleteInBatches('notifications', 'user_id', qaIds, 'Notifications');
  await deleteInBatches('activity_log', 'user_id', qaIds, 'Activity log');
  await deleteInBatches('votes', 'voter_id', qaIds, 'Votes');
  await deleteInBatches('user_achievements', 'user_id', qaIds, 'User achievements');
  await deleteInBatches('user_achievement_progress', 'user_id', qaIds, 'Achievement progress');
  await deleteInBatches('points_ledger', 'user_id', qaIds, 'Points ledger');
  await deleteInBatches('quest_completions', 'user_id', qaIds, 'Quest completions');
  await deleteInBatches('user_quests', 'user_id', qaIds, 'User quests');
  await deleteInBatches('referrals', 'referrer_id', qaIds, 'Referrals (referrer)');
  await deleteInBatches('referrals', 'referred_id', qaIds, 'Referrals (referred)');

  // Step 3: Delete content data
  console.log('\nCleaning content data...');

  // Comments on QA proposals
  await deleteInBatches('proposal_comments', 'user_id', qaIds, 'Proposal comments');
  await deleteInBatches('idea_comments', 'user_id', qaIds, 'Idea comments');
  await deleteInBatches('idea_votes', 'user_id', qaIds, 'Idea votes');
  await deleteInBatches('task_comments', 'author_id', qaIds, 'Task comments');
  await deleteInBatches('post_likes', 'user_id', qaIds, 'Post likes');
  await deleteInBatches('post_comments', 'author_id', qaIds, 'Post comments');
  await deleteInBatches('task_likes', 'user_id', qaIds, 'Task likes');

  // Disputes
  await deleteInBatches('disputes', 'disputant_id', qaIds, 'Disputes (disputant)');

  // Submissions
  await deleteInBatches('submissions', 'submitted_by', qaIds, 'Submissions');

  // Step 4: Delete main content
  console.log('\nCleaning main content...');

  // Proposal versions before proposals
  await deleteInBatches('proposal_versions', 'created_by', qaIds, 'Proposal versions');
  await deleteInBatches('proposals', 'created_by', qaIds, 'Proposals');
  await deleteInBatches('tasks', 'created_by', qaIds, 'Tasks');
  await deleteInBatches('ideas', 'author_id', qaIds, 'Ideas');
  await deleteInBatches('posts', 'author_id', qaIds, 'Posts');

  // Step 5: Delete QA sprints
  console.log('\nCleaning sprints...');
  // First unlink tasks from QA sprints
  if (execute) {
    const { data: qaSprints } = await supabase
      .from('sprints')
      .select('id')
      .or('name.ilike.%qa%,name.ilike.%test%,name.ilike.%integrity%');

    if (qaSprints && qaSprints.length > 0) {
      const sprintIds = qaSprints.map((s) => s.id);
      for (let i = 0; i < sprintIds.length; i += 50) {
        const batch = sprintIds.slice(i, i + 50);
        await supabase
          .from('tasks')
          .update({ sprint_id: null })
          .in('sprint_id', batch);
      }
    }
  }
  await deleteQaSprints();

  // Step 6: Delete wallet connections for QA users
  console.log('\nCleaning user data...');
  await deleteInBatches('wallet_connections', 'user_id', qaIds, 'Wallet connections');

  // Step 7: Delete QA user profiles
  await deleteInBatches('user_profiles', 'id', qaIds, 'User profiles');

  // Step 8: Delete auth users
  console.log('\nCleaning auth users...');
  await deleteQaAuthUsers(qaIds);

  console.log('\n=== Done! ===');
  if (!execute) {
    console.log('This was a DRY RUN. Run with --execute to actually delete.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
