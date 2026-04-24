import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

const MODEL = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'x-comment-scoring-v1';

// ─── Output schema ──────────────────────────────────────────────────────

const commentScoreSchema = z.object({
  score: z.number().int().min(1).max(5),
  axes: z.object({
    substance: z.number().int().min(1).max(5),
    authenticity: z.number().int().min(1).max(5),
    relevance: z.number().int().min(1).max(5),
  }),
  reasoning: z.string().min(1).max(500),
});

export type CommentScore = z.infer<typeof commentScoreSchema>;

export interface RubricExample {
  comment: string;
  ideal_score: number;
  rationale?: string | null;
}

export interface CommentScorerInput {
  postText: string;
  commentText: string;
  examples?: RubricExample[];
  /** Dependency injection hook for tests. */
  anthropic?: Pick<Anthropic, 'messages'>;
}

export interface CommentScorerResult {
  ok: boolean;
  score?: CommentScore;
  model: string;
  promptVersion: string;
  tokensUsed?: number;
  error?: string;
}

// ─── Rule-based prefilter ───────────────────────────────────────────────

const TRIVIAL_PATTERNS = [
  /^gm\.?$/i,
  /^gn\.?$/i,
  /^first!?$/i,
  /^(lfg|wagmi|wgmi|ngmi)!?$/i,
  /^[\p{Emoji}\s]+$/u, // emoji-only
];

/**
 * Fast, deterministic check for obviously-trivial comments. Returns a
 * guaranteed score of 1 without calling Claude. Saves API calls and money
 * on the ~40% of engagement that is "gm" / emoji spam.
 */
export function triviallyScore(commentText: string): CommentScore | null {
  const trimmed = commentText.trim();

  // Length check: 1–2 "words" of non-whitespace content.
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 2 && trimmed.length <= 30) {
    return {
      score: 1,
      axes: { substance: 1, authenticity: 1, relevance: 1 },
      reasoning: 'Reply is trivially short (≤ 2 words).',
    };
  }

  for (const pat of TRIVIAL_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        score: 1,
        axes: { substance: 1, authenticity: 1, relevance: 1 },
        reasoning: 'Reply matches a known low-effort pattern (e.g. "gm", "lfg", emoji-only).',
      };
    }
  }
  return null;
}

// ─── Prompt assembly ────────────────────────────────────────────────────

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  const path = join(process.cwd(), 'prompts', `${PROMPT_VERSION}.md`);
  cachedTemplate = readFileSync(path, 'utf8');
  return cachedTemplate;
}

function formatExamples(examples: RubricExample[] | undefined): string {
  if (!examples || examples.length === 0) {
    return '(no few-shot examples configured — use rubric directly)';
  }
  return examples
    .map(
      (e, i) =>
        `Example ${i + 1}:\n  reply: ${JSON.stringify(e.comment)}\n` +
        `  score: ${e.ideal_score}${e.rationale ? `\n  rationale: ${e.rationale}` : ''}`
    )
    .join('\n\n');
}

export function buildPrompt(input: { postText: string; commentText: string; examples?: RubricExample[] }): string {
  return loadTemplate()
    .replace('{{post_text}}', input.postText)
    .replace('{{comment_text}}', input.commentText)
    .replace('{{examples}}', formatExamples(input.examples));
}

// ─── Main entry ─────────────────────────────────────────────────────────

/**
 * Scores a reply comment on Organic DAO's 3-axis rubric via Claude Haiku.
 *
 * Returns a fallback score of 1 on any parse/API failure — this is
 * intentional: a low score gives the user appeal grounds rather than
 * silently dropping the engagement.
 */
export async function scoreComment(input: CommentScorerInput): Promise<CommentScorerResult> {
  // 1. Rule-based fast path
  const trivial = triviallyScore(input.commentText);
  if (trivial) {
    return { ok: true, score: trivial, model: 'prefilter', promptVersion: PROMPT_VERSION };
  }

  // 2. Claude scoring
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !input.anthropic) {
    return {
      ok: false,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      error: 'ANTHROPIC_API_KEY not configured',
      score: fallbackScore('api_unavailable'),
    };
  }

  const client = input.anthropic ?? new Anthropic({ apiKey });
  const prompt = buildPrompt({
    postText: input.postText,
    commentText: input.commentText,
    examples: input.examples,
  });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('[engagement.scorer] no text block in response');
      return {
        ok: false,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        error: 'no_text_response',
        score: fallbackScore('no_text_response'),
      };
    }

    const jsonStr = textBlock.text
      .replace(/^```json?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const parsed = commentScoreSchema.safeParse(JSON.parse(jsonStr));
    if (!parsed.success) {
      logger.error('[engagement.scorer] schema mismatch', { raw: textBlock.text, issues: parsed.error.issues });
      return {
        ok: false,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        error: 'schema_mismatch',
        score: fallbackScore('schema_mismatch'),
      };
    }

    return {
      ok: true,
      score: parsed.data,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (error) {
    logger.error('[engagement.scorer] scoring failed', error);
    return {
      ok: false,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      error: String(error),
      score: fallbackScore('exception'),
    };
  }
}

function fallbackScore(reason: string): CommentScore {
  return {
    score: 1,
    axes: { substance: 1, authenticity: 1, relevance: 1 },
    reasoning: `Scoring fallback (${reason}) — user may appeal for human review.`,
  };
}

export const __scorerInternals = { MODEL, PROMPT_VERSION, commentScoreSchema };
