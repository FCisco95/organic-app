import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionSprintPhase,
  getNextSprintPhase,
  isSprintExecutionPhase,
  sprintPhaseRank,
} from '../types';

test('sprint phase rank is forward-ordered', () => {
  assert.equal(sprintPhaseRank('planning') < sprintPhaseRank('active'), true);
  assert.equal(sprintPhaseRank('active') < sprintPhaseRank('review'), true);
  assert.equal(sprintPhaseRank('review') < sprintPhaseRank('dispute_window'), true);
  assert.equal(sprintPhaseRank('dispute_window') < sprintPhaseRank('settlement'), true);
  assert.equal(sprintPhaseRank('settlement') < sprintPhaseRank('completed'), true);
});

test('allows only forward sprint phase transitions', () => {
  assert.equal(canTransitionSprintPhase('planning', 'active'), true);
  assert.equal(canTransitionSprintPhase('active', 'review'), true);
  assert.equal(canTransitionSprintPhase('review', 'dispute_window'), true);
  assert.equal(canTransitionSprintPhase('dispute_window', 'settlement'), true);
  assert.equal(canTransitionSprintPhase('settlement', 'completed'), true);

  assert.equal(canTransitionSprintPhase('active', 'completed'), false);
  assert.equal(canTransitionSprintPhase('review', 'active'), false);
  assert.equal(canTransitionSprintPhase('completed', 'settlement'), false);
});

test('returns next phase and execution-phase flags', () => {
  assert.equal(getNextSprintPhase('planning'), 'active');
  assert.equal(getNextSprintPhase('settlement'), 'completed');
  assert.equal(getNextSprintPhase('completed'), null);

  assert.equal(isSprintExecutionPhase('active'), true);
  assert.equal(isSprintExecutionPhase('review'), true);
  assert.equal(isSprintExecutionPhase('dispute_window'), true);
  assert.equal(isSprintExecutionPhase('settlement'), true);
  assert.equal(isSprintExecutionPhase('planning'), false);
  assert.equal(isSprintExecutionPhase('completed'), false);
});
