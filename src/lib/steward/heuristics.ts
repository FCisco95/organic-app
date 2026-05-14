import { createServiceClient } from '@/lib/supabase/server';
import type {
  BacklogTaskSnapshot,
  StewardClient,
  StewardRecommendation,
  StewardReview,
  StewardScore,
} from './types';

const STRUCTURE_HEADERS = ['## WHAT', '## WHY', '## HOW'];
const ACCEPTANCE_PATTERNS = [/acceptance criteria/i, /done when/i];
const DUPLICATE_TRIGRAM_THRESHOLD = 0.5;
const LARGE_SCOPE_POINTS = 1000;
const UNBOUNDED_SCOPE_POINTS = 3000;

export function computeSuggestN(activeVoters: number): number {
  const raw = Math.ceil(activeVoters / 5);
  return Math.min(15, Math.max(3, raw));
}

export function scoreTaskClarity(task: Pick<BacklogTaskSnapshot, 'description'>): StewardScore {
  const desc = task.description?.trim() ?? '';
  if (!desc) return 1;
  const upper = desc.toUpperCase();
  const headersFound = STRUCTURE_HEADERS.filter((h) => upper.includes(h)).length;
  const hasAcceptance = ACCEPTANCE_PATTERNS.some((p) => p.test(desc));
  if (hasAcceptance && headersFound >= 2) return 5;
  if (headersFound >= 2) return 4;
  if (desc.length >= 200) return 3;
  if (desc.length < 50) return 2;
  return 3;
}

export function scoreTaskScope(
  task: Pick<BacklogTaskSnapshot, 'points' | 'labels'>,
): StewardScore {
  if (task.points == null) return 1;
  if (task.points > UNBOUNDED_SCOPE_POINTS) return 2;
  if (task.points > LARGE_SCOPE_POINTS) return 3;
  if (task.labels.length >= 2) return 5;
  if (task.labels.length >= 1) return 4;
  return 3;
}

export function detectConcerns(
  task: { description: string | null; points: number | null; title: string },
  otherBacklogTitles: Array<{ id: string; title: string }>,
): string[] {
  const concerns: string[] = [];
  if (!task.description || task.description.trim().length === 0) concerns.push('no_description');
  if (task.description && !ACCEPTANCE_PATTERNS.some((p) => p.test(task.description!))) {
    concerns.push('missing_acceptance');
  }
  if (task.points && task.points > UNBOUNDED_SCOPE_POINTS) concerns.push('unbounded_scope');

  const aTokens = trigramTokens(task.title);
  for (const other of otherBacklogTitles) {
    const sim = trigramSimilarity(aTokens, trigramTokens(other.title));
    if (sim >= DUPLICATE_TRIGRAM_THRESHOLD) {
      concerns.push(`possible_duplicate:${other.id}`);
    }
  }
  return concerns;
}

export function classifyRecommendation(
  clarity: StewardScore,
  scope: StewardScore,
  concerns: string[],
): StewardRecommendation {
  if (clarity === 1) return 'reject';
  if (clarity >= 3 && scope >= 3 && concerns.length === 0) return 'promote';
  if (clarity >= 2 && scope >= 2) return 'flag';
  return 'reject';
}

function trigramTokens(text: string): Set<string> {
  const normalized = `  ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}  `;
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    set.add(normalized.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function makeSummary(task: BacklogTaskSnapshot): string {
  const desc = (task.description ?? '').replace(/\s+/g, ' ').trim();
  const base = desc ? desc.slice(0, 180) : task.title;
  return base.length >= 180 ? `${base}...` : base;
}

export class HeuristicSteward implements StewardClient {
  readonly tag = 'heuristic-v1';

  async suggestN(orgId: string | null): Promise<number> {
    const service = createServiceClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let query = service
      .from('backlog_votes')
      .select('user_id, tasks!inner(org_id)')
      .gte('created_at', since);
    if (orgId) query = query.eq('tasks.org_id', orgId);
    const { data, error } = await query;
    if (error) return 3;
    const unique = new Set((data ?? []).map((row: { user_id: string }) => row.user_id));
    return computeSuggestN(unique.size);
  }

  async reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]> {
    if (taskIds.length === 0) return [];
    const service = createServiceClient();

    const { data: tasks, error } = await service
      .from('tasks')
      .select('id, org_id, title, description, points, base_points, labels')
      .in('id', taskIds);
    if (error || !tasks) return [];

    const { data: siblings } = await service
      .from('tasks')
      .select('id, title')
      .eq('status', 'backlog')
      .is('sprint_id', null);

    const reviews: StewardReview[] = [];
    for (const t of tasks) {
      const snapshot: BacklogTaskSnapshot = {
        id: t.id,
        title: t.title ?? '',
        description: t.description ?? null,
        points: (t.base_points ?? t.points) ?? null,
        labels: (t.labels as string[] | null) ?? [],
        org_id: t.org_id ?? null,
      };
      const clarity = scoreTaskClarity(snapshot);
      const scope = scoreTaskScope(snapshot);
      const concerns = detectConcerns(
        { description: snapshot.description, points: snapshot.points, title: snapshot.title },
        ((siblings ?? []) as Array<{ id: string; title: string }>).filter((s) => s.id !== snapshot.id),
      );
      const recommendation = classifyRecommendation(clarity, scope, concerns);
      reviews.push({
        task_id: snapshot.id,
        summary: makeSummary(snapshot),
        clarity_score: clarity,
        scope_score: scope,
        concerns,
        recommendation,
        generated_by: this.tag,
      });
    }

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
  }
}
