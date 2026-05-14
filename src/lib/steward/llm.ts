import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { HeuristicSteward } from './heuristics';
import type {
  BacklogTaskSnapshot,
  StewardClient,
  StewardRecommendation,
  StewardReview,
  StewardScore,
} from './types';

const MODEL = process.env.STEWARD_LLM_MODEL ?? 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;

const PROMPT = `You are the Steward for a DAO backlog. For each task, return a strict JSON object:
{
  "summary": string (<= 180 chars, plain text),
  "clarity_score": 1-5 (1=missing/unclear, 5=fully structured WHAT/WHY/HOW + acceptance criteria),
  "scope_score": 1-5 (1=unbounded/no points, 5=clearly bounded with labels and points <= 1000),
  "concerns": string[] (from: "no_description", "missing_acceptance", "unbounded_scope", or "possible_duplicate:<task_id>"),
  "recommendation": "promote" | "flag" | "reject"
}
Output ONLY a JSON array, one object per task, in the same order as the input. No prose.`;

function clampScore(n: unknown): StewardScore {
  const v = Math.round(Number(n));
  if (v >= 1 && v <= 5) return v as StewardScore;
  return 3;
}

function clampRecommendation(r: unknown): StewardRecommendation {
  if (r === 'promote' || r === 'flag' || r === 'reject') return r;
  return 'flag';
}

export class LlmSteward implements StewardClient {
  readonly tag = `llm-${MODEL}`;
  private readonly fallback = new HeuristicSteward();
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  suggestN(orgId: string | null): Promise<number> {
    // suggestN stays heuristic — based on activity counts, not LLM judgment.
    return this.fallback.suggestN(orgId);
  }

  async reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]> {
    if (!this.client || taskIds.length === 0) {
      return this.fallback.reviewBacklogCandidates(taskIds);
    }

    const service = createServiceClient();
    const { data: tasks, error } = await service
      .from('tasks')
      .select('id, org_id, title, description, points, base_points, labels')
      .in('id', taskIds);
    if (error || !tasks || tasks.length === 0) {
      return this.fallback.reviewBacklogCandidates(taskIds);
    }

    const snapshots: BacklogTaskSnapshot[] = tasks.map((t) => ({
      id: t.id,
      title: t.title ?? '',
      description: t.description ?? null,
      points: (t.base_points ?? t.points) ?? null,
      labels: (t.labels as string[] | null) ?? [],
      org_id: t.org_id ?? null,
    }));

    try {
      const completion = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(
              snapshots.map((s) => ({
                id: s.id,
                title: s.title,
                description: s.description,
                points: s.points,
                labels: s.labels,
              })),
            ),
          },
        ],
      });

      const text = completion.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      const payload = start >= 0 && end > start ? text.slice(start, end + 1) : '[]';
      const parsed = JSON.parse(payload) as Array<Record<string, unknown>>;

      const reviews: StewardReview[] = snapshots.map((s, i) => {
        const r = parsed[i] ?? {};
        return {
          task_id: s.id,
          summary: typeof r.summary === 'string' ? r.summary.slice(0, 200) : s.title,
          clarity_score: clampScore(r.clarity_score),
          scope_score: clampScore(r.scope_score),
          concerns: Array.isArray(r.concerns)
            ? r.concerns.filter((c): c is string => typeof c === 'string')
            : [],
          recommendation: clampRecommendation(r.recommendation),
          generated_by: this.tag,
        };
      });

      await service.from('task_steward_reviews').upsert(
        reviews.map((r) => ({
          task_id: r.task_id,
          summary: r.summary,
          clarity_score: r.clarity_score,
          scope_score: r.scope_score,
          concerns: r.concerns,
          recommendation: r.recommendation,
          generated_by: r.generated_by,
          generated_at: new Date().toISOString(),
        })),
        { onConflict: 'task_id' },
      );

      return reviews;
    } catch (err) {
      logger.error('LlmSteward.reviewBacklogCandidates failed, falling back to heuristic', err);
      return this.fallback.reviewBacklogCandidates(taskIds);
    }
  }
}
