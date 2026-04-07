/**
 * Community Pulse — extracts all user-generated text from the past N days
 * and merges it into a single dump for LLM analysis.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/community-pulse/pulse.ts          # default: last 7 days
 *   npx tsx scripts/community-pulse/pulse.ts 14       # last 14 days
 *
 * Output: scripts/community-pulse/output.md
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DAYS = parseInt(process.argv[2] ?? '7', 10);
const SINCE = new Date(Date.now() - DAYS * 86_400_000).toISOString();

// ─── Paginated fetcher ──────────────────────────────────────────────

async function fetchAll(table: string, select: string, filters: (q: any) => any) {
  const PAGE = 1000;
  let all: any[] = [];
  let offset = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1);
    q = filters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ─── Queries ────────────────────────────────────────────────────────

async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, post_type, tags, likes_count, comments_count, is_promoted, promotion_tier, promotion_points, is_organic, points_cost, created_at, author:user_profiles!author_id(name, organic_id)')
    .gte('created_at', SINCE)
    .in('status', ['published', 'archived'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`posts: ${error.message}`);
  return data ?? [];
}

async function fetchThreadParts() {
  const { data, error } = await supabase
    .from('post_thread_parts')
    .select('post_id, part_order, body, created_at')
    .gte('created_at', SINCE)
    .order('post_id')
    .order('part_order', { ascending: true });

  if (error) throw new Error(`thread_parts: ${error.message}`);
  return data ?? [];
}

async function fetchComments() {
  return fetchAll(
    'comments',
    'id, subject_type, subject_id, body, created_at, user:user_profiles!user_id(name, organic_id)',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

async function fetchTaskComments() {
  return fetchAll(
    'task_comments',
    'id, task_id, content, created_at, user_id',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

async function fetchIdeas() {
  const { data, error } = await supabase
    .from('ideas')
    .select('id, title, body, tags, status, score, upvotes, downvotes, comments_count, created_at, author:user_profiles!author_id(name, organic_id)')
    .gte('created_at', SINCE)
    .in('status', ['open', 'locked', 'promoted'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`ideas: ${error.message}`);
  return data ?? [];
}

async function fetchProposals() {
  const { data, error } = await supabase
    .from('proposals')
    .select('id, title, summary, motivation, solution, category, status, result, created_at, created_by')
    .gte('created_at', SINCE)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`proposals: ${error.message}`);
  return data ?? [];
}

async function fetchTasks() {
  return fetchAll(
    'tasks',
    'id, title, description, status, task_type, priority, labels, points, base_points, claimed_at, completed_at, due_date, created_at, created_by, assignee:user_profiles!assignee_id(name, organic_id)',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

async function fetchDisputes() {
  const { data, error } = await supabase
    .from('disputes')
    .select('id, task_id, status, tier, reason, resolution, evidence_text, response_text, resolution_notes, xp_stake, created_at, resolved_at, disputant:user_profiles!disputant_id(name, organic_id), reviewer:user_profiles!reviewer_id(name, organic_id)')
    .gte('created_at', SINCE)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`disputes: ${error.message}`);
  return data ?? [];
}

async function fetchDisputeComments() {
  return fetchAll(
    'dispute_comments',
    'id, dispute_id, content, visibility, created_at, user:user_profiles!user_id(name, organic_id)',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

async function fetchProposalVotes() {
  return fetchAll(
    'votes',
    'id, proposal_id, value, weight, created_at, voter:user_profiles!voter_id(name, organic_id)',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

async function fetchIdeaVotes() {
  return fetchAll(
    'idea_votes',
    'id, idea_id, value, created_at, user:user_profiles!user_id(name, organic_id)',
    (q: any) => q.gte('created_at', SINCE).order('created_at', { ascending: false }),
  );
}

// ─── Formatting ─────────────────────────────────────────────────────

function userName(author: any): string {
  if (!author) return 'Unknown';
  const name = author.name ?? 'Anonymous';
  const oid = author.organic_id ? ` (#${author.organic_id})` : '';
  return `${name}${oid}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildMarkdown(data: {
  posts: any[];
  threadParts: any[];
  comments: any[];
  taskComments: any[];
  ideas: any[];
  proposals: any[];
  tasks: any[];
  disputes: any[];
  disputeComments: any[];
  proposalVotes: any[];
  ideaVotes: any[];
}): string {
  const lines: string[] = [];
  const hr = '\n---\n';

  lines.push(`# Community Pulse — Last ${DAYS} days`);
  lines.push(`Generated: ${new Date().toISOString()}\n`);
  lines.push(`Period: since ${new Date(SINCE).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n`);

  // Thread parts lookup
  const threadMap = new Map<string, any[]>();
  for (const tp of data.threadParts) {
    const arr = threadMap.get(tp.post_id) ?? [];
    arr.push(tp);
    threadMap.set(tp.post_id, arr);
  }

  // ── Posts (Feed + Boost) ──
  lines.push(hr);
  const boosted = data.posts.filter((p: any) => p.is_promoted);
  const organic = data.posts.filter((p: any) => p.is_organic);
  lines.push(`## Posts (${data.posts.length}) — ${boosted.length} boosted, ${organic.length} organic\n`);
  for (const p of data.posts) {
    const badges: string[] = [];
    if (p.is_promoted) badges.push(`BOOSTED:${p.promotion_tier} (${p.promotion_points}pts)`);
    if (p.is_organic) badges.push('ORGANIC');
    lines.push(`### ${p.title}`);
    lines.push(`> By ${userName(p.author)} on ${fmtDate(p.created_at)} | type: ${p.post_type} | likes: ${p.likes_count} | comments: ${p.comments_count}${p.tags?.length ? ` | tags: ${p.tags.join(', ')}` : ''}${badges.length ? ` | ${badges.join(' | ')}` : ''}\n`);
    lines.push(p.body);
    const parts = threadMap.get(p.id);
    if (parts?.length) {
      lines.push('\n**Thread parts:**');
      for (const tp of parts) {
        lines.push(`- Part ${tp.part_order}: ${tp.body}`);
      }
    }
    lines.push('');
  }

  // ── Ideas ──
  lines.push(hr);
  lines.push(`## Ideas (${data.ideas.length})\n`);
  for (const idea of data.ideas) {
    lines.push(`### ${idea.title}`);
    lines.push(`> By ${userName(idea.author)} on ${fmtDate(idea.created_at)} | status: ${idea.status} | score: ${idea.score} (↑${idea.upvotes} ↓${idea.downvotes}) | comments: ${idea.comments_count}${idea.tags?.length ? ` | tags: ${idea.tags.join(', ')}` : ''}\n`);
    lines.push(idea.body);
    lines.push('');
  }

  // ── Proposals ──
  lines.push(hr);
  lines.push(`## Proposals (${data.proposals.length})\n`);
  for (const prop of data.proposals) {
    lines.push(`### ${prop.title}`);
    lines.push(`> On ${fmtDate(prop.created_at)} | category: ${prop.category} | status: ${prop.status}${prop.result ? ` | result: ${prop.result}` : ''}\n`);
    if (prop.summary) lines.push(`**Summary:** ${prop.summary}\n`);
    if (prop.motivation) lines.push(`**Motivation:** ${prop.motivation}\n`);
    if (prop.solution) lines.push(`**Solution:** ${prop.solution}\n`);
    lines.push('');
  }

  // ── Tasks ──
  lines.push(hr);
  const tasksByStatus = new Map<string, number>();
  for (const t of data.tasks) {
    tasksByStatus.set(t.status, (tasksByStatus.get(t.status) ?? 0) + 1);
  }
  const statusSummary = [...tasksByStatus.entries()].map(([s, c]) => `${s}: ${c}`).join(', ');
  lines.push(`## Tasks (${data.tasks.length}) — ${statusSummary}\n`);
  for (const t of data.tasks) {
    const assignee = t.assignee ? ` → ${userName(t.assignee)}` : '';
    lines.push(`### ${t.title}`);
    lines.push(`> Created ${fmtDate(t.created_at)} | status: ${t.status} | type: ${t.task_type} | priority: ${t.priority} | points: ${t.points ?? t.base_points ?? '—'}${assignee}${t.completed_at ? ` | completed: ${fmtDate(t.completed_at)}` : ''}${t.labels?.length ? ` | labels: ${t.labels.join(', ')}` : ''}\n`);
    if (t.description) lines.push(t.description);
    lines.push('');
  }

  // ── Disputes (Resolve page) ──
  lines.push(hr);
  lines.push(`## Disputes (${data.disputes.length})\n`);
  if (data.disputes.length === 0) {
    lines.push('No disputes this period.\n');
  }
  for (const d of data.disputes) {
    lines.push(`### Dispute: ${d.reason} (${d.status})`);
    lines.push(`> Filed by ${userName(d.disputant)} against ${userName(d.reviewer)} on ${fmtDate(d.created_at)} | tier: ${d.tier} | XP at stake: ${d.xp_stake}${d.resolution ? ` | resolution: ${d.resolution}` : ''}\n`);
    lines.push(`**Evidence:** ${d.evidence_text}`);
    if (d.response_text) lines.push(`\n**Response:** ${d.response_text}`);
    if (d.resolution_notes) lines.push(`\n**Resolution notes:** ${d.resolution_notes}`);
    lines.push('');
  }

  // ── Dispute comments ──
  if (data.disputeComments.length > 0) {
    lines.push(hr);
    lines.push(`## Dispute Comments (${data.disputeComments.length})\n`);
    for (const dc of data.disputeComments) {
      lines.push(`- **${userName(dc.user)}** (${fmtDate(dc.created_at)}) [${dc.visibility}]: ${dc.content}`);
    }
    lines.push('');
  }

  // ── Proposal Votes ──
  lines.push(hr);
  const votesByProposal = new Map<string, { yes: number; no: number; abstain: number }>();
  for (const v of data.proposalVotes) {
    const entry = votesByProposal.get(v.proposal_id) ?? { yes: 0, no: 0, abstain: 0 };
    if (v.value === 'yes') entry.yes += v.weight;
    else if (v.value === 'no') entry.no += v.weight;
    else entry.abstain += v.weight;
    votesByProposal.set(v.proposal_id, entry);
  }
  // Map proposal IDs to titles
  const proposalTitles = new Map<string, string>();
  for (const p of data.proposals) proposalTitles.set(p.id, p.title);

  lines.push(`## Proposal Votes (${data.proposalVotes.length} votes across ${votesByProposal.size} proposals)\n`);
  lines.push(`| Proposal | Yes | No | Abstain |`);
  lines.push(`|---|---|---|---|`);
  for (const [pid, counts] of votesByProposal) {
    const title = proposalTitles.get(pid) ?? pid.slice(0, 8);
    lines.push(`| ${title} | ${counts.yes} | ${counts.no} | ${counts.abstain} |`);
  }
  lines.push('');

  // ── Idea Votes ──
  lines.push(hr);
  const ideaVoteSummary = new Map<string, { up: number; down: number }>();
  for (const v of data.ideaVotes) {
    const entry = ideaVoteSummary.get(v.idea_id) ?? { up: 0, down: 0 };
    if (v.value > 0) entry.up++;
    else entry.down++;
    ideaVoteSummary.set(v.idea_id, entry);
  }
  const ideaTitles = new Map<string, string>();
  for (const i of data.ideas) ideaTitles.set(i.id, i.title);

  lines.push(`## Idea Votes (${data.ideaVotes.length} votes across ${ideaVoteSummary.size} ideas)\n`);
  lines.push(`| Idea | ↑ | ↓ |`);
  lines.push(`|---|---|---|`);
  for (const [iid, counts] of ideaVoteSummary) {
    const title = ideaTitles.get(iid) ?? iid.slice(0, 8);
    lines.push(`| ${title} | ${counts.up} | ${counts.down} |`);
  }
  lines.push('');

  // ── Comments (polymorphic) ──
  lines.push(hr);
  lines.push(`## Comments (${data.comments.length})\n`);
  const byType = new Map<string, any[]>();
  for (const c of data.comments) {
    const arr = byType.get(c.subject_type) ?? [];
    arr.push(c);
    byType.set(c.subject_type, arr);
  }
  for (const [type, items] of byType) {
    lines.push(`### On ${type}s (${items.length})\n`);
    for (const c of items) {
      lines.push(`- **${userName(c.user)}** (${fmtDate(c.created_at)}): ${c.body}`);
    }
    lines.push('');
  }

  // ── Task comments (legacy) ──
  if (data.taskComments.length > 0) {
    lines.push(hr);
    lines.push(`## Task Comments — legacy table (${data.taskComments.length})\n`);
    for (const tc of data.taskComments) {
      lines.push(`- Task ${tc.task_id} (${fmtDate(tc.created_at)}): ${tc.content}`);
    }
    lines.push('');
  }

  // ── Stats summary ──
  lines.push(hr);
  lines.push('## Quick Stats\n');
  lines.push(`| Content Type | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Posts | ${data.posts.length} (${boosted.length} boosted, ${organic.length} organic) |`);
  lines.push(`| Ideas | ${data.ideas.length} |`);
  lines.push(`| Proposals | ${data.proposals.length} |`);
  lines.push(`| Tasks | ${data.tasks.length} |`);
  lines.push(`| Disputes | ${data.disputes.length} |`);
  lines.push(`| Proposal votes | ${data.proposalVotes.length} |`);
  lines.push(`| Idea votes | ${data.ideaVotes.length} |`);
  lines.push(`| Comments (all types) | ${data.comments.length} |`);
  lines.push(`| Dispute comments | ${data.disputeComments.length} |`);
  lines.push(`| Task comments (legacy) | ${data.taskComments.length} |`);

  const total = data.posts.length + data.ideas.length + data.proposals.length + data.tasks.length
    + data.disputes.length + data.proposalVotes.length + data.ideaVotes.length
    + data.comments.length + data.disputeComments.length + data.taskComments.length;
  lines.push(`| **Total** | **${total}** |`);
  lines.push('');

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching community content from the last ${DAYS} days...\n`);

  const [posts, threadParts, comments, taskComments, ideas, proposals, tasks, disputes, disputeComments, proposalVotes, ideaVotes] = await Promise.all([
    fetchPosts(),
    fetchThreadParts(),
    fetchComments(),
    fetchTaskComments(),
    fetchIdeas(),
    fetchProposals(),
    fetchTasks(),
    fetchDisputes(),
    fetchDisputeComments(),
    fetchProposalVotes(),
    fetchIdeaVotes(),
  ]);

  const counts = {
    posts: posts.length,
    threadParts: threadParts.length,
    comments: comments.length,
    taskComments: taskComments.length,
    ideas: ideas.length,
    proposals: proposals.length,
    tasks: tasks.length,
    disputes: disputes.length,
    disputeComments: disputeComments.length,
    proposalVotes: proposalVotes.length,
    ideaVotes: ideaVotes.length,
  };

  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }

  const md = buildMarkdown({ posts, threadParts, comments, taskComments, ideas, proposals, tasks, disputes, disputeComments, proposalVotes, ideaVotes });
  const outPath = resolve(__dirname, 'output.md');
  writeFileSync(outPath, md, 'utf-8');

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nDone! Output written to: ${outPath}`);
  console.log(`Total content items: ${total}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
