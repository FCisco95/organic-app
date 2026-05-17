import test from 'node:test';
import assert from 'node:assert/strict';
import { isTwitterProjectAttachmentError, loadCrawlerToken } from '../processor';

test('isTwitterProjectAttachmentError matches the canonical Twitter v2 message', () => {
  const err = new Error(
    'When authenticating requests to the Twitter API v2 endpoints, you must use keys and tokens from a Twitter developer App that is attached to a Project. You can create a project via the developer portal.'
  );
  assert.equal(isTwitterProjectAttachmentError(err), true);
});

test('isTwitterProjectAttachmentError ignores unrelated errors', () => {
  assert.equal(isTwitterProjectAttachmentError(new Error('rate limit exceeded')), false);
  assert.equal(isTwitterProjectAttachmentError(new Error('network timeout')), false);
});

test('isTwitterProjectAttachmentError ignores non-Error values', () => {
  assert.equal(isTwitterProjectAttachmentError(null), false);
  assert.equal(isTwitterProjectAttachmentError(undefined), false);
  assert.equal(isTwitterProjectAttachmentError('attached to a Project'), false);
  assert.equal(isTwitterProjectAttachmentError({ message: 'attached to a Project' }), false);
});

// ─── loadCrawlerToken regression tests ────────────────────────────────────────

interface ChainCall {
  method: string;
  args: unknown[];
}

function buildRecordingSupabase(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const calls: ChainCall[] = [];
  const chain: Record<string, unknown> = {};
  const recorder = (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  for (const method of ['select', 'eq', 'not', 'order', 'limit', 'in', 'is', 'gte', 'lt']) {
    chain[method] = recorder(method);
  }
  chain.maybeSingle = async () => result;
  const supabase = {
    from(table: string) {
      calls.push({ method: 'from', args: [table] });
      return chain;
    },
  };
  return { supabase, calls };
}

test('loadCrawlerToken filters out pending_ placeholder rows (regression for ORGANIC-APP-1)', async () => {
  process.env.TWITTER_TOKEN_ENCRYPTION_KEY = 'test-key';
  const { supabase, calls } = buildRecordingSupabase({ data: null, error: null });

  const result = await loadCrawlerToken(
    // The function only exercises the query builder; the cast is safe for this test.
    supabase as unknown as Parameters<typeof loadCrawlerToken>[0],
    {} as Parameters<typeof loadCrawlerToken>[1]
  );

  assert.equal(result, null);
  const notCall = calls.find((c) => c.method === 'not');
  assert.ok(notCall, 'expected query to apply a .not() filter');
  assert.deepEqual(notCall.args, ['twitter_user_id', 'like', 'pending_%']);
});
