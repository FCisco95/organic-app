/**
 * Seeds the Sprint — Organic Identity (2026-05-14 → 2026-05-28).
 *
 * Plan: ~/.claude/plans/i-want-you-to-toasty-kahan.md
 *
 * Theme: community designs personas representing Organic values. Winners
 * (1 hero + 4 supporting cast) go in the logo system. Vote is 1p1v.
 * Persona scope is visual-only; optional X tweet earns bonus quality tier.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-sprint-2026-05-14.ts
 *
 * Safe to re-run — checks for existing sprint/tasks before inserting.
 *
 * Recurring task templates were seeded by the April sprint script; this
 * sprint only calls clone_recurring_templates() to pull them forward and
 * re-parents in-progress carry-overs from the prior sprint.
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

const SPRINT_NAME = 'Sprint — Organic Identity';
const SPRINT_START = '2026-05-14T00:00:00Z';
const SPRINT_END = '2026-05-28T23:59:59Z';
const SPRINT_GOAL =
  'Community designs personas representing Organic values. 1 hero + 4 supporting cast win the logo system via 1p1v vote. Every relevant task ships with an X engagement angle to drive distribution.';
const SPRINT_CAPACITY = 3000;

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskType = 'development' | 'content' | 'design' | 'custom' | 'twitter';
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

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

interface OneShotSeed {
  title: string;
  description: string;
  status: TaskStatus;
  points: number;
  priority: TaskPriority;
  task_type: TaskType;
  labels: string[];
  is_team_task?: boolean;
  max_assignees?: number;
  assigned_to_admin?: boolean;
}

const ONE_SHOTS: OneShotSeed[] = [
  {
    title: 'Submit a persona — character art for Organic',
    description: [
      '**WHAT:** Design one character (a "persona") that represents an Organic value. Upload the art — that is the submission.',
      '',
      '**WHY:** This sprint picks the new faces of Organic. The community draws them, the community votes, and the winners (1 hero + 4 supporting cast) go in the logo system.',
      '',
      '**HOW TO SUBMIT:** Upload the file (PNG/JPG, ≤5MB) via the design submission form. **Optional X bonus:** also tweet it tagging `@organic_bonk` with the hashtag `#OrganicIdentity` and paste the tweet URL in the submission notes — this lifts the quality score by one tier.',
      '',
      '**CRITERIA:**',
      '- ✅ Original character. Can be human, creature, plant, robot, abstract — anything.',
      '- ✅ Embodies at least one Organic value (open, fair, alive, real, slow-growing, member-first, etc).',
      '- ✅ Readable at thumbnail size (logo-ready).',
      '- ✅ Works on light AND dark background.',
      '- ❌ No AI slop. No copyrighted IP. No price/financial claims.',
      '',
      'Quality score 1–5. Multiple submissions per member allowed.',
      '',
      '**POINTS:** 0–150 based on quality score (base 100, capped at 150 with X bonus).',
    ].join('\n'),
    status: 'backlog',
    points: 100,
    priority: 'high',
    task_type: 'design',
    labels: ['branding', 'persona', 'identity'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    title: 'Brand vibe — mood-board thread',
    description: [
      '**WHAT:** Curate 6–10 visual references (palette, type, motion, photography, illustration) that capture the Organic vibe and post them as an X thread.',
      '',
      '**WHY:** The personas will not live alone. They need a visual world around them. Mood-board threads define that world early.',
      '',
      '**HOW TO SUBMIT:** Paste the URL of the first tweet of your thread.',
      '',
      '**CRITERIA:**',
      '- ✅ 6–10 distinct references, each with one-line caption explaining the pull.',
      '- ✅ Coherent direction (not a random scrapbook).',
      '- ✅ Credit sources where known.',
      '- ❌ No screenshots of competitor brands without commentary.',
      '',
      'Quality score 1–5.',
      '',
      '**POINTS:** 0–90 based on quality score (base 60).',
    ].join('\n'),
    status: 'backlog',
    points: 60,
    priority: 'medium',
    task_type: 'content',
    labels: ['branding', 'content', 'twitter'],
    is_team_task: true,
    max_assignees: 30,
  },
  {
    title: 'Hype the persona finalists on X (Week 2)',
    description: [
      '**WHAT:** Once finalists are announced (Day 7–8), like AND retweet at least 3 of the finalist persona tweets on `@organic_bonk`.',
      '',
      '**WHY:** Voting turnout follows attention. This task amplifies the finalist reveal across X.',
      '',
      '**HOW TO SUBMIT:** Paste the URLs of the 3+ finalist tweets you engaged with, plus a screenshot showing your likes/retweets visible.',
      '',
      '**CRITERIA:** Real engagement on ≥3 distinct finalist tweets. No mass-engagement bots. No undo-after-points.',
      '',
      '**NOTE FOR COUNCIL:** This task is reviewed manually because the multi-target finalist tweets are not known at seed time. After finalists are picked, you may also spin up auto-verified `task_type=twitter` rows pointing at each finalist tweet if you want per-tweet engagement tracking — but this single content task is enough for sprint v1.',
      '',
      '**POINTS:** 30 flat on approval.',
    ].join('\n'),
    status: 'backlog',
    points: 30,
    priority: 'medium',
    task_type: 'content',
    labels: ['branding', 'twitter', 'engagement', 'week-2'],
    is_team_task: true,
    max_assignees: 100,
  },
  {
    title: 'Name a finalist (Week 2)',
    description: [
      '**WHAT:** Once the 5 finalists are revealed, propose a name + a one-line tagline for ONE of them. Post it as an X thread.',
      '',
      '**WHY:** Faces need names. Names with taglines stick on social.',
      '',
      '**HOW TO SUBMIT:** Tweet thread URL. First tweet shows which finalist you are naming + the proposed name. Second tweet: the tagline. Optional third: why this name.',
      '',
      '**CRITERIA:**',
      '- ✅ Picks ONE specific finalist (by number or visual).',
      '- ✅ Name is pronounceable, memorable, and not a brand/IP.',
      '- ✅ Tagline ≤ 12 words, captures the value the persona embodies.',
      '- ❌ No price/financial framing.',
      '',
      'Quality score 1–5. Multiple submissions allowed (different finalists or different angles).',
      '',
      '**POINTS:** 0–75 based on quality score (base 50). The winning names ship with the personas.',
    ].join('\n'),
    status: 'backlog',
    points: 50,
    priority: 'medium',
    task_type: 'content',
    labels: ['branding', 'content', 'twitter', 'week-2'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    title: 'Vote on persona finalists (Week 2)',
    description: [
      '**WHAT:** Cast your vote in the persona-finalists proposal. 1 person 1 vote (via `organic_id`).',
      '',
      '**WHY:** This is THE sprint decision. Every member with an `organic_id` should weigh in.',
      '',
      '**HOW TO SUBMIT:** Vote in the proposal. Paste the proposal URL in submission notes.',
      '',
      '**CRITERIA:** A vote was actually cast (council cross-checks against proposal voter list).',
      '',
      '**POINTS:** 20 flat on approval.',
    ].join('\n'),
    status: 'backlog',
    points: 20,
    priority: 'medium',
    task_type: 'custom',
    labels: ['branding', 'governance', 'week-2'],
    is_team_task: true,
    max_assignees: 100,
  },
  {
    title: 'Submit a translation (post / proposal / comment)',
    description: [
      '**WHAT:** Improve an existing community translation OR submit a fresh translation for a post / proposal / comment / idea / task via the existing DeepL toggle UI.',
      '',
      '**WHY:** Organic is multilingual. Human edits beat raw DeepL on tone and nuance.',
      '',
      '**HOW TO SUBMIT:** Submit the translation in-app, then paste the URL of the translated item.',
      '',
      '**CRITERIA:**',
      '- ✅ Real edit — not a one-character tweak to claim points.',
      '- ✅ Preserves meaning and tone.',
      '- ✅ Language pair the community actually needs (PT, ES, ZH, FR — admin confirms).',
      '',
      '**POINTS:** 20 flat per approved submission. Up to 5/sprint per member.',
    ].join('\n'),
    status: 'backlog',
    points: 20,
    priority: 'low',
    task_type: 'custom',
    labels: ['community', 'i18n', 'translation'],
    is_team_task: true,
    max_assignees: 50,
  },
  {
    title: 'Automate sprint-task voting (backlog → sprint via proposals)',
    description: [
      '**WHAT:** Make sprint-task voting automatic. Today, picking which backlog items become the next sprint is a manual `Backlog priority voting` task per sprint. Replace that with: at sprint-end (or on `planning`-status sprint create), the top-N voted backlog items via the existing proposals/voting system auto-promote into the new sprint.',
      '',
      '**WHY:** Reduces admin overhead, surfaces community priorities consistently, removes a recurring manual step.',
      '',
      '**ACCEPTANCE:**',
      '- A new sprint created in `planning` state has its initial backlog/todo task list pre-populated with the top-N voted backlog items from the prior sprint window.',
      '- N is configurable (default 5–10).',
      '- 1p1v via `organic_id`, consistent with the persona finalists vote.',
      '- Council can override, re-pin, or drop any auto-promoted task before sprint goes active.',
      '- Idempotent — re-running the promotion does not duplicate rows.',
      '',
      '**SCOPE:**',
      '- Server logic (RPC or API route) that promotes top-N backlog items into the next sprint.',
      '- Trigger hook: either on sprint create with `status=planning`, or a manual admin button.',
      '- Minimal UI surface for council to review and override before activation.',
      '',
      '**HOW TO SUBMIT:** PR link + a short design note in the PR description explaining the promotion algorithm and the trigger choice. Walk-through video or screenshots of the council override UI.',
      '',
      '**POINTS:** 300.',
    ].join('\n'),
    status: 'todo',
    points: 300,
    priority: 'high',
    task_type: 'development',
    labels: ['dev', 'governance', 'feature'],
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

async function findPriorSprintId(newSprintId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('id, name, status, end_at')
    .neq('id', newSprintId)
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.log(`  No prior sprint found${error ? `: ${error.message}` : ''}`);
    return null;
  }
  console.log(`  Prior sprint: ${data.id} (${data.name}, status=${data.status})`);
  return data.id;
}

async function carryOverInProgressTasks(
  newSprintId: string,
  priorSprintId: string,
): Promise<void> {
  const { data: candidates, error: selectError } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('sprint_id', priorSprintId)
    .eq('status', 'in_progress');

  if (selectError) {
    console.error('  Failed to read carry-over candidates:', selectError.message);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log('  No in_progress tasks to carry over.');
    return;
  }

  console.log(`  Found ${candidates.length} in_progress task(s) to re-parent:`);
  for (const task of candidates) {
    console.log(`    - ${task.title}`);
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ sprint_id: newSprintId })
    .eq('sprint_id', priorSprintId)
    .eq('status', 'in_progress');

  if (updateError) {
    console.error('  Failed to re-parent tasks:', updateError.message);
    return;
  }
  console.log(`  Re-parented ${candidates.length} task(s) to new sprint.`);
}

async function callCloneFunction(sprintId: string): Promise<void> {
  const { data, error } = await supabase.rpc('clone_recurring_templates', {
    p_sprint_id: sprintId,
  });

  if (error) {
    console.error('  clone_recurring_templates RPC failed:', error.message);
    return;
  }
  console.log(`  Cloned ${data ?? 0} recurring template(s) into sprint.`);
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
      task_type: task.task_type,
      labels: task.labels,
      is_team_task: task.is_team_task ?? false,
      max_assignees: task.max_assignees ?? 1,
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

  console.log('\nResolving prior sprint for carry-overs...');
  const priorSprintId = await findPriorSprintId(sprintId);
  if (priorSprintId) {
    console.log('\nCarrying over in-progress tasks...');
    await carryOverInProgressTasks(sprintId, priorSprintId);
  }

  console.log('\nCloning recurring templates into sprint...');
  await callCloneFunction(sprintId);

  console.log('\nSeeding one-shot tasks (branding + common + dev)...');
  await seedOneShotTasks(org.id, sprintId, admin.id);

  console.log('\n✅ Sprint seeded successfully');
  console.log(`   Sprint ID: ${sprintId}`);
  console.log('   Verify at /sprints in the app. Sprint stays in planning until manually started.');
  console.log('   Reminder: after Week 1 submissions close, open the persona-finalists proposal.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Fatal:', message);
  process.exit(1);
});
