import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySettlementIntegrity,
  computeCarryoverIn,
  computeCarryoverOut,
  computeEmissionCap,
  DEFAULT_SETTLEMENT_EMISSION_PERCENT,
  DEFAULT_SETTLEMENT_FIXED_CAP,
  MAX_SETTLEMENT_CARRYOVER_SPRINTS,
  normalizeRewardSettlementPolicy,
} from '@/features/rewards/settlement';

test('normalizes settlement policy defaults and bounds', () => {
  const defaults = normalizeRewardSettlementPolicy(null);
  assert.equal(defaults.emissionPercent, DEFAULT_SETTLEMENT_EMISSION_PERCENT);
  assert.equal(defaults.fixedCapPerSprint, DEFAULT_SETTLEMENT_FIXED_CAP);
  assert.equal(defaults.carryoverSprintCap, MAX_SETTLEMENT_CARRYOVER_SPRINTS);

  const bounded = normalizeRewardSettlementPolicy({
    settlement_emission_percent: '1.2',
    settlement_fixed_cap_per_sprint: -1,
    settlement_carryover_sprint_cap: 9,
  });

  assert.equal(bounded.emissionPercent, DEFAULT_SETTLEMENT_EMISSION_PERCENT);
  assert.equal(bounded.fixedCapPerSprint, DEFAULT_SETTLEMENT_FIXED_CAP);
  assert.equal(bounded.carryoverSprintCap, MAX_SETTLEMENT_CARRYOVER_SPRINTS);
});

test('computes emission cap as min(percent of treasury, fixed cap)', () => {
  const policy = normalizeRewardSettlementPolicy({
    settlement_emission_percent: 0.01,
    settlement_fixed_cap_per_sprint: 100,
    settlement_carryover_sprint_cap: 3,
  });

  assert.equal(computeEmissionCap(50_000, policy), 100);
  assert.equal(computeEmissionCap(5_000, policy), 50);
});

test('carryover respects carryover streak cap', () => {
  assert.equal(
    computeCarryoverIn({
      previousCarryoverAmount: 42,
      previousCarryoverStreak: 2,
      carryoverSprintCap: 3,
    }),
    42
  );

  assert.equal(
    computeCarryoverIn({
      previousCarryoverAmount: 42,
      previousCarryoverStreak: 3,
      carryoverSprintCap: 3,
    }),
    0
  );
});

test('carryover out increments streak and resets when fully distributed', () => {
  assert.deepEqual(
    computeCarryoverOut({
      emissionCap: 100,
      distributedTokens: 40,
      previousCarryoverStreak: 1,
      carryoverSprintCap: 3,
    }),
    { carryoverOut: 60, carryoverStreak: 2 }
  );

  assert.deepEqual(
    computeCarryoverOut({
      emissionCap: 100,
      distributedTokens: 100,
      previousCarryoverStreak: 2,
      carryoverSprintCap: 3,
    }),
    { carryoverOut: 0, carryoverStreak: 0 }
  );
});

test('classifies integrity holds for negative or cap-breaching pools', () => {
  assert.deepEqual(
    classifySettlementIntegrity({ requestedPool: -1, emissionCap: 10 }),
    { blocked: true, reason: 'negative reward pool is not allowed' }
  );

  assert.deepEqual(
    classifySettlementIntegrity({ requestedPool: 11, emissionCap: 10 }),
    { blocked: true, reason: 'reward pool exceeds emission cap' }
  );

  assert.deepEqual(
    classifySettlementIntegrity({ requestedPool: 10, emissionCap: 10 }),
    { blocked: false, reason: null }
  );
});
