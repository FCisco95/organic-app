import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSettlementBlockers,
  parseRewardSettlementResult,
} from '@/features/sprints/settlement-blockers';

// ─── parseSettlementBlockers ────────────────────────────────────────────

test('parseSettlementBlockers returns defaults for null input', () => {
  const result = parseSettlementBlockers(null);
  assert.deepEqual(result, {
    blocked: false,
    unresolved_disputes: 0,
    pending_submissions: 0,
    integrity_flag_count: 0,
    integrity_flags: [],
    reasons: [],
  });
});

test('parseSettlementBlockers returns defaults for undefined input', () => {
  const result = parseSettlementBlockers(undefined);
  assert.equal(result.blocked, false);
  assert.equal(result.unresolved_disputes, 0);
});

test('parseSettlementBlockers parses blocked state', () => {
  const result = parseSettlementBlockers({
    blocked: true,
    unresolved_disputes: 2,
    integrity_flag_count: 1,
    integrity_flags: [{ type: 'duplicate' }],
    reasons: ['2 unresolved dispute(s)', 'unresolved integrity flags are present'],
  });

  assert.equal(result.blocked, true);
  assert.equal(result.unresolved_disputes, 2);
  assert.equal(result.integrity_flag_count, 1);
  assert.equal(result.integrity_flags.length, 1);
  assert.equal(result.reasons.length, 2);
});

test('parseSettlementBlockers infers flag count from array when not provided', () => {
  const result = parseSettlementBlockers({
    integrity_flags: [{ a: 1 }, { b: 2 }],
  });
  assert.equal(result.integrity_flag_count, 2);
});

test('parseSettlementBlockers handles non-array reasons gracefully', () => {
  const result = parseSettlementBlockers({ reasons: 'not an array' });
  assert.deepEqual(result.reasons, []);
});

// ─── parseRewardSettlementResult ────────────────────────────────────────

test('parseRewardSettlementResult returns defaults for null input', () => {
  const result = parseRewardSettlementResult(null);
  assert.equal(result.ok, false);
  assert.equal(result.code, '');
  assert.equal(result.status, 'pending');
  assert.equal(result.message, null);
  assert.equal(result.distributed_count, 0);
  assert.equal(result.distributed_tokens, 0);
});

test('parseRewardSettlementResult parses committed result', () => {
  const result = parseRewardSettlementResult({
    ok: true,
    code: 'settlement_committed',
    status: 'committed',
    message: 'All rewards distributed',
    idempotency_key: 'abc-123',
    distributed_count: 5,
    distributed_tokens: 1000,
    emission_cap: 2000,
    carryover_out: 500,
    carryover_streak: 2,
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, 'settlement_committed');
  assert.equal(result.status, 'committed');
  assert.equal(result.message, 'All rewards distributed');
  assert.equal(result.idempotency_key, 'abc-123');
  assert.equal(result.distributed_count, 5);
  assert.equal(result.distributed_tokens, 1000);
  assert.equal(result.emission_cap, 2000);
  assert.equal(result.carryover_out, 500);
  assert.equal(result.carryover_streak, 2);
});
