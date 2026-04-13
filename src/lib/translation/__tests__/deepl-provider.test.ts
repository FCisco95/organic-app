import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALE_TO_DEEPL, DEEPL_TO_LOCALE } from '../types.js';

describe('translation locale mapping', () => {
  it('maps all app locales to DeepL codes', () => {
    assert.equal(LOCALE_TO_DEEPL['en'], 'EN');
    assert.equal(LOCALE_TO_DEEPL['pt-PT'], 'PT-PT');
    assert.equal(LOCALE_TO_DEEPL['zh-CN'], 'ZH-HANS');
  });

  it('maps DeepL response codes back to app locales', () => {
    assert.equal(DEEPL_TO_LOCALE['EN'], 'en');
    assert.equal(DEEPL_TO_LOCALE['PT'], 'pt-PT');
    assert.equal(DEEPL_TO_LOCALE['PT-PT'], 'pt-PT');
    assert.equal(DEEPL_TO_LOCALE['ZH'], 'zh-CN');
    assert.equal(DEEPL_TO_LOCALE['ZH-HANS'], 'zh-CN');
  });
});
