import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PAYOUT_CONFIG,
  commentScoreToXp,
  computePayout,
  computeRankDecay,
  computeWaveMultiplier,
  distributeSprintBonus,
  resolvePayoutConfig,
} from '../payout-math';

test('rank decay returns configured multipliers for known ranks', () => {
  assert.equal(computeRankDecay(1), 1.0);
  assert.equal(computeRankDecay(2), 0.5);
  assert.equal(computeRankDecay(3), 0.1);
});

test('rank decay falls back to default beyond configured length', () => {
  assert.equal(computeRankDecay(4), DEFAULT_PAYOUT_CONFIG.defaultMultiplierBeyondRank);
  assert.equal(computeRankDecay(100), DEFAULT_PAYOUT_CONFIG.defaultMultiplierBeyondRank);
});

test('rank decay rejects non-positive ranks', () => {
  assert.throws(() => computeRankDecay(0));
  assert.throws(() => computeRankDecay(-5));
});

test('wave multiplier uses tightest matching tier', () => {
  const posted = new Date('2026-04-24T12:00:00Z');
  // 10 minutes after → 1.3x (within 60-min tier)
  assert.equal(computeWaveMultiplier(posted, new Date('2026-04-24T12:10:00Z')), 1.3);
  // 2 hours after → 1.1x (within 360-min tier, not 60-min)
  assert.equal(computeWaveMultiplier(posted, new Date('2026-04-24T14:00:00Z')), 1.1);
  // 10 hours after → 1.0x (no tier matches)
  assert.equal(computeWaveMultiplier(posted, new Date('2026-04-24T22:00:00Z')), 1.0);
});

test('wave multiplier handles tier boundaries inclusively', () => {
  const posted = new Date('2026-04-24T12:00:00Z');
  // Exactly 60 min → still inside 1.3x tier (≤ 60)
  assert.equal(computeWaveMultiplier(posted, new Date('2026-04-24T13:00:00Z')), 1.3);
  // Exactly 360 min → inside 1.1x tier (≤ 360)
  assert.equal(computeWaveMultiplier(posted, new Date('2026-04-24T18:00:00Z')), 1.1);
});

test('wave multiplier defaults to 1.0 when engaged before posted (clock skew)', () => {
  const posted = new Date('2026-04-24T12:00:00Z');
  const engaged = new Date('2026-04-24T11:55:00Z');
  assert.equal(computeWaveMultiplier(posted, engaged), 1.0);
});

test('comment score to XP maps per config table', () => {
  assert.equal(commentScoreToXp(5), 10);
  assert.equal(commentScoreToXp(4), 8);
  assert.equal(commentScoreToXp(3), 5);
  assert.equal(commentScoreToXp(2), 2);
  assert.equal(commentScoreToXp(1), 0);
  assert.equal(commentScoreToXp(0), 0);
  assert.equal(commentScoreToXp(6), 0);
  assert.equal(commentScoreToXp(Number.NaN), 0);
});

test('computePayout for a like at rank 1 within 1h → base × 1.0 × 1.3', () => {
  const posted = '2026-04-24T12:00:00Z';
  const engaged = '2026-04-24T12:30:00Z';
  const breakdown = computePayout({ engagementType: 'like', rank: 1, postedAt: posted, engagedAt: engaged });
  assert.equal(breakdown.baseXp, 1);
  assert.equal(breakdown.rankDecay, 1.0);
  assert.equal(breakdown.waveMultiplier, 1.3);
  assert.equal(breakdown.xpAwarded, 1); // round(1 × 1.0 × 1.3) = 1
});

test('computePayout for a retweet at rank 2 within 6h → 3 × 0.5 × 1.1', () => {
  const posted = '2026-04-24T12:00:00Z';
  const engaged = '2026-04-24T14:00:00Z';
  const breakdown = computePayout({ engagementType: 'retweet', rank: 2, postedAt: posted, engagedAt: engaged });
  assert.equal(breakdown.baseXp, 3);
  assert.equal(breakdown.rankDecay, 0.5);
  assert.equal(breakdown.waveMultiplier, 1.1);
  // round(3 × 0.5 × 1.1) = round(1.65) = 2
  assert.equal(breakdown.xpAwarded, 2);
});

test('computePayout for a 5-scored comment at rank 1 within 1h → 10 × 1.0 × 1.3', () => {
  const posted = '2026-04-24T12:00:00Z';
  const engaged = '2026-04-24T12:15:00Z';
  const breakdown = computePayout({
    engagementType: 'comment',
    rank: 1,
    postedAt: posted,
    engagedAt: engaged,
    commentScore: 5,
  });
  assert.equal(breakdown.baseXp, 10);
  // round(10 × 1.0 × 1.3) = 13
  assert.equal(breakdown.xpAwarded, 13);
});

test('computePayout for low-score comment at rank 4+ floors to 0', () => {
  const posted = '2026-04-24T12:00:00Z';
  const engaged = '2026-04-24T12:30:00Z';
  const breakdown = computePayout({
    engagementType: 'comment',
    rank: 10,
    postedAt: posted,
    engagedAt: engaged,
    commentScore: 1,
  });
  assert.equal(breakdown.xpAwarded, 0);
});

test('distributeSprintBonus returns empty for zero pool', () => {
  const result = distributeSprintBonus(0, { a: 10, b: 5 }, 10);
  assert.deepEqual(result, {});
});

test('distributeSprintBonus splits proportionally and conserves total', () => {
  const result = distributeSprintBonus(100, { a: 30, b: 20, c: 10 }, 10);
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  assert.equal(total, 100);
  // alice got the most
  assert.ok((result.a ?? 0) > (result.b ?? 0));
  assert.ok((result.b ?? 0) > (result.c ?? 0));
});

test('distributeSprintBonus respects top-N cap', () => {
  const result = distributeSprintBonus(100, { a: 10, b: 9, c: 8, d: 7, e: 6 }, 2);
  assert.equal(Object.keys(result).length, 2);
  assert.ok(result.a !== undefined);
  assert.ok(result.b !== undefined);
  assert.equal(result.c, undefined);
});

test('distributeSprintBonus excludes zero-score users', () => {
  const result = distributeSprintBonus(50, { a: 10, b: 0, c: 5 }, 10);
  assert.equal(result.b, undefined);
  assert.equal(Object.values(result).reduce((s, v) => s + v, 0), 50);
});

test('resolvePayoutConfig falls back to defaults on empty/malformed input', () => {
  const cfg = resolvePayoutConfig(null);
  assert.equal(cfg.likeBaseXp, DEFAULT_PAYOUT_CONFIG.likeBaseXp);
  assert.equal(cfg.retweetBaseXp, DEFAULT_PAYOUT_CONFIG.retweetBaseXp);
});

test('resolvePayoutConfig respects valid overrides', () => {
  const cfg = resolvePayoutConfig({
    like_base_xp: 2,
    retweet_base_xp: 5,
    wave_multipliers: [{ maxAgeMinutes: 30, multiplier: 2.0 }],
    rank_decay: [1.0, 0.25],
  });
  assert.equal(cfg.likeBaseXp, 2);
  assert.equal(cfg.retweetBaseXp, 5);
  assert.equal(cfg.waveMultipliers.length, 1);
  assert.equal(cfg.rankDecay[1], 0.25);
});
