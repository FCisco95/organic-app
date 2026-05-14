import { describe, it, expect } from 'vitest';
import {
  computeSuggestN,
  scoreTaskClarity,
  scoreTaskScope,
  classifyRecommendation,
  detectConcerns,
} from '@/lib/steward/heuristics';

describe('computeSuggestN', () => {
  it('clamps to minimum of 3 when no active voters', () => {
    expect(computeSuggestN(0)).toBe(3);
  });
  it('clamps to minimum of 3 for small communities', () => {
    expect(computeSuggestN(1)).toBe(3);
    expect(computeSuggestN(5)).toBe(3);
  });
  it('scales linearly between 3 and 15', () => {
    expect(computeSuggestN(25)).toBe(5);
    expect(computeSuggestN(50)).toBe(10);
  });
  it('clamps to maximum of 15 for large communities', () => {
    expect(computeSuggestN(100)).toBe(15);
    expect(computeSuggestN(1000)).toBe(15);
  });
});

describe('scoreTaskClarity', () => {
  it('returns 1 for missing description', () => {
    expect(scoreTaskClarity({ description: null })).toBe(1);
    expect(scoreTaskClarity({ description: '' })).toBe(1);
  });
  it('returns 2 for short descriptions', () => {
    expect(scoreTaskClarity({ description: 'do the thing' })).toBe(2);
  });
  it('returns 4 when description has structure headers', () => {
    const desc = '## WHAT\nBuild a button.\n\n## WHY\nUsers need it.\n\n## HOW\nClick handler.';
    expect(scoreTaskClarity({ description: desc })).toBe(4);
  });
  it('returns 5 when description has structure + acceptance criteria', () => {
    const desc =
      '## WHAT\nBuild a button.\n\n## WHY\nUsers need it.\n\n## Acceptance Criteria\n- Click triggers handler.';
    expect(scoreTaskClarity({ description: desc })).toBe(5);
  });
});

describe('scoreTaskScope', () => {
  it('returns 1 for missing points', () => {
    expect(scoreTaskScope({ points: null, labels: [] })).toBe(1);
  });
  it('returns 5 for bounded small tasks with labels', () => {
    expect(scoreTaskScope({ points: 100, labels: ['frontend', 'small'] })).toBe(5);
  });
  it('returns 2 for very large unscoped tasks', () => {
    expect(scoreTaskScope({ points: 5000, labels: [] })).toBe(2);
  });
});

describe('detectConcerns', () => {
  it('flags missing description', () => {
    const concerns = detectConcerns({ description: null, points: 100, title: 't' }, []);
    expect(concerns).toContain('no_description');
  });
  it('flags unbounded scope', () => {
    const concerns = detectConcerns({ description: 'short', points: 5000, title: 't' }, []);
    expect(concerns).toContain('unbounded_scope');
  });
  it('flags possible duplicates by title trigram similarity', () => {
    const concerns = detectConcerns(
      { description: 'desc', points: 100, title: 'Add backlog voting' },
      [{ id: 'dup-1', title: 'Add backlog voting' }],
    );
    expect(concerns.some((c) => c.startsWith('possible_duplicate:'))).toBe(true);
  });
  it('does not flag dissimilar titles', () => {
    const concerns = detectConcerns(
      { description: 'desc', points: 100, title: 'Setup CI pipeline' },
      [{ id: 'other-1', title: 'Update README' }],
    );
    expect(concerns.some((c) => c.startsWith('possible_duplicate:'))).toBe(false);
  });
});

describe('classifyRecommendation', () => {
  it('promote when scores >= 3 and no concerns', () => {
    expect(classifyRecommendation(4, 4, [])).toBe('promote');
  });
  it('flag when scores >= 3 with concerns', () => {
    expect(classifyRecommendation(3, 3, ['no_description'])).toBe('flag');
  });
  it('reject when clarity is 1', () => {
    expect(classifyRecommendation(1, 4, [])).toBe('reject');
  });
});
