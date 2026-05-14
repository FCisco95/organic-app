import { describe, it, expect } from 'vitest';
import {
  voteBacklogSchema,
  promoteBacklogSchema,
  reviewBacklogSchema,
} from '@/features/backlog/schemas';

describe('voteBacklogSchema', () => {
  it('accepts up/down/none', () => {
    expect(voteBacklogSchema.safeParse({ value: 'up' }).success).toBe(true);
    expect(voteBacklogSchema.safeParse({ value: 'down' }).success).toBe(true);
    expect(voteBacklogSchema.safeParse({ value: 'none' }).success).toBe(true);
  });

  it('rejects arbitrary strings and numeric values', () => {
    expect(voteBacklogSchema.safeParse({ value: 'maybe' }).success).toBe(false);
    expect(voteBacklogSchema.safeParse({ value: 1 }).success).toBe(false);
    expect(voteBacklogSchema.safeParse({}).success).toBe(false);
  });
});

describe('promoteBacklogSchema', () => {
  it('accepts integer n between 1 and 50', () => {
    expect(promoteBacklogSchema.safeParse({ n: 1 }).success).toBe(true);
    expect(promoteBacklogSchema.safeParse({ n: 50 }).success).toBe(true);
  });

  it('rejects n=0, negative, or > 50', () => {
    expect(promoteBacklogSchema.safeParse({ n: 0 }).success).toBe(false);
    expect(promoteBacklogSchema.safeParse({ n: -1 }).success).toBe(false);
    expect(promoteBacklogSchema.safeParse({ n: 51 }).success).toBe(false);
  });

  it('rejects non-integer n', () => {
    expect(promoteBacklogSchema.safeParse({ n: 2.5 }).success).toBe(false);
  });
});

describe('reviewBacklogSchema', () => {
  it('accepts non-empty uuid array with optional force flag', () => {
    expect(
      reviewBacklogSchema.safeParse({
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }).success,
    ).toBe(true);
    expect(
      reviewBacklogSchema.safeParse({
        task_ids: ['11111111-1111-1111-1111-111111111111'],
        force: true,
      }).success,
    ).toBe(true);
  });

  it('rejects empty array, non-uuid entries, or > 50 ids', () => {
    expect(reviewBacklogSchema.safeParse({ task_ids: [] }).success).toBe(false);
    expect(reviewBacklogSchema.safeParse({ task_ids: ['not-a-uuid'] }).success).toBe(false);
    const tooMany = Array(51).fill('11111111-1111-1111-1111-111111111111');
    expect(reviewBacklogSchema.safeParse({ task_ids: tooMany }).success).toBe(false);
  });
});
