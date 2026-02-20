import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeVotingSchema, startVotingSchema } from '../schemas';

test('startVotingSchema accepts explicit snapshot holders', () => {
  const parsed = startVotingSchema.safeParse({
    voting_duration_days: 3,
    snapshot_holders: [
      { address: 'wallet-a', balance: 10 },
      { wallet_pubkey: 'wallet-b', balance_ui: 2.5 },
    ],
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.snapshot_holders?.length, 2);
    assert.equal(parsed.data.voting_duration_days, 3);
  }
});

test('finalizeVotingSchema supports dedupe key and debug fail mode', () => {
  const parsed = finalizeVotingSchema.safeParse({
    force: true,
    dedupe_key: 'proposal:abc:finalize',
    test_fail_mode: 'once',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.force, true);
    assert.equal(parsed.data.dedupe_key, 'proposal:abc:finalize');
    assert.equal(parsed.data.test_fail_mode, 'once');
  }
});

test('finalizeVotingSchema rejects invalid debug fail mode', () => {
  const parsed = finalizeVotingSchema.safeParse({
    force: true,
    test_fail_mode: 'invalid',
  });

  assert.equal(parsed.success, false);
});
