import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EasterEggBadge } from '../easter-egg-badge';

describe('EasterEggBadge', () => {
  it('returns null when count is 0', () => {
    assert.equal(EasterEggBadge({ count: 0 }), null);
  });

  it('returns null when count is undefined', () => {
    assert.equal(EasterEggBadge({ count: undefined }), null);
  });

  it('returns null when count is null', () => {
    assert.equal(EasterEggBadge({ count: null }), null);
  });

  it('returns null when count is negative', () => {
    assert.equal(EasterEggBadge({ count: -1 }), null);
  });
});
