/**
 * Adds Jupiter-verification tasks to the active sprint.
 *
 * Plan: ~/.claude/plans/i-want-you-to-snuggly-spindle.md (Jupiter add-on)
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/add-jupiter-verification-tasks.ts
 *
 * Idempotent — skips tasks already present in the sprint by title.
 *
 * Background: Jupiter Verify V3 grants verification based on (a) algorithmic
 * organic score, (b) "smart likes" on jup.ag/tokens/<mint>, and (c) Community
 * Tag application at catdetlist.jup.ag. Spamming @JupiterExchange directly
 * is counterproductive — see anti-pattern note in task #3.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_MINT = process.env.NEXT_PUBLIC_ORG_TOKEN_MINT;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!ORG_MINT) {
  console.error('Missing NEXT_PUBLIC_ORG_TOKEN_MINT in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SPRINT_ID = '9dc7ece3-64b7-4672-9e16-17190aa03635';
const JUP_TOKEN_URL = `https://jup.ag/tokens/${ORG_MINT}`;

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskType = 'development' | 'content' | 'design' | 'custom' | 'twitter';

interface JupiterTask {
  title: string;
  description: string;
  priority: TaskPriority;
  task_type: TaskType;
  points: number;
  base_points: number;
  status: 'todo' | 'backlog';
  is_team_task: boolean;
  max_assignees: number;
  labels: string[];
  assigned_to_admin: boolean;
}

const TASKS: JupiterTask[] = [
  {
    title: 'Apply for Jupiter Community Tag verification',
    description: [
      '**WHAT:** Submit $ORG for Jupiter Community Tag verification — the path to a verified badge on jup.ag, Phantom, Solflare, and most Solana apps.',
      '',
      '**WHY:** Jupiter Verify V3 is the de-facto trust layer on Solana — verified tokens get the badge, surface in default search, and signal legitimacy to new buyers. ~95% of Solana DEX volume routes through Jupiter.',
      '',
      '**HOW:**',
      `1. Go to https://catdetlist.jup.ag/`,
      '2. Compile application materials:',
      '   - Project description + thesis',
      '   - Tokenomics + supply transparency (mint authority, distribution)',
      `   - $ORG mint address: ${ORG_MINT}`,
      '   - Community proof: organichub.fun, @organic_bonk, member count, sprint history',
      '   - Real product: link to /sprints, /proposals, /pulse',
      '   - Audit / contract review (if any)',
      '3. Submit application',
      '4. Track status; respond to any reviewer questions promptly',
      '5. Coordinate community Smart-Like task (separate sprint task) to boost organic score in parallel',
      '',
      '**REFERENCES:**',
      '- Community Tag FAQ: https://www.jupresear.ch/t/faq-jupiter-community-tag/23074',
      '- Application portal: https://catdetlist.jup.ag/',
      '- Jupiter Verify overview: https://jup.ag/verify',
      '',
      '**HOW TO SUBMIT (this task):** PR link or admin-confirmation post. Include the application reference number once submitted.',
      '',
      '**POINTS:** 400.',
    ].join('\n'),
    priority: 'high',
    task_type: 'development',
    points: 400,
    base_points: 400,
    status: 'todo',
    is_team_task: false,
    max_assignees: 1,
    labels: ['jupiter', 'verification', 'high-priority'],
    assigned_to_admin: true,
  },
  {
    title: 'Smart-like $ORG on Jupiter token page',
    description: [
      `**WHAT:** Go to ${JUP_TOKEN_URL}, connect your Solana wallet, and click the like button on the $ORG token page. This is a "smart like" — Jupiter weights it by your wallet's on-chain history.`,
      '',
      "**WHY:** Smart likes are THE direct mechanism that feeds Jupiter's organic score. The organic score is what determines Community Tag verification. This is the single highest-leverage thing the community can do.",
      '',
      '**HOW TO SUBMIT:**',
      `1. Visit ${JUP_TOKEN_URL}`,
      '2. Connect your wallet (the same wallet linked to your Organic profile if possible)',
      '3. Click the like / heart button on the token page',
      '4. Take a screenshot showing the liked state + your wallet identifier visible',
      '5. Paste the screenshot URL in your submission',
      '',
      '**CRITERIA:**',
      '- ✅ Real wallet with prior on-chain activity (smart-like-eligible)',
      '- ✅ One submission per wallet',
      '- ❌ No throwaway / freshly-funded wallets — Jupiter filters these out anyway',
      '',
      '**POINTS:** 30 flat per verified like.',
      '',
      '**Note:** This task does not require holding $ORG — any Solana wallet works. Encourage friends to do this too.',
    ].join('\n'),
    priority: 'high',
    task_type: 'custom',
    points: 30,
    base_points: 30,
    status: 'todo',
    is_team_task: true,
    max_assignees: 200,
    labels: ['jupiter', 'verification', 'community', 'recurring'],
    assigned_to_admin: false,
  },
  {
    title: 'Build organic momentum about $ORG on X (Jupiter signal)',
    description: [
      '**WHAT:** Create or boost authentic content on X that shows real Organic traction — product depth, community life, sprint progress, member voices. Goal: build the external legitimacy signals that ecosystem evaluators (including Jupiter reviewers) notice.',
      '',
      '**WHY:** Jupiter Community Tag review weighs qualitative factors — active community, "vibes," lore, organic momentum. Real signal compounds; manufactured signal gets filtered.',
      '',
      '**HOW (any of):**',
      '- Post a thread about a real Organic feature you used (with screenshots)',
      '- Share a personal story about why you joined Organic',
      '- Quote-tweet @organic_bonk milestone posts with substantive commentary',
      '- Reply thoughtfully to threads about Solana DAOs or community tokens, mentioning Organic when genuinely relevant',
      '',
      '**HOW TO SUBMIT:** Paste the URL of your tweet/thread/reply.',
      '',
      '**🚫 DO NOT — these hurt our case:**',
      '- ❌ Do NOT @-mention @JupiterExchange or @weremeow asking for verification.',
      "- ❌ Do NOT mass-spam Jupiter reviewers' DMs or replies.",
      "- ❌ Do NOT make exaggerated claims about Organic's traction or product.",
      '- ❌ Do NOT post template/copy-paste content. Filtered out, no points.',
      '',
      'Reviewers can tell the difference between organic enthusiasm and farm activity. The first earns verification; the second loses it.',
      '',
      '**POINTS:** 40 base, quality-scored 1–5 (max 60).',
    ].join('\n'),
    priority: 'medium',
    task_type: 'twitter',
    points: 40,
    base_points: 40,
    status: 'todo',
    is_team_task: true,
    max_assignees: 50,
    labels: ['jupiter', 'verification', 'twitter', 'community', 'recurring'],
    assigned_to_admin: false,
  },
];

async function getOrg(): Promise<{ id: string }> {
  const { data, error } = await supabase.from('orgs').select('id').limit(1).single();
  if (error || !data) {
    console.error('No org found:', error?.message);
    process.exit(1);
  }
  return data;
}

async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin')
    .order('organic_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();
  if (error || !data) {
    console.error('No admin user found:', error?.message);
    process.exit(1);
  }
  return data.id;
}

async function addTasks(orgId: string, adminId: string): Promise<void> {
  for (const task of TASKS) {
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('sprint_id', SPRINT_ID)
      .eq('title', task.title)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  Task exists: ${task.title}`);
      continue;
    }

    const { error } = await supabase.from('tasks').insert({
      org_id: orgId,
      sprint_id: SPRINT_ID,
      title: task.title,
      description: task.description,
      status: task.status,
      points: task.points,
      base_points: task.base_points,
      priority: task.priority,
      task_type: task.task_type,
      labels: task.labels,
      is_team_task: task.is_team_task,
      max_assignees: task.max_assignees,
      assignee_id: task.assigned_to_admin ? adminId : null,
      created_by: adminId,
    });

    if (error) {
      console.error(`  Failed to insert task "${task.title}":`, error.message);
    } else {
      console.log(`  Task created: ${task.title}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`Adding Jupiter verification tasks to sprint ${SPRINT_ID}...\n`);
  const org = await getOrg();
  const adminId = await getAdminUserId();
  await addTasks(org.id, adminId);
  console.log('\n✅ Done.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Fatal:', message);
  process.exit(1);
});
