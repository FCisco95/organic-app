/**
 * Seeds launch content: Genesis Sprint, tasks, ideas, proposals, and a welcome post.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-launch-content.ts
 *
 * Safe to re-run — checks for existing content before inserting.
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

async function getAdminUser() {
  // Find the test admin account (organic_id: 999) or the first admin
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name, email, role, organic_id')
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

async function getOrg() {
  const { data, error } = await supabase
    .from('orgs')
    .select('id, name')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('No org found:', error?.message);
    process.exit(1);
  }
  return data;
}

async function seedSprint(orgId: string) {
  // Check if Genesis Sprint already exists
  const { data: existing } = await supabase
    .from('sprints')
    .select('id')
    .ilike('name', '%genesis%')
    .limit(1)
    .single();

  if (existing) {
    console.log('  Sprint already exists:', existing.id);
    return existing.id;
  }

  const now = new Date();
  const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const { data, error } = await supabase
    .from('sprints')
    .insert({
      name: 'Genesis Sprint',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'planning',
      capacity_points: 30,
      goal: 'Ship launch essentials, onboard first contributors, seed governance pipeline.',
      org_id: orgId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('  Failed to create sprint:', error.message);
    return null;
  }
  console.log('  Created sprint:', data.id);
  return data.id;
}

async function seedTasks(sprintId: string, adminId: string, orgId: string) {
  const tasks = [
    {
      title: 'Write the Organic manifesto post',
      description: 'Draft a founding post explaining why Organic exists, the governance model, and how anyone can contribute. Will be published to the Posts feed and shared on X.',
      task_type: 'content',
      priority: 'medium',
      base_points: 5,
    },
    {
      title: 'Design $ORG token utility explainer graphic',
      description: 'Create a visual one-pager showing how $ORG token connects to governance: holding = access, points = earning, XP = leveling up. Should be shareable on X and usable in the app.',
      task_type: 'design',
      priority: 'high',
      base_points: 8,
    },
    {
      title: 'Set up Organic X account and post launch thread',
      description: 'Create a launch thread on X introducing Organic DAO. Include: what we are building, how to join, how posting on X earns points. Tag relevant accounts.',
      task_type: 'twitter',
      priority: 'high',
      base_points: 5,
    },
    {
      title: 'QA test wallet connect + onboarding on mobile',
      description: 'Complete the full onboarding wizard on a mobile device (iOS or Android). Test wallet connect with Phantom or Solflare mobile. Report any issues in task comments.',
      task_type: 'custom',
      priority: 'high',
      base_points: 3,
    },
    {
      title: 'Propose community guidelines for the Ideas incubator',
      description: 'Draft the first community guidelines for how ideas should be submitted, discussed, and promoted to proposals. Cover: formatting expectations, voting etiquette, spam policy. Submit as a proposal when ready.',
      task_type: 'content',
      priority: 'medium',
      base_points: 5,
    },
  ];

  let created = 0;
  for (const task of tasks) {
    // Check if task with same title exists
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('title', task.title)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  Task already exists: "${task.title}"`);
      continue;
    }

    const { error } = await supabase.from('tasks').insert({
      ...task,
      sprint_id: sprintId,
      status: 'todo',
      is_team_task: false,
      max_assignees: 1,
      created_by: adminId,
      org_id: orgId,
    });

    if (error) {
      console.error(`  Failed to create task "${task.title}":`, error.message);
    } else {
      created++;
      console.log(`  Created task: "${task.title}" (${task.base_points}pts)`);
    }
  }
  return created;
}

async function seedIdeas(adminId: string, orgId: string) {
  const ideas = [
    {
      title: 'Weekly contributor spotlight on X',
      body: 'Every week, highlight the top contributor on X with a dedicated post celebrating their work. This would boost visibility for active members, create social proof for new joiners, and give contributors a tangible reward beyond XP. We could automate the selection based on XP earned that week and let the community vote on the spotlight format.',
      tags: ['community', 'social', 'recognition'],
    },
    {
      title: 'NFT badges for level milestones',
      body: 'When members reach certain levels (e.g. Lv5, Lv7, Lv11), they should be able to mint an on-chain NFT badge proving their contribution history. These badges would serve as portable reputation across the Solana ecosystem. The Ancient Oak (max level) badge could be especially prestigious and grant access to exclusive features or governance powers.',
      tags: ['nft', 'gamification', 'solana'],
    },
    {
      title: 'Rebrand level names — community vote',
      body: 'The current level names follow a plant/nature theme (Seed, Sprout, Sapling, etc.). Some members feel we should rebrand to something more fun and human-centric since Organic refers to people being organic, not plants. This idea proposes a community vote on new level names. We could have members submit name suggestions and vote on their favorites, making it a collaborative rebranding exercise.',
      tags: ['branding', 'community', 'governance'],
    },
  ];

  let created = 0;
  for (const idea of ideas) {
    const { data: existing } = await supabase
      .from('ideas')
      .select('id')
      .eq('title', idea.title)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  Idea already exists: "${idea.title}"`);
      continue;
    }

    const { error } = await supabase.from('ideas').insert({
      ...idea,
      author_id: adminId,
      org_id: orgId,
      status: 'open',
    });

    if (error) {
      console.error(`  Failed to create idea "${idea.title}":`, error.message);
    } else {
      created++;
      console.log(`  Created idea: "${idea.title}"`);
    }
  }
  return created;
}

async function seedProposals(adminId: string, orgId: string) {
  const proposals = [
    {
      title: 'Genesis Treasury Allocation',
      category: 'treasury',
      status: 'discussion',
      summary: 'Ratify the initial treasury allocation split: 40% development, 25% community rewards, 20% operations, 15% reserve.',
      motivation: 'The DAO needs a transparent and community-approved treasury allocation before significant spending begins. Without an agreed-upon split, spending decisions lack legitimacy and could cause governance disputes. This proposal establishes the baseline allocation that all future treasury proposals will reference.',
      solution: 'Adopt a 40/25/20/15 allocation model: 40% for development bounties and contractor payments, 25% for community rewards and XP-to-token conversions, 20% for operational costs (hosting, tools, services), and 15% held in reserve for emergencies or strategic opportunities. Quarterly reviews to adjust percentages based on DAO needs.',
      budget: 'This proposal covers the allocation framework, not a specific amount. Actual disbursements will follow as separate proposals.',
      timeline: 'Immediate upon passing. First quarterly review scheduled 90 days after ratification.',
      body: 'This proposal establishes the foundational treasury allocation for Organic DAO. See summary, motivation, and solution fields for full details.',
    },
    {
      title: 'Sprint cadence: weekly vs. biweekly',
      category: 'governance',
      status: 'public',
      summary: 'Decide whether Organic sprints should run weekly (7 days) or biweekly (14 days) as the standard cadence.',
      motivation: 'We need to establish a consistent sprint rhythm before onboarding more contributors. A shorter cadence (weekly) means faster iteration and more frequent reward cycles, but may feel rushed for larger tasks. A longer cadence (biweekly) gives more time for complex work but delays feedback loops. The community should decide what works best for our workflow.',
      solution: 'Option A: Weekly sprints (7 days) with 1-day planning phase and 1-day review phase. Option B: Biweekly sprints (14 days) with 2-day planning phase and 2-day review phase. Both options maintain the existing phase lifecycle (planning, active, review, dispute window, settlement). Vote on your preferred option.',
      budget: 'No budget implications. This is a process decision.',
      timeline: 'Effective starting with the sprint after this proposal passes.',
      body: 'This proposal determines the standard sprint length for Organic DAO. See summary, motivation, and solution fields for full details.',
    },
  ];

  let created = 0;
  for (const proposal of proposals) {
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('title', proposal.title)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  Proposal already exists: "${proposal.title}"`);
      continue;
    }

    const { error } = await supabase.from('proposals').insert({
      ...proposal,
      created_by: adminId,
      org_id: orgId,
    });

    if (error) {
      console.error(`  Failed to create proposal "${proposal.title}":`, error.message);
    } else {
      created++;
      console.log(`  Created proposal: "${proposal.title}" (${proposal.status})`);
    }
  }
  return created;
}

async function seedPost(adminId: string) {
  const title = 'Welcome to Organic';

  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('title', title)
    .limit(1)
    .single();

  if (existing) {
    console.log(`  Post already exists: "${title}"`);
    return 0;
  }

  const { error } = await supabase.from('posts').insert({
    author_id: adminId,
    title,
    body: `Welcome to Organic DAO.\n\nThis is a community-governed platform where ideas become proposals, proposals become tasks, and tasks get done in sprints.\n\nHere is how to get started:\n\n1. **Explore** — Browse proposals, tasks, and ideas to see what we are building\n2. **Participate** — Vote on ideas, claim tasks, join sprint planning\n3. **Earn** — Every action earns XP. Level up to unlock new abilities\n4. **Boost** — Post about Organic on X to earn points and grow the community\n\nYour contributions matter. Every vote, task, and idea shapes where Organic goes next.\n\nLet's build something together.`,
    post_type: 'announcement',
    status: 'published',
    tags: ['welcome', 'announcement', 'getting-started'],
    is_organic: false,
    is_pinned: true,
  });

  if (error) {
    console.error(`  Failed to create post:`, error.message);
    return 0;
  }
  console.log(`  Created post: "${title}" (pinned announcement)`);
  return 1;
}

async function main() {
  console.log('=== Organic Launch Content Seeder ===\n');

  console.log('1. Finding admin user...');
  const admin = await getAdminUser();
  console.log(`   Admin: ${admin.name} (${admin.email}, organic_id: ${admin.organic_id})\n`);

  console.log('2. Finding org...');
  const org = await getOrg();
  console.log(`   Org: ${org.name} (${org.id})\n`);

  console.log('3. Creating Genesis Sprint...');
  const sprintId = await seedSprint(org.id);
  if (!sprintId) {
    console.error('Cannot continue without sprint.');
    process.exit(1);
  }
  console.log('');

  console.log('4. Creating tasks...');
  const tasksCreated = await seedTasks(sprintId, admin.id, org.id);
  console.log(`   Total: ${tasksCreated} tasks created\n`);

  console.log('5. Creating ideas...');
  const ideasCreated = await seedIdeas(admin.id, org.id);
  console.log(`   Total: ${ideasCreated} ideas created\n`);

  console.log('6. Creating proposals...');
  const proposalsCreated = await seedProposals(admin.id, org.id);
  console.log(`   Total: ${proposalsCreated} proposals created\n`);

  console.log('7. Creating welcome post...');
  const postsCreated = await seedPost(admin.id);
  console.log(`   Total: ${postsCreated} posts created\n`);

  console.log('=== Done! ===');
  console.log(`Sprint: Genesis Sprint (${sprintId})`);
  console.log(`Tasks: ${tasksCreated}, Ideas: ${ideasCreated}, Proposals: ${proposalsCreated}, Posts: ${postsCreated}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
