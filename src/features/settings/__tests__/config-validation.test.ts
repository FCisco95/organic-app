import assert from 'node:assert/strict';
import test from 'node:test';
import { settingsPatchSchema } from '@/features/settings/schemas';

test('settingsPatchSchema requires reason', () => {
  const result = settingsPatchSchema.safeParse({
    default_sprint_capacity: 200,
  });

  assert.equal(result.success, false);
});

test('settingsPatchSchema rejects payload with only reason', () => {
  const result = settingsPatchSchema.safeParse({
    reason: 'Updating settings for governance policy changes',
  });

  assert.equal(result.success, false);
});

test('settingsPatchSchema accepts valid reason and policy knobs', () => {
  const result = settingsPatchSchema.safeParse({
    reason: 'Adjusting governance and settlement policy for next sprint.',
    quorum_percentage: 8,
    governance_policy: {
      qualification_threshold_percent: 6,
      anti_spam_min_hours_between_proposals: 24,
      override_ttl_days: 7,
      override_requires_council_review: true,
    },
    sprint_policy: {
      dispute_window_hours: 48,
      reviewer_sla_hours: 72,
      reviewer_sla_extension_hours: 24,
    },
    rewards_config: {
      enabled: true,
      points_to_token_rate: 100,
      min_claim_threshold: 500,
      default_epoch_pool: 0,
      claim_requires_wallet: true,
      settlement_emission_percent: 0.01,
      settlement_fixed_cap_per_sprint: 10000,
      settlement_carryover_sprint_cap: 3,
      treasury_balance_for_emission: 500,
    },
  });

  assert.equal(result.success, true);
});

test('settingsPatchSchema rejects invalid settlement emission percent', () => {
  const result = settingsPatchSchema.safeParse({
    reason: 'Trying invalid settlement value for validation coverage.',
    rewards_config: {
      enabled: true,
      points_to_token_rate: 100,
      min_claim_threshold: 500,
      default_epoch_pool: 0,
      claim_requires_wallet: true,
      settlement_emission_percent: 2,
      settlement_fixed_cap_per_sprint: 10000,
      settlement_carryover_sprint_cap: 3,
      treasury_balance_for_emission: 500,
    },
  });

  assert.equal(result.success, false);
});
