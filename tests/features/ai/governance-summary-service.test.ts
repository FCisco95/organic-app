import { describe, it, expect, vi, beforeEach } from 'vitest';

const anonFromSpy = vi.fn();
const serviceFromSpy = vi.fn();
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAnonClient: () => ({ from: anonFromSpy }),
  createServiceClient: () => ({ from: serviceFromSpy }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                headline: 'DAO healthy',
                key_metrics: [],
                insights: [],
                risks: [],
                sentiment: 'healthy',
              }),
            },
          ],
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      },
    };
  }
  return { default: Anthropic };
});

function thenableChain(result: unknown) {
  const obj: Record<string, unknown> = {};
  const passthrough = () => obj;
  for (const method of ['select', 'eq', 'in', 'not', 'is', 'gte', 'lt', 'order', 'limit']) {
    obj[method] = passthrough;
  }
  obj.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return obj;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';

  // Anon client: every metrics query returns an empty thenable.
  anonFromSpy.mockImplementation(() =>
    thenableChain({ data: [], count: 0, error: null })
  );

  // Service client: insert chain returns a fake row.
  insertSpy.mockReturnValue({
    select: () => ({
      single: () => Promise.resolve({ data: { id: 'summary-1' }, error: null }),
    }),
  });
  serviceFromSpy.mockReturnValue({ insert: insertSpy });
});

describe('generateGovernanceSummary', () => {
  it('writes governance_summaries via the service client (regression for ORGANIC-APP-3)', async () => {
    const { generateGovernanceSummary } = await import(
      '@/features/ai/governance-summary-service'
    );

    const result = await generateGovernanceSummary();

    expect(result.ok).toBe(true);
    expect(result.id).toBe('summary-1');

    // Insert MUST go through the service client. The anon client lacks an
    // INSERT policy on governance_summaries, so writing through it fails
    // RLS — that was the production bug.
    expect(serviceFromSpy).toHaveBeenCalledWith('governance_summaries');
    expect(insertSpy).toHaveBeenCalledTimes(1);

    // Anon client should only be used for SELECT-side metric collection.
    expect(anonFromSpy).not.toHaveBeenCalledWith('governance_summaries');
  });

  it('surfaces structured error details when the insert fails', async () => {
    insertSpy.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: {
              message: 'new row violates row-level security policy',
              code: '42501',
              details: null,
              hint: null,
            },
          }),
      }),
    });

    const { generateGovernanceSummary } = await import(
      '@/features/ai/governance-summary-service'
    );
    const { logger } = await import('@/lib/logger');

    const result = await generateGovernanceSummary();

    expect(result.ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to store governance summary',
      expect.objectContaining({ code: '42501' })
    );
  });
});
