import Anthropic from '@anthropic-ai/sdk';
import { createAnonClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { DaoMetricsSnapshot, GovernanceSummaryContent } from './types';

const MODEL = 'claude-haiku-4-5-20251001';

// ─── Metrics Collection ──────────────────────────────────────────────────────

async function collectMetrics(): Promise<DaoMetricsSnapshot> {
  const supabase = createAnonClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    proposalsResult,
    votesThisWeek,
    votesPrevWeek,
    holdersResult,
    tasksThisWeek,
    tasksLastWeek,
    newMembersResult,
    totalMembersResult,
    topEarnersResult,
    disputesResult,
  ] = await Promise.all([
    // Active proposals by status
    supabase
      .from('proposals')
      .select('status')
      .in('status', ['submitted', 'approved', 'voting', 'discussion']),

    // Votes this week
    supabase
      .from('votes')
      .select('voter_id')
      .gte('created_at', sevenDaysAgo),

    // Votes previous week
    supabase
      .from('votes')
      .select('voter_id')
      .gte('created_at', fourteenDaysAgo)
      .lt('created_at', sevenDaysAgo),

    // Eligible voters (token holders)
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .not('wallet_pubkey', 'is', null),

    // Tasks completed this week
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('updated_at', sevenDaysAgo),

    // Tasks completed last week
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('updated_at', fourteenDaysAgo)
      .lt('updated_at', sevenDaysAgo),

    // New members this week
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),

    // Total members
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true }),

    // Top XP earners (recent week)
    supabase
      .from('xp_events')
      .select('user_id, xp_amount')
      .gte('created_at', sevenDaysAgo),

    // Open disputes
    supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("resolved","dismissed","withdrawn","mediated")'),
  ]);

  // Aggregate proposals by status
  const statusCounts: Record<string, number> = {};
  for (const p of proposalsResult.data ?? []) {
    const s = p.status ?? 'unknown';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Calculate voting participation
  const eligibleVoters = holdersResult.count ?? 1;
  const uniqueVotersThisWeek = new Set((votesThisWeek.data ?? []).map((v) => v.voter_id)).size;
  const uniqueVotersPrevWeek = new Set((votesPrevWeek.data ?? []).map((v) => v.voter_id)).size;
  const participationPct =
    eligibleVoters > 0 ? Math.round((uniqueVotersThisWeek / eligibleVoters) * 100) : 0;
  const prevParticipationPct =
    eligibleVoters > 0 ? Math.round((uniqueVotersPrevWeek / eligibleVoters) * 100) : 0;

  // Aggregate top XP earners
  const xpByUser = new Map<string, number>();
  for (const e of topEarnersResult.data ?? []) {
    xpByUser.set(e.user_id, (xpByUser.get(e.user_id) ?? 0) + (e.xp_amount ?? 0));
  }
  const topEarners = Array.from(xpByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, xp]) => ({ name: userId.slice(0, 8), xp }));

  return {
    active_proposals: (proposalsResult.data ?? []).length,
    proposals_by_status: statusCounts,
    voting_participation_pct: participationPct,
    voting_participation_prev_pct: prevParticipationPct,
    tasks_completed_this_week: tasksThisWeek.count ?? 0,
    tasks_completed_last_week: tasksLastWeek.count ?? 0,
    treasury_balance_usd: null, // Treasury is on-chain, skip for now
    new_members_this_week: newMembersResult.count ?? 0,
    total_members: totalMembersResult.count ?? 0,
    top_xp_earners: topEarners,
    flagged_items: 0,
    disputes_open: disputesResult.count ?? 0,
  };
}

// ─── AI Generation ───────────────────────────────────────────────────────────

function buildPrompt(metrics: DaoMetricsSnapshot): string {
  return `You are a governance analyst. Analyze the following metrics for Organic Hub and produce a concise health summary.

## Current Metrics (last 7 days)

- Active proposals: ${metrics.active_proposals} (${Object.entries(metrics.proposals_by_status).map(([k, v]) => `${k}: ${v}`).join(', ')})
- Voting participation: ${metrics.voting_participation_pct}% (previous week: ${metrics.voting_participation_prev_pct}%)
- Tasks completed: ${metrics.tasks_completed_this_week} (previous week: ${metrics.tasks_completed_last_week})
- New members: ${metrics.new_members_this_week} (total: ${metrics.total_members})
- Open disputes: ${metrics.disputes_open}
- Top XP earners: ${metrics.top_xp_earners.map((e) => `${e.name}… (${e.xp} XP)`).join(', ') || 'None'}

## Output Format

Respond with ONLY valid JSON matching this structure:
{
  "headline": "One sentence headline summarizing DAO health",
  "key_metrics": [
    { "label": "metric name", "value": "display value", "trend": "up|down|stable" }
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "risks": ["risk 1 if any"],
  "sentiment": "healthy|caution|critical"
}

Rules:
- key_metrics should have 4-6 entries
- insights should have 2-4 bullet points
- risks can be empty if everything looks healthy
- Be specific with numbers, not vague
- Keep language concise and actionable`;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export async function generateGovernanceSummary(): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
    }

    // 1. Collect metrics
    const metrics = await collectMetrics();

    // 2. Generate summary via Claude
    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(metrics);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { ok: false, error: 'No text response from AI' };
    }

    let content: GovernanceSummaryContent;
    try {
      // Strip markdown fences if the model wraps the JSON
      const jsonStr = textBlock.text
        .replace(/^```json?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
      content = JSON.parse(jsonStr) as GovernanceSummaryContent;
    } catch {
      logger.error('Failed to parse AI response as JSON', { raw: textBlock.text });
      return { ok: false, error: 'AI response was not valid JSON' };
    }

    // 3. Store in database — must use service role: governance_summaries
    // has RLS enabled with only a public-SELECT policy, so anon INSERTs
    // are rejected. Service role bypasses RLS for cron-driven writes.
    const supabase = createServiceClient();
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('governance_summaries' as any)
      .insert({
        content,
        summary_text: content.headline,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        model_used: MODEL,
        token_count: response.usage.input_tokens + response.usage.output_tokens,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to store governance summary', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { ok: false, error: 'Database insert failed' };
    }

    return { ok: true, id: (data as any).id };
  } catch (error) {
    logger.error('Governance summary generation failed', error);
    return { ok: false, error: String(error) };
  }
}
