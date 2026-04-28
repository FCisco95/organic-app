import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackSummary } from '../sprint-summary-service';

test('fallback: reads cleanly with phase, counts, and contributors', () => {
  const text = buildFallbackSummary({
    name: 'Sprint 12',
    status: 'active',
    doneTasks: 7,
    totalTasks: 10,
    topContributors: [{ name: 'Alice' }, { name: 'Bob' }],
  });
  assert.equal(
    text,
    'Sprint 12 is in active. 7 of 10 tasks complete. Top contributors: Alice, Bob.'
  );
});

test('fallback: replaces underscores in phase names', () => {
  const text = buildFallbackSummary({
    name: 'Sprint 13',
    status: 'dispute_window',
    doneTasks: 0,
    totalTasks: 0,
    topContributors: [],
  });
  assert.match(text, /dispute window/);
});

test('fallback: omits contributors clause when empty', () => {
  const text = buildFallbackSummary({
    name: 'Sprint 14',
    status: 'planning',
    doneTasks: 0,
    totalTasks: 5,
    topContributors: [],
  });
  assert.ok(!text.includes('Top contributors'));
});
