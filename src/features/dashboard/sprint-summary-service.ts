import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const MODEL = 'claude-haiku-4-5';

export interface SprintMetrics {
  id: string;
  name: string;
  status: string;
  startAt: string;
  endAt: string;
  goal: string | null;
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  topContributors: { name: string; xp: number }[];
}

export interface SprintSummaryResult {
  ok: boolean;
  text?: string;
  themes?: string[];
  model?: string;
  error?: string;
  cacheReadTokens?: number;
}

const SYSTEM_PROMPT = `You write concise, factual sprint summaries for a Solana DAO community dashboard.

Output rules:
- Respond with ONLY valid JSON: {"text": "...", "themes": ["..."]}
- "text" is 2-3 short paragraphs (max 600 characters total). Plain language, no jargon. No emojis.
- "themes" is 3-4 short noun phrases that capture what the sprint is about.
- Be specific about numbers; don't be vague.
- Be neutral and confident — celebrate progress without hype.
- If the sprint is in early phase (planning) and there's nothing to highlight, say so plainly.

Input shape: a JSON object with the sprint name, phase, dates, goal, task counts (done/total), point counts (done/total), and top contributors (name + xp).`;

function buildUserMessage(metrics: SprintMetrics): string {
  return `Sprint metrics:\n${JSON.stringify(metrics, null, 2)}\n\nReturn the summary JSON now.`;
}

interface AiResponse {
  text: string;
  themes: string[];
}

function parseResponse(raw: string): AiResponse | null {
  try {
    const jsonStr = raw
      .replace(/^```json?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    const parsed = JSON.parse(jsonStr) as AiResponse;
    if (typeof parsed.text !== 'string' || !Array.isArray(parsed.themes)) {
      return null;
    }
    return {
      text: parsed.text.slice(0, 800),
      themes: parsed.themes.filter((t) => typeof t === 'string').slice(0, 4),
    };
  } catch {
    return null;
  }
}

async function collectSprintMetrics(sprintId: string): Promise<SprintMetrics | null> {
  const supabase = createServiceClient();

  const { data: sprint, error: sprintErr } = await supabase
    .from('sprints')
    .select('id, name, status, start_at, end_at, goal')
    .eq('id', sprintId)
    .maybeSingle();

  if (sprintErr || !sprint) {
    logger.warn('Sprint not found for AI summary', { sprintId, error: sprintErr });
    return null;
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, points, assignee_id')
    .eq('sprint_id', sprintId);

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = (tasks ?? []).filter((t) => t.status === 'done').length;
  const totalPoints = (tasks ?? []).reduce((sum, t) => sum + (t.points ?? 0), 0);
  const donePoints = (tasks ?? [])
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.points ?? 0), 0);

  const assigneeIds = Array.from(
    new Set((tasks ?? []).filter((t) => t.status === 'done' && t.assignee_id).map((t) => t.assignee_id as string))
  );

  let topContributors: { name: string; xp: number }[] = [];
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, name, organic_id')
      .in('id', assigneeIds);

    const xpByAssignee = new Map<string, number>();
    for (const t of tasks ?? []) {
      if (t.status !== 'done' || !t.assignee_id) continue;
      xpByAssignee.set(
        t.assignee_id,
        (xpByAssignee.get(t.assignee_id) ?? 0) + (t.points ?? 0)
      );
    }

    topContributors = (profiles ?? [])
      .map((p) => ({
        name: p.name ?? `Member #${p.organic_id ?? '—'}`,
        xp: xpByAssignee.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3);
  }

  return {
    id: sprint.id,
    name: sprint.name,
    status: sprint.status ?? 'unknown',
    startAt: sprint.start_at,
    endAt: sprint.end_at,
    goal: sprint.goal,
    totalTasks,
    doneTasks,
    totalPoints,
    donePoints,
    topContributors,
  };
}

export async function generateSprintSummary(sprintId: string): Promise<SprintSummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }

  const metrics = await collectSprintMetrics(sprintId);
  if (!metrics) {
    return { ok: false, error: 'sprint_not_found' };
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: buildUserMessage(metrics) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      logger.error('Sprint summary Anthropic call failed', { status: error.status, message: error.message });
      return { ok: false, error: `anthropic_${error.status}` };
    }
    logger.error('Sprint summary unexpected error', { error: String(error) });
    return { ok: false, error: 'anthropic_unexpected' };
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { ok: false, error: 'no_text_response' };
  }

  const parsed = parseResponse(textBlock.text);
  if (!parsed) {
    logger.warn('Sprint summary AI response was not valid JSON', { raw: textBlock.text.slice(0, 200) });
    return { ok: false, error: 'invalid_json' };
  }

  const supabase = createServiceClient();
  const { error: updateErr } = await supabase
    .from('sprints')
    .update({
      ai_summary_text: parsed.text,
      ai_summary_themes: parsed.themes,
      ai_summary_generated_at: new Date().toISOString(),
      ai_summary_model: MODEL,
    } as never)
    .eq('id', sprintId);

  if (updateErr) {
    logger.error('Failed to persist sprint AI summary', { sprintId, error: updateErr });
    return { ok: false, error: 'db_update_failed' };
  }

  return {
    ok: true,
    text: parsed.text,
    themes: parsed.themes,
    model: MODEL,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
}

export function buildFallbackSummary(metrics: {
  name: string;
  status: string;
  doneTasks: number;
  totalTasks: number;
  topContributors: { name: string }[];
}): string {
  const phase = metrics.status.replace(/_/g, ' ');
  const contributors = metrics.topContributors.map((c) => c.name).join(', ');
  const contributorClause = contributors ? ` Top contributors: ${contributors}.` : '';
  return `${metrics.name} is in ${phase}. ${metrics.doneTasks} of ${metrics.totalTasks} tasks complete.${contributorClause}`;
}
