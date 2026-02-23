import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTokenThreshold,
  checkMaxLiveProposals,
  checkCooldownPeriod,
  isPrivilegedRole,
} from '../anti-abuse';

// ── Token threshold checks ──────────────────────────────────────────

test('threshold: passes when threshold is 0', () => {
  const result = checkTokenThreshold({ threshold: 0, walletPubkey: null, balance: null });
  assert.equal(result.ok, true);
});

test('threshold: fails when wallet not linked and threshold > 0', () => {
  const result = checkTokenThreshold({ threshold: 100, walletPubkey: null, balance: null });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'no_wallet');
    assert.equal(result.required, 100);
  }
});

test('threshold: fails when balance is below threshold', () => {
  const result = checkTokenThreshold({ threshold: 100, walletPubkey: 'abc123', balance: 50 });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'insufficient_balance');
    assert.equal(result.required, 100);
    assert.equal(result.current, 50);
  }
});

test('threshold: passes when balance meets threshold exactly', () => {
  const result = checkTokenThreshold({ threshold: 100, walletPubkey: 'abc123', balance: 100 });
  assert.equal(result.ok, true);
});

test('threshold: passes when balance exceeds threshold', () => {
  const result = checkTokenThreshold({ threshold: 100, walletPubkey: 'abc123', balance: 500 });
  assert.equal(result.ok, true);
});

test('threshold: treats null balance as 0', () => {
  const result = checkTokenThreshold({ threshold: 100, walletPubkey: 'abc123', balance: null });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.current, 0);
});

// ── Max live proposals checks ───────────────────────────────────────

test('max-live: passes when count is below limit', () => {
  const result = checkMaxLiveProposals(0, 1);
  assert.equal(result.ok, true);
});

test('max-live: fails when count equals limit', () => {
  const result = checkMaxLiveProposals(1, 1);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.activeCount, 1);
    assert.equal(result.maxAllowed, 1);
  }
});

test('max-live: fails when count exceeds limit', () => {
  const result = checkMaxLiveProposals(3, 2);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.activeCount, 3);
    assert.equal(result.maxAllowed, 2);
  }
});

test('max-live: passes with higher limit', () => {
  const result = checkMaxLiveProposals(2, 5);
  assert.equal(result.ok, true);
});

// ── Cooldown period checks ──────────────────────────────────────────

test('cooldown: passes when cooldown is 0 days', () => {
  const result = checkCooldownPeriod(new Date(), 0);
  assert.equal(result.ok, true);
});

test('cooldown: passes when no previous proposal exists', () => {
  const result = checkCooldownPeriod(null, 7);
  assert.equal(result.ok, true);
});

test('cooldown: fails when within cooldown period', () => {
  const now = new Date('2026-02-23T12:00:00Z');
  const lastCreated = new Date('2026-02-20T12:00:00Z'); // 3 days ago
  const result = checkCooldownPeriod(lastCreated, 7, now);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.cooldownDays, 7);
    assert.equal(result.remainingDays, 4); // 7 - 3 = 4 days remaining
  }
});

test('cooldown: passes when cooldown has expired', () => {
  const now = new Date('2026-02-23T12:00:00Z');
  const lastCreated = new Date('2026-02-10T12:00:00Z'); // 13 days ago
  const result = checkCooldownPeriod(lastCreated, 7, now);
  assert.equal(result.ok, true);
});

test('cooldown: passes at the exact boundary', () => {
  const now = new Date('2026-02-27T12:00:00Z');
  const lastCreated = new Date('2026-02-20T12:00:00Z'); // exactly 7 days ago
  const result = checkCooldownPeriod(lastCreated, 7, now);
  assert.equal(result.ok, true);
});

test('cooldown: 1 day remaining rounds up correctly', () => {
  const now = new Date('2026-02-26T18:00:00Z');
  const lastCreated = new Date('2026-02-20T12:00:00Z'); // 6.25 days ago, 0.75 days left
  const result = checkCooldownPeriod(lastCreated, 7, now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.remainingDays, 1);
});

// ── Admin bypass ────────────────────────────────────────────────────

test('admin role is privileged', () => {
  assert.equal(isPrivilegedRole('admin'), true);
});

test('council role is privileged', () => {
  assert.equal(isPrivilegedRole('council'), true);
});

test('member role is not privileged', () => {
  assert.equal(isPrivilegedRole('member'), false);
});

test('null role is not privileged', () => {
  assert.equal(isPrivilegedRole(null), false);
});
