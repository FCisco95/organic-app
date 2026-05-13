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
      title: 'Create community guidelines draft',
      description: 'Write the first set of community guidelines covering: how ideas should be submitted, discussion etiquette, voting expectations, spam policy, and what behavior we expect from members. This will become a governance proposal once reviewed.',
      task_type: 'content',
      priority: 'medium',
      base_points: 5,
    },
    {
      title: 'Build a getting-started video walkthrough',
      description: 'Record a 3-5 minute screencast walking a new user through: signing up, connecting a wallet, browsing proposals, claiming a task, and earning XP. Post it to the feed and share on X/YouTube.',
      task_type: 'content',
      priority: 'high',
      base_points: 10,
    },
    {
      title: 'Set up the Organic Discord server',
      description: 'Create and configure a Discord server with channels for: general, governance, ideas, sprints, dev, introductions, and announcements. Set up roles matching our app roles (admin, council, member, guest). Share invite link in the feed.',
      task_type: 'custom',
      priority: 'medium',
      base_points: 5,
    },
    {
      title: 'Write a thread about how DAO governance works',
      description: 'Write a 5-7 tweet thread explaining how governance works in Organic: ideas → proposals → voting → execution. Use real examples from the app. Tag @organic and relevant crypto/DAO accounts.',
      task_type: 'twitter',
      priority: 'high',
      base_points: 5,
    },
    {
      title: 'Design social media templates for announcements',
      description: 'Create a set of 4-6 reusable social media templates (1200x675 for X, 1080x1080 for Instagram) in the Organic terracotta brand style. Include templates for: new proposal, sprint launch, member spotlight, and milestone celebration.',
      task_type: 'design',
      priority: 'medium',
      base_points: 8,
    },
    {
      title: 'Translate the welcome post to Portuguese',
      description: 'Translate the pinned "Welcome to Organic" post into Portuguese (pt-PT). Maintain the same tone — excited but professional. Submit the translated text for review.',
      task_type: 'content',
      priority: 'low',
      base_points: 3,
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
      title: 'Add dark mode toggle',
      body: 'The current terracotta earth-toned design looks great but some people prefer working at night or in low-light environments. A dark mode would reduce eye strain and make the app more accessible. The terracotta accents could shift to warm amber on dark backgrounds. Could be a simple toggle in the profile settings or respect the system preference automatically.',
      tags: ['feature', 'accessibility', 'design'],
    },
    {
      title: 'Mobile app — React Native or PWA?',
      body: 'Right now Organic works on mobile browsers but having a dedicated mobile experience would make it way easier to check proposals, vote on the go, and get push notifications for sprint updates. The question is whether we should build a React Native app (better experience, more work) or go the PWA route (faster to ship, works everywhere). Personally I lean PWA since we already have a responsive web app, but open to arguments either way.',
      tags: ['feature', 'mobile', 'development'],
    },
    {
      title: 'Telegram notifications for governance activity',
      body: 'Not everyone checks the app daily. A Telegram bot that pings you when: a new proposal enters voting, a sprint starts, someone claims your task, or you level up — that would keep engagement high without requiring people to be glued to the web app. Could start simple with just proposal notifications and expand from there.',
      tags: ['integration', 'notifications', 'engagement'],
    },
    {
      title: 'How should we handle inactive members?',
      body: 'As we grow, some members will inevitably go inactive. Should their voting power decrease over time? Should they lose council seats after X weeks of inactivity? We need a fair policy that rewards active participation without being punitive toward people who take breaks. Maybe a "hibernation" status that preserves their level but pauses their governance weight until they return.',
      tags: ['governance', 'policy', 'community'],
    },
    {
      title: 'Should council seats rotate?',
      body: 'Currently council members are appointed by admins. But as the DAO matures, maybe council seats should be elected and rotate every quarter. This would prevent power concentration and give more members a chance to shape governance. Counter-argument: frequent rotation loses institutional knowledge. Maybe a hybrid — some permanent seats, some rotating? Let the community decide.',
      tags: ['governance', 'council', 'elections'],
    },
    {
      title: 'Bounty board for external developers',
      body: 'We should have a public-facing bounty board where external developers (not just DAO members) can pick up development tasks for $ORG tokens. This would accelerate development, bring in fresh talent, and grow the token holder base organically. Could integrate with GitHub issues and auto-verify PRs. Similar to what Gitcoin does but native to our platform.',
      tags: ['development', 'bounties', 'growth'],
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
      body: 'This proposal establishes the foundational treasury allocation for Organic Hub. See summary, motivation, and solution fields for full details.',
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
      body: 'This proposal determines the standard sprint length for Organic Hub. See summary, motivation, and solution fields for full details.',
    },
    {
      title: 'Contributor Reward Structure',
      category: 'governance',
      status: 'discussion',
      summary: 'Define the points-per-task-type rates, XP multipliers, and bonus rules for contributor rewards.',
      motivation: 'Contributors need to know exactly what their work is worth before they commit time. Right now the point values are set ad-hoc per task. We need a transparent, predictable reward structure that values different contribution types fairly — development work takes more effort than a retweet, and the rewards should reflect that. This also helps with budgeting sprint reward pools.',
      solution: 'Base points by task type: Development (8-15pts), Design (6-10pts), Content (3-8pts), Community (3-5pts), Twitter engagement (1-3pts). XP multiplier: 10 XP per point earned. Bonus rules: first-time contributor bonus (+50% on first completed task), streak bonus (+10% per consecutive sprint with a completed task, max +50%), quality bonus (reviewer can award up to +25% for exceptional work). Sprint MVP gets a 2x multiplier on their highest-value task.',
      budget: 'No direct budget — this defines the framework for how sprint reward pools are distributed.',
      timeline: 'Effective starting with the next sprint after ratification.',
      body: 'This proposal defines the contributor reward structure for Organic Hub, including base points per task type, XP multipliers, and bonus rules.',
    },
    {
      title: 'Community Guidelines & Code of Conduct',
      category: 'community',
      status: 'public',
      summary: 'Establish the behavioral expectations, moderation policy, and dispute resolution process for all Organic members.',
      motivation: 'As we onboard new members, we need clear expectations for how people interact in governance discussions, idea debates, and task collaboration. Without written guidelines, moderation becomes subjective and disputes escalate unnecessarily. This proposal sets the foundation for a healthy community culture from day one.',
      solution: 'Core principles: (1) Assume good intent — disagree with ideas, not people. (2) Back claims with reasoning — "I don\'t like it" is not governance. (3) Respect the process — use ideas for brainstorming, proposals for decisions, comments for discussion. (4) No spam, shilling, or self-promotion outside designated channels. Moderation: first offense = warning, second = 24h mute, third = council review for potential removal. Appeals go through a proposal. All moderation actions are logged publicly.',
      budget: 'No budget required.',
      timeline: 'Effective immediately upon passing.',
      body: 'This proposal establishes community guidelines and a code of conduct for Organic Hub members.',
    },
    {
      title: 'First Community Call: format and schedule',
      category: 'community',
      status: 'public',
      summary: 'Decide when, where, and how to run our first community call — and whether to make it recurring.',
      motivation: 'Text-based governance is great for deliberation but bad for building relationships. A regular community call would help members put voices to usernames, discuss proposals in real-time, and create a sense of belonging. The question is: what platform, what cadence, and what format works for a global community across multiple timezones?',
      solution: 'Proposed format: 45-minute call on X Spaces (public, attracts new members) or Discord (private, better for focused discussion). Suggested cadence: biweekly on Thursdays, alternating between 10:00 UTC (EU/Asia friendly) and 18:00 UTC (Americas/EU friendly). Agenda template: (1) Sprint recap — 10 min, (2) Active proposals discussion — 15 min, (3) Open floor / Q&A — 15 min, (4) Preview next sprint — 5 min. Recorded and posted to the feed for async members.',
      budget: 'No direct costs. Recording/editing volunteer needed (could be a sprint task).',
      timeline: 'First call within 2 weeks of this proposal passing.',
      body: 'This proposal decides the format, platform, cadence, and agenda for Organic Hub community calls.',
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
    body: `Welcome to Organic — a community-governed platform where ideas become proposals, proposals become tasks, and contributors earn real rewards for real work.\n\nOrganic is not another DAO tool. It is a DAO itself. Every decision — from sprint length to treasury allocation — is proposed, debated, and voted on by the community. Your voice has weight here, and your contributions are tracked, rewarded, and permanent.\n\nHere is how to get started:\n\n1. **Browse the Ideas board** — See what the community is thinking, upvote what resonates, or submit your own idea\n2. **Check the Proposals** — Active governance proposals are open for discussion and voting right now\n3. **Claim a task** — The Genesis Sprint has real tasks you can pick up today: writing, design, community building, and more\n\nThe Genesis Sprint is live and we are running a **2x XP event** for launch week — every action earns double experience points. This is the best time to jump in, level up fast, and establish yourself as a founding contributor.\n\nYour contributions matter. Every vote, task, and idea shapes where Organic goes next. Let's build something together.`,
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
