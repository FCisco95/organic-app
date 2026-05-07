/**
 * Seeds the Sprint — Community Ritual & Automation (2026-04-27 → 2026-05-11).
 *
 * Plan: ~/.claude/plans/i-want-you-to-snuggly-spindle.md
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-sprint-2026-04-27.ts
 *
 * Safe to re-run — checks for existing sprint/templates/tasks before inserting.
 *
 * Note: All six recurring templates are set to recurrence_rule = 'sprint_start'
 * because the existing clone_recurring_templates() RPC only fires on that rule.
 * Cadence guidance for weekly tasks lives in the task description; members submit
 * multiple times within the sprint via team-task max_assignees.
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

const SPRINT_NAME = 'Sprint — Community Ritual & Automation';
const SPRINT_START = '2026-04-27T00:00:00Z';
const SPRINT_END = '2026-05-11T23:59:59Z';
const SPRINT_GOAL =
  'Seed weekly community rituals (engagement, threads, memes) and ship the automation infrastructure (Telegram bot, media gallery, priority voting) that makes them scale.';
const SPRINT_CAPACITY = 3000;

interface OrgRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  organic_id: number | null;
}

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskType = 'development' | 'content' | 'design' | 'custom' | 'twitter';

interface TemplateSeed {
  name: string;
  description: string;
  task_type: TaskType;
  priority: TaskPriority;
  base_points: number;
  labels: string[];
  is_team_task: boolean;
  max_assignees: number;
}

interface OneShotSeed {
  title: string;
  description: string;
  status: 'backlog' | 'todo';
  points: number;
  priority: TaskPriority;
  task_type?: TaskType;
  labels?: string[];
  assigned_to_admin?: boolean;
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: 'Engage with @organic_bonk this week',
    description: [
      '**WHAT:** Drop one meaningful comment on any @organic_bonk post published this week.',
      '',
      '**WHY:** Organic engagement on our official account boosts reach and signals an alive community. Quality > quantity.',
      '',
      '**HOW TO SUBMIT:** Paste the URL of your reply tweet. Auto-verified via Twitter API.',
      '',
      '**CRITERIA:** Real opinion. Doesn\'t have to be positive. No emoji-only, no "GM", no copy-paste. One submission per week per member.',
      '',
      '**POINTS:** Pool of 30 × number of @organic_bonk posts that week, split among approved participants. Min 5, max 50 per person.',
      '',
      '*Note: temporary model — auto-spawn-per-post replaces this once that feature ships.*',
    ].join('\n'),
    task_type: 'twitter',
    priority: 'medium',
    base_points: 30,
    labels: ['community', 'engagement', 'recurring'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    name: 'Write a Twitter thread about Organic',
    description: [
      '**WHAT:** Write a Twitter/X thread (3+ tweets) about Organic, tied to real progress, real product, or real lore.',
      '',
      "**WHY:** Sustained narrative is what makes communities stick. Threads tied to real work age well; shill threads don't.",
      '',
      '**HOW TO SUBMIT:** Paste the URL of the first tweet of your thread.',
      '',
      '**CRITERIA:**',
      "- ✅ Truth-only — only claim what's actually shipped or actively in progress.",
      '- ✅ Organic tone — speak as a member, not a shill.',
      '- ✅ Links or screenshots when relevant.',
      '- ❌ No price talk, no "wen moon", no fabricated milestones.',
      '',
      'Quality score 1–5 by reviewer determines payout (1 = rejected, 5 = base × 1.5).',
      '',
      '**POINTS:** 0–150 based on quality score. **CADENCE:** aim for one thread per week.',
    ].join('\n'),
    task_type: 'twitter',
    priority: 'high',
    base_points: 100,
    labels: ['content', 'twitter', 'recurring'],
    is_team_task: true,
    max_assignees: 20,
  },
  {
    name: 'Create a branded Organic image or meme',
    description: [
      '**WHAT:** Create one image (meme, infographic, or branded visual) about Organic.',
      '',
      '**WHY:** Memes drive virality more than text. Builds a remix library for the community.',
      '',
      '**HOW TO SUBMIT:** Upload the file (PNG/JPG/GIF, ≤5MB) via the design submission form. Optional: paste a tweet URL if you also posted it.',
      '',
      '**CRITERIA:**',
      '- ✅ Matches Organic brand (logo correctly used, terracotta/yellow palette, organic motifs).',
      '- ✅ Original creation, not reposted.',
      '- ✅ Readable at thumbnail size.',
      '- ❌ No price/financial claims, no unauthorized third-party logos.',
      '',
      'Quality score 1–5.',
      '',
      '**POINTS:** 0–110 based on quality score. Approved images may appear in the /media gallery. **CADENCE:** aim for one image per week.',
    ].join('\n'),
    task_type: 'design',
    priority: 'medium',
    base_points: 75,
    labels: ['content', 'design', 'meme', 'recurring'],
    is_team_task: true,
    max_assignees: 20,
  },
  {
    name: 'Bug bounty — report a bug in the app',
    description: [
      '**WHAT:** Find a bug in the app and report it with reproduction steps.',
      '',
      '**WHY:** We just launched. Real users find what staging never does.',
      '',
      '**HOW TO SUBMIT:** File via in-app feedback form OR submit a description with: page URL, steps to reproduce, expected vs actual, screenshot/video.',
      '',
      '**CRITERIA / POINTS BY SEVERITY:**',
      '- S0 (data loss, security): 200pts',
      '- S1 (broken flow): 100pts',
      '- S2 (visual bug, edge case): 40pts',
      '- S3 (typo, polish): 15pts',
      '- Duplicate of already-reported bug: 10pts',
      '',
      'No cap on submissions per member.',
    ].join('\n'),
    task_type: 'development',
    priority: 'high',
    base_points: 100,
    labels: ['qa', 'bounty', 'recurring'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    name: 'Submit a high-quality idea',
    description: [
      '**WHAT:** Submit one idea on /ideas that could improve Organic.',
      '',
      '**WHY:** Ideas that get traction promote to proposals. This builds the member-voice loop and feeds future sprints.',
      '',
      '**HOW TO SUBMIT:** Use the /ideas form. Paste idea ID after submission.',
      '',
      '**CRITERIA:**',
      '- ✅ Specific and actionable (not "make it better").',
      '- ✅ Explains the problem AND a possible solution.',
      '- ❌ No duplicate of existing ideas.',
      '',
      '**POINTS:** 25 on submission. The single highest-voted idea at sprint end gets +200 bonus and auto-promotes to proposal.',
    ].join('\n'),
    task_type: 'custom',
    priority: 'medium',
    base_points: 25,
    labels: ['ideas', 'recurring'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    name: 'Welcome a new member publicly',
    description: [
      "**WHAT:** Reply to a new member's intro post with a personalized welcome.",
      '',
      '**WHY:** Public welcome rituals dramatically improve retention.',
      '',
      '**HOW TO SUBMIT:** Paste the URL of your welcome reply (in-app post or tweet).',
      '',
      '**CRITERIA:**',
      '- ✅ Tagged the new member by name.',
      '- ✅ At least one specific question or pointer.',
      '- ❌ No copy-paste templates.',
      '',
      'Cap: 3 welcomes per member per sprint.',
      '',
      '**POINTS:** 10 per approved welcome, max 30/sprint.',
    ].join('\n'),
    task_type: 'custom',
    priority: 'low',
    base_points: 10,
    labels: ['community', 'onboarding', 'recurring'],
    is_team_task: true,
    max_assignees: 100,
  },
];

const ONE_SHOTS: OneShotSeed[] = [
  {
    title: 'Write the sprint recap thread',
    description: [
      '**WHAT:** At sprint end (May 10–11), write the official Organic recap thread covering what shipped, who contributed, and what is next.',
      '',
      '**WHY:** Transparency cadence. Public proof of velocity.',
      '',
      '**HOW TO SUBMIT:** Tweet thread URL. Council reviews accuracy.',
      '',
      '**CRITERIA:** Covers all merged tasks, names contributors with X handles, includes screenshots/links. Truth-only.',
      '',
      '**POINTS:** 200 flat (single assignee — claim early).',
    ].join('\n'),
    status: 'backlog',
    points: 200,
    priority: 'medium',
    task_type: 'twitter',
    labels: ['community', 'recap'],
  },
  {
    title: 'Participate in scheduled X Space',
    description: [
      '**WHAT:** Attend the X Space at the date/time chosen by community vote and contribute a question or comment.',
      '',
      '**HOW TO SUBMIT:** Screenshot showing your handle as live participant + tweet/comment URL with your takeaway.',
      '',
      '**CRITERIA:** Live attendance (not recording). Substantive takeaway (1+ sentence with insight).',
      '',
      '**POINTS:** 80 flat.',
    ].join('\n'),
    status: 'backlog',
    points: 80,
    priority: 'medium',
    task_type: 'twitter',
    labels: ['community', 'spaces'],
  },
  {
    title: 'Telegram bot integration',
    description: [
      '**WHAT:** Telegram bot mirroring sprints, proposals, completed tasks, new members.',
      '',
      '**HOW TO SUBMIT:** PR link, bot deployed, /help /sprint /leaderboard commands minimum.',
      '',
      '**STACK:** node-telegram-bot-api or grammY. Webhook /api/telegram/webhook.',
      '**ENV:** TELEGRAM_BOT_TOKEN.',
      '',
      '**POINTS:** 400.',
    ].join('\n'),
    status: 'todo',
    points: 400,
    priority: 'high',
    task_type: 'development',
    labels: ['dev', 'integration'],
    assigned_to_admin: true,
  },
  {
    title: 'Mobile revamp — /pulse density',
    description: [
      '**WHAT:** Fix density on /pulse at 320/375/414px per docs/mobile-audit-2026-04-21.md.',
      '',
      '**HOW TO SUBMIT:** PR + screenshots all 3 widths.',
      '',
      '**POINTS:** 120.',
    ].join('\n'),
    status: 'todo',
    points: 120,
    priority: 'medium',
    task_type: 'development',
    labels: ['dev', 'mobile'],
    assigned_to_admin: true,
  },
  {
    title: 'Mobile revamp — /proposals wizard',
    description: [
      '**WHAT:** Fix wizard label truncation on /proposals at 320/375px.',
      '',
      '**HOW TO SUBMIT:** PR + screenshots all 4 wizard steps.',
      '',
      '**POINTS:** 120.',
    ].join('\n'),
    status: 'todo',
    points: 120,
    priority: 'medium',
    task_type: 'development',
    labels: ['dev', 'mobile'],
    assigned_to_admin: true,
  },
  {
    title: 'Mobile revamp — /ideas',
    description: [
      '**WHAT:** Mobile pass over /ideas list view, voting controls, submission form.',
      '',
      '**HOW TO SUBMIT:** PR + screenshots.',
      '',
      '**POINTS:** 100.',
    ].join('\n'),
    status: 'todo',
    points: 100,
    priority: 'medium',
    task_type: 'development',
    labels: ['dev', 'mobile'],
    assigned_to_admin: true,
  },
  {
    title: 'Mobile revamp — /disputes',
    description: [
      '**WHAT:** Mobile pass + fix S1 permission visibility issue per audit.',
      '',
      '**HOW TO SUBMIT:** PR + screenshots, role-tested member vs council.',
      '',
      '**POINTS:** 100.',
    ].join('\n'),
    status: 'todo',
    points: 100,
    priority: 'medium',
    task_type: 'development',
    labels: ['dev', 'mobile'],
    assigned_to_admin: true,
  },
  {
    title: 'Build /media gallery page',
    description: [
      '**WHAT:** New /media route with grid of approved branded images from the recurring meme task. Filter by tag, sort by recent/popular.',
      '',
      '**WHY:** Closes the loop — submissions become a community asset, not just point farm.',
      '',
      '**HOW TO SUBMIT:** PR with route, gallery rendering, Supabase storage bucket "media-gallery", upload pipeline reusing /profile avatar pattern. Mobile-first.',
      '',
      '**RLS:** viewable by everyone, admin/council manage.',
      '',
      '**POINTS:** 350.',
    ].join('\n'),
    status: 'todo',
    points: 350,
    priority: 'high',
    task_type: 'development',
    labels: ['dev', 'feature'],
    assigned_to_admin: true,
  },
  {
    title: 'Backlog priority voting (hybrid weighted)',
    description: [
      '**WHAT:** Voting UI during sprint planning phase. Members rank backlog tasks by priority. Top-N enter next sprint.',
      '',
      '**WEIGHT FORMULA:**',
      '  vote_weight = sqrt(org_token_balance) * (1 + ln(1 + approved_quality_submissions))',
      '',
      "  approved_quality_submissions = COUNT(*) FROM task_submissions WHERE submitter_id = X AND review_status = 'approved' AND quality_score >= 3",
      '',
      '**ELIGIBILITY:** ≥ 1 ORG token AND ≥ 1 approved task ever, OR admin/council.',
      '',
      '**UI COPY:** "You are voting on PRIORITY for the next sprint — which tasks should we tackle first. Voting yes does not mean you support the task; it means you think it should be high on next sprint\'s list. Vote NO to deprioritize."',
      '',
      '**HOW TO SUBMIT:** PR with /api/backlog-vote endpoint, voting UI component, weight calc function, admin open/close controls.',
      '',
      '**POINTS:** 500.',
    ].join('\n'),
    status: 'todo',
    points: 500,
    priority: 'critical',
    task_type: 'development',
    labels: ['dev', 'governance', 'feature'],
    assigned_to_admin: true,
  },
  {
    title: 'Open proposal: vote on next X Space date',
    description: [
      '**WHAT:** Create proposal listing 3–4 candidate dates/times for the next Organic X Space.',
      '',
      '**HOW TO SUBMIT:** Use /proposals/new wizard. Token-weighted vote.',
      '',
      '**POINTS:** 50 to proposer at proposal close.',
    ].join('\n'),
    status: 'todo',
    points: 50,
    priority: 'medium',
    task_type: 'custom',
    labels: ['governance'],
    assigned_to_admin: true,
  },
];

async function getOrg(): Promise<OrgRow> {
  const { data, error } = await supabase.from('orgs').select('id, name').limit(1).single();

  if (error || !data) {
    console.error('No org found:', error?.message);
    process.exit(1);
  }
  return data;
}

async function getAdminUser(): Promise<UserRow> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, organic_id')
    .eq('role', 'admin')
    .order('organic_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('No admin user found:', error?.message);
    process.exit(1);
  }
  return data;
}

async function getOrCreateSprint(orgId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('sprints')
    .select('id, status')
    .eq('name', SPRINT_NAME)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`  Sprint already exists: ${existing.id} (status=${existing.status})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('sprints')
    .insert({
      org_id: orgId,
      name: SPRINT_NAME,
      start_at: SPRINT_START,
      end_at: SPRINT_END,
      status: 'planning',
      goal: SPRINT_GOAL,
      capacity_points: SPRINT_CAPACITY,
    })
    .select('id')
    .single();

  if (error) {
    console.error('  Failed to create sprint:', error.message);
    return null;
  }
  console.log(`  Sprint created: ${data.id}`);
  return data.id;
}

async function seedTemplates(orgId: string, createdBy: string): Promise<void> {
  for (const template of TEMPLATES) {
    const { data: existing } = await supabase
      .from('task_templates')
      .select('id')
      .eq('org_id', orgId)
      .eq('name', template.name)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  Template exists: ${template.name}`);
      continue;
    }

    const { error } = await supabase.from('task_templates').insert({
      org_id: orgId,
      created_by: createdBy,
      name: template.name,
      description: template.description,
      task_type: template.task_type,
      priority: template.priority,
      base_points: template.base_points,
      labels: template.labels,
      is_team_task: template.is_team_task,
      max_assignees: template.max_assignees,
      is_recurring: true,
      recurrence_rule: 'sprint_start',
    });

    if (error) {
      console.error(`  Failed to insert template "${template.name}":`, error.message);
    } else {
      console.log(`  Template created: ${template.name}`);
    }
  }
}

async function callCloneFunction(sprintId: string): Promise<void> {
  const { data, error } = await supabase.rpc('clone_recurring_templates', {
    p_sprint_id: sprintId,
  });

  if (error) {
    console.error('  clone_recurring_templates RPC failed:', error.message);
    return;
  }
  console.log(`  Cloned ${data ?? 0} recurring template(s) into sprint`);
}

async function seedOneShotTasks(orgId: string, sprintId: string, adminId: string): Promise<void> {
  for (const task of ONE_SHOTS) {
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('sprint_id', sprintId)
      .eq('title', task.title)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  Task exists: ${task.title}`);
      continue;
    }

    const { error } = await supabase.from('tasks').insert({
      org_id: orgId,
      sprint_id: sprintId,
      title: task.title,
      description: task.description,
      status: task.status,
      points: task.points,
      base_points: task.points,
      priority: task.priority,
      task_type: task.task_type ?? 'custom',
      labels: task.labels ?? [],
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
  console.log('Resolving org and admin...');
  const org = await getOrg();
  const admin = await getAdminUser();
  console.log(`  Org:   ${org.id} (${org.name})`);
  console.log(`  Admin: ${admin.id} (${admin.email}, organic_id=${admin.organic_id ?? 'null'})`);

  console.log('\nCreating sprint...');
  const sprintId = await getOrCreateSprint(org.id);
  if (!sprintId) {
    process.exit(1);
  }

  console.log('\nSeeding recurring task templates...');
  await seedTemplates(org.id, admin.id);

  console.log('\nCloning recurring templates into sprint...');
  await callCloneFunction(sprintId);

  console.log('\nSeeding one-shot tasks...');
  await seedOneShotTasks(org.id, sprintId, admin.id);

  console.log('\n✅ Sprint seeded successfully');
  console.log(`   Sprint ID: ${sprintId}`);
  console.log('   Verify at /sprints in the app.');
  console.log('   Phase: planning. Move to active via existing UI/API when ready.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Fatal:', message);
  process.exit(1);
});
