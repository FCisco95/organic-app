import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EasterEggBadge } from '../easter-egg-badge';

describe('EasterEggBadge', () => {
  it('returns null when elements is undefined', () => {
    assert.equal(EasterEggBadge({ elements: undefined }), null);
  });

  it('returns null when elements is null', () => {
    assert.equal(EasterEggBadge({ elements: null }), null);
  });

  it('returns null when elements is an empty array', () => {
    assert.equal(EasterEggBadge({ elements: [] }), null);
  });
});
