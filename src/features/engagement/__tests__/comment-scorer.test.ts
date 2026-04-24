import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, scoreComment, triviallyScore } from '../comment-scorer';

test('triviallyScore flags short replies', () => {
  assert.ok(triviallyScore('gm'));
  assert.ok(triviallyScore('GM!'));
  assert.ok(triviallyScore('first!'));
  assert.ok(triviallyScore('lfg'));
  assert.ok(triviallyScore('🔥🔥🔥'));
  assert.ok(triviallyScore('hi'));
});

test('triviallyScore returns null for substantive replies', () => {
  assert.equal(triviallyScore('This is a great take on tokenomics, especially the lock-up period.'), null);
  assert.equal(triviallyScore('How does this interact with the existing reputation system?'), null);
});

test('triviallyScore gives score of 1 across all axes', () => {
  const result = triviallyScore('gm')!;
  assert.equal(result.score, 1);
  assert.equal(result.axes.substance, 1);
  assert.equal(result.axes.authenticity, 1);
  assert.equal(result.axes.relevance, 1);
  assert.ok(result.reasoning.length > 0);
});

test('buildPrompt injects post text, comment text, and examples', () => {
  const prompt = buildPrompt({
    postText: 'Launching new token gating this week.',
    commentText: 'How will existing holders be affected?',
    examples: [
      { comment: 'gm', ideal_score: 1, rationale: 'empty' },
      { comment: 'Curious about the snapshot block.', ideal_score: 4, rationale: 'on-topic question' },
    ],
  });
  assert.ok(prompt.includes('Launching new token gating'));
  assert.ok(prompt.includes('How will existing holders be affected?'));
  assert.ok(prompt.includes('Example 1'));
  assert.ok(prompt.includes('empty'));
  assert.ok(prompt.includes('Example 2'));
});

test('buildPrompt handles empty examples', () => {
  const prompt = buildPrompt({ postText: 'P', commentText: 'C' });
  assert.ok(prompt.includes('no few-shot examples configured'));
});

test('scoreComment returns trivial score without invoking Claude for short replies', async () => {
  let called = false;
  const mockAnthropic = {
    messages: {
      create: async () => {
        called = true;
        return { content: [], usage: { input_tokens: 0, output_tokens: 0 } } as never;
      },
    },
  };
  const result = await scoreComment({
    postText: 'Post',
    commentText: 'gm',
    anthropic: mockAnthropic as never,
  });
  assert.equal(result.ok, true);
  assert.equal(result.score?.score, 1);
  assert.equal(result.model, 'prefilter');
  assert.equal(called, false);
});

test('scoreComment returns score from mocked Claude response', async () => {
  const mockAnthropic = {
    messages: {
      create: async () =>
        ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                score: 4,
                axes: { substance: 5, authenticity: 4, relevance: 4 },
                reasoning: 'On-topic question about token mechanics.',
              }),
            },
          ],
          usage: { input_tokens: 300, output_tokens: 50 },
        }) as never,
    },
  };
  process.env.ANTHROPIC_API_KEY = 'test';
  const result = await scoreComment({
    postText: 'Token snapshot next week.',
    commentText: 'Will the snapshot include staked balances or only liquid ones?',
    anthropic: mockAnthropic as never,
  });
  assert.equal(result.ok, true);
  assert.equal(result.score?.score, 4);
  assert.equal(result.score?.axes.substance, 5);
  assert.equal(result.tokensUsed, 350);
});

test('scoreComment falls back to score 1 on schema mismatch', async () => {
  const mockAnthropic = {
    messages: {
      create: async () =>
        ({
          content: [{ type: 'text', text: '{"score": 99, "axes": {}, "reasoning": "bad"}' }],
          usage: { input_tokens: 300, output_tokens: 10 },
        }) as never,
    },
  };
  process.env.ANTHROPIC_API_KEY = 'test';
  const result = await scoreComment({
    postText: 'Post',
    commentText: 'A long substantive reply that passes the prefilter and reaches Claude.',
    anthropic: mockAnthropic as never,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'schema_mismatch');
  assert.equal(result.score?.score, 1);
});

test('scoreComment handles markdown-fenced JSON', async () => {
  const mockAnthropic = {
    messages: {
      create: async () =>
        ({
          content: [
            {
              type: 'text',
              text: '```json\n{"score": 3, "axes": {"substance": 3, "authenticity": 3, "relevance": 3}, "reasoning": "mid"}\n```',
            },
          ],
          usage: { input_tokens: 300, output_tokens: 30 },
        }) as never,
    },
  };
  process.env.ANTHROPIC_API_KEY = 'test';
  const result = await scoreComment({
    postText: 'Post',
    commentText: 'A long substantive reply that reaches the scorer and exercises the markdown strip.',
    anthropic: mockAnthropic as never,
  });
  assert.equal(result.ok, true);
  assert.equal(result.score?.score, 3);
});

test('scoreComment falls back when no API key and no injected client', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const result = await scoreComment({
    postText: 'Post',
    commentText: 'A long substantive reply that reaches the scorer.',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ANTHROPIC_API_KEY not configured');
  assert.equal(result.score?.score, 1);
});
