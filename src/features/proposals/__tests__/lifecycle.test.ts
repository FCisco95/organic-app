import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionLifecycleStatus,
  normalizeProposalStatus,
  type LifecycleProposalStatus,
} from '../types';

test('normalizes legacy statuses to lifecycle statuses', () => {
  assert.equal(normalizeProposalStatus('submitted'), 'public');
  assert.equal(normalizeProposalStatus('approved'), 'finalized');
  assert.equal(normalizeProposalStatus('rejected'), 'finalized');
  assert.equal(normalizeProposalStatus('discussion'), 'discussion');
});

test('allows expected forward transitions', () => {
  const happyPath: Array<[LifecycleProposalStatus, LifecycleProposalStatus]> = [
    ['draft', 'public'],
    ['public', 'qualified'],
    ['qualified', 'discussion'],
    ['discussion', 'voting'],
    ['voting', 'finalized'],
  ];

  for (const [from, to] of happyPath) {
    assert.equal(
      canTransitionLifecycleStatus(from, to),
      true,
      `expected transition ${from} -> ${to} to be allowed`
    );
  }
});

test('rejects backward transitions', () => {
  const backwardPath: Array<[LifecycleProposalStatus, LifecycleProposalStatus]> = [
    ['public', 'draft'],
    ['qualified', 'public'],
    ['discussion', 'qualified'],
    ['voting', 'discussion'],
    ['finalized', 'voting'],
  ];

  for (const [from, to] of backwardPath) {
    assert.equal(
      canTransitionLifecycleStatus(from, to),
      false,
      `expected transition ${from} -> ${to} to be rejected`
    );
  }
});
