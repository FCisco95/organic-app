import assert from 'node:assert/strict';
import test from 'node:test';
import { getCooldownDays, getCooldownState, formatCooldownMessage } from '@/app/api/disputes/helpers';
import type { DisputeConfig } from '@/features/disputes/types';
import { DEFAULT_DISPUTE_CONFIG } from '@/features/disputes/types';

const baseConfig: DisputeConfig = {
  ...DEFAULT_DISPUTE_CONFIG,
  dispute_cooldown_days: 3,
  dispute_dismissed_cooldown_days: 7,
  dispute_response_hours: 72,
};

// ─── getCooldownDays ────────────────────────────────────────────────────

test('getCooldownDays returns base cooldown for non-dismissed', () => {
  const result = getCooldownDays(baseConfig, 'resolved');
  assert.equal(result.cooldownDays, 3);
  assert.equal(result.isExtended, false);
});

test('getCooldownDays returns extended cooldown for dismissed', () => {
  const result = getCooldownDays(baseConfig, 'dismissed');
  assert.equal(result.cooldownDays, 7);
  assert.equal(result.isExtended, true);
});

test('getCooldownDays returns base cooldown when no status', () => {
  const result = getCooldownDays(baseConfig);
  assert.equal(result.cooldownDays, 3);
  assert.equal(result.isExtended, false);
});

test('getCooldownDays handles dismissed cooldown equal to base (not extended)', () => {
  const config = { ...baseConfig, dispute_dismissed_cooldown_days: 3 };
  const result = getCooldownDays(config, 'dismissed');
  assert.equal(result.cooldownDays, 3);
  assert.equal(result.isExtended, false);
});

// ─── getCooldownState ───────────────────────────────────────────────────

test('getCooldownState returns null for no recent dispute', () => {
  assert.equal(getCooldownState(baseConfig, null), null);
});

test('getCooldownState returns null for missing created_at', () => {
  assert.equal(getCooldownState(baseConfig, { created_at: '', status: 'resolved' }), null);
});

test('getCooldownState returns null when cooldown expired', () => {
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(getCooldownState(baseConfig, { created_at: oldDate, status: 'resolved' }), null);
});

test('getCooldownState returns cooldown info when active', () => {
  const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const result = getCooldownState(baseConfig, { created_at: recentDate, status: 'resolved' });
  assert.ok(result);
  assert.equal(result.cooldownDays, 3);
  assert.equal(result.remainingDays, 2);
  assert.equal(result.isExtended, false);
});

test('getCooldownState handles invalid date', () => {
  assert.equal(getCooldownState(baseConfig, { created_at: 'invalid', status: 'resolved' }), null);
});

// ─── formatCooldownMessage ──────────────────────────────────────────────

test('formatCooldownMessage for standard cooldown', () => {
  const msg = formatCooldownMessage({
    cooldownDays: 3,
    remainingDays: 2,
    isExtended: false,
    status: 'resolved',
  });
  assert.ok(msg.includes('3-day wait'));
  assert.ok(msg.includes('2 days remaining'));
});

test('formatCooldownMessage for dismissed extended cooldown', () => {
  const msg = formatCooldownMessage({
    cooldownDays: 7,
    remainingDays: 1,
    isExtended: true,
    status: 'dismissed',
  });
  assert.ok(msg.includes('Dismissed disputes'));
  assert.ok(msg.includes('7-day cooldown'));
  assert.ok(msg.includes('1 day remaining'));
});
