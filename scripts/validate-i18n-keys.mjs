#!/usr/bin/env node
//
// Validates that all locale files have the same set of keys.
// Fails CI if any locale is missing a key present in the reference (en).
//
// Run: node scripts/validate-i18n-keys.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(__dirname, '..', 'messages');

const LOCALES = ['en', 'pt-PT', 'zh-CN'];
const REFERENCE = 'en';

function flatten(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const value = obj[k];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flatten(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function loadLocale(locale) {
  const file = join(messagesDir, `${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

const referenceKeys = new Set(flatten(loadLocale(REFERENCE)));
let hasError = false;

for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;

  const localeKeys = new Set(flatten(loadLocale(locale)));
  const missing = [...referenceKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !referenceKeys.has(k));

  if (missing.length > 0) {
    hasError = true;
    console.error(`\n❌ ${locale} is missing ${missing.length} keys present in ${REFERENCE}:`);
    for (const k of missing) console.error(`   - ${k}`);
  }

  if (extra.length > 0) {
    console.warn(`\n⚠️  ${locale} has ${extra.length} keys not in ${REFERENCE} (orphaned):`);
    for (const k of extra) console.warn(`   - ${k}`);
  }
}

if (hasError) {
  console.error('\nFix: add the missing keys to the listed locale files.');
  process.exit(1);
}

console.log(`✅ All ${LOCALES.length} locales have the same ${referenceKeys.size} keys.`);
