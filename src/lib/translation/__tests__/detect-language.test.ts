import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguage, mapFrancToLocale } from '../detect-language.js';

describe('detectLanguage', () => {
  it('detects English text', () => {
    const result = detectLanguage(
      'I think this proposal should increase the staking requirement for new members'
    );
    assert.equal(result, 'en');
  });

  it('detects Chinese text', () => {
    const result = detectLanguage(
      '我认为这个提案应该增加新成员的质押要求，这样可以提高社区的质量'
    );
    assert.equal(result, 'zh-CN');
  });

  it('detects Portuguese text', () => {
    const result = detectLanguage(
      'Eu acho que esta proposta deveria aumentar o requisito de staking para novos membros'
    );
    assert.equal(result, 'pt-PT');
  });

  it('returns null for very short or ambiguous text', () => {
    const result = detectLanguage('gm');
    assert.equal(result, null);
  });
});

describe('mapFrancToLocale', () => {
  it('maps ISO 639-3 codes to app locales', () => {
    assert.equal(mapFrancToLocale('eng'), 'en');
    assert.equal(mapFrancToLocale('cmn'), 'zh-CN');
    assert.equal(mapFrancToLocale('por'), 'pt-PT');
    assert.equal(mapFrancToLocale('zho'), 'zh-CN');
  });

  it('returns null for unsupported languages', () => {
    assert.equal(mapFrancToLocale('jpn'), null);
    assert.equal(mapFrancToLocale('und'), null);
  });
});
