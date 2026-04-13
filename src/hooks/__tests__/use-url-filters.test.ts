import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('parseUrlFilters', () => {
  it('extracts filter values from search params', () => {
    const params = new URLSearchParams('status=discussion&sort=hot&q=treasury');
    const defaults = { status: 'all', sort: 'new', q: '', category: 'all' };
    const result: Record<string, string> = {};
    for (const [key, defaultVal] of Object.entries(defaults)) {
      result[key] = params.get(key) ?? defaultVal;
    }
    assert.equal(result.status, 'discussion');
    assert.equal(result.sort, 'hot');
    assert.equal(result.q, 'treasury');
    assert.equal(result.category, 'all');
  });

  it('returns defaults when params are empty', () => {
    const params = new URLSearchParams('');
    const defaults = { status: 'all', sort: 'new', q: '' };
    const result: Record<string, string> = {};
    for (const [key, defaultVal] of Object.entries(defaults)) {
      result[key] = params.get(key) ?? defaultVal;
    }
    assert.deepStrictEqual(result, defaults);
  });
});
