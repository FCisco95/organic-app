import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translateRequestSchema } from '../schemas.js';

describe('translateRequestSchema', () => {
  it('accepts valid locale', () => {
    const result = translateRequestSchema.safeParse({ targetLocale: 'zh-CN' });
    assert.equal(result.success, true);
  });

  it('rejects invalid locale', () => {
    const result = translateRequestSchema.safeParse({ targetLocale: 'fr' });
    assert.equal(result.success, false);
  });

  it('rejects missing targetLocale', () => {
    const result = translateRequestSchema.safeParse({});
    assert.equal(result.success, false);
  });
});
