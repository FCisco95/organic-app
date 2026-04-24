import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppealOutcome } from '../dao-vote';

test('resolveAppealOutcome: below quorum → escalated to arbitrator', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 2, overturnVotes: 1, upholdWeight: 200, overturnWeight: 150 },
    5
  );
  assert.equal(outcome.kind, 'escalated_to_arbitrator');
});

test('resolveAppealOutcome: quorum met, weighted majority overturn', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 3, overturnVotes: 4, upholdWeight: 100, overturnWeight: 1000 },
    5
  );
  assert.equal(outcome.kind, 'resolved_overturn');
});

test('resolveAppealOutcome: quorum met, weighted majority uphold', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 4, overturnVotes: 3, upholdWeight: 2000, overturnWeight: 500 },
    5
  );
  assert.equal(outcome.kind, 'resolved_uphold');
});

test('resolveAppealOutcome: tie in weight defaults to uphold', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 3, overturnVotes: 3, upholdWeight: 500, overturnWeight: 500 },
    5
  );
  assert.equal(outcome.kind, 'resolved_uphold');
});

test('resolveAppealOutcome: exact quorum count satisfies quorum', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 3, overturnVotes: 2, upholdWeight: 300, overturnWeight: 100 },
    5
  );
  assert.equal(outcome.kind, 'resolved_uphold');
});

test('resolveAppealOutcome: zero votes below quorum → escalated', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 0, overturnVotes: 0, upholdWeight: 0, overturnWeight: 0 },
    5
  );
  assert.equal(outcome.kind, 'escalated_to_arbitrator');
});

test('resolveAppealOutcome: quorum of 1 → any single vote resolves', () => {
  const outcome = resolveAppealOutcome(
    { upholdVotes: 0, overturnVotes: 1, upholdWeight: 0, overturnWeight: 50 },
    1
  );
  assert.equal(outcome.kind, 'resolved_overturn');
});
