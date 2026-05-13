#!/usr/bin/env tsx
/**
 * i18n Audit Script
 *
 * Scans source code for translation key usage and compares against
 * the JSON translation files. Reports missing, orphaned, and
 * out-of-sync keys across all locales.
 *
 * Usage:
 *   npx tsx scripts/i18n-audit.ts          # report only
 *   npx tsx scripts/i18n-audit.ts --fix    # auto-stub missing keys
 *   npx tsx scripts/i18n-audit.ts --ci     # exit 1 if gaps found
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');
const SRC_DIR = path.join(ROOT, 'src');

const LOCALES = ['en', 'zh-CN', 'pt-PT'] as const;
const PRIMARY_LOCALE = 'en';

const flags = {
  fix: process.argv.includes('--fix'),
  ci: process.argv.includes('--ci'),
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Flatten a nested object into dot-notation keys */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flattenObject(
        value as Record<string, unknown>,
        fullKey
      )) {
        result.set(k, v);
      }
    } else {
      result.set(fullKey, String(value));
    }
  }
  return result;
}

/** Set a deeply nested key on an object, creating intermediary objects */
function deepSet(
  obj: Record<string, unknown>,
  dotPath: string,
  value: string
): void {
  const parts = dotPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (
      current[p] === undefined ||
      current[p] === null ||
      typeof current[p] !== 'object'
    ) {
      current[p] = {};
    }
    current = current[p] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/** Remove a deeply nested key */
function deepDelete(obj: Record<string, unknown>, dotPath: string): void {
  const parts = dotPath.split('.');
  let current: Record<string, unknown> = obj;
  const stack: { obj: Record<string, unknown>; key: string }[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (
      current[p] === undefined ||
      typeof current[p] !== 'object' ||
      current[p] === null
    ) {
      return;
    }
    stack.push({ obj: current, key: p });
    current = current[p] as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]];
  // Clean up empty parent objects
  for (let i = stack.length - 1; i >= 0; i--) {
    const parent = stack[i];
    const child = parent.obj[parent.key] as Record<string, unknown>;
    if (Object.keys(child).length === 0) {
      delete parent.obj[parent.key];
    } else {
      break;
    }
  }
}

/** Recursively collect .ts/.tsx files */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Validation ──────────────────────────────────────────────────────

/** Check if a string looks like a valid translation key (not SQL, import path, etc.) */
function isValidTranslationKey(key: string): boolean {
  // Must be non-empty
  if (!key || key.length === 0) return false;
  // Reject SQL-like: contains commas, asterisks, or parentheses
  if (/[,*()!]/.test(key)) return false;
  // Reject import paths: starts with @ . / or contains /
  if (/^[@./]/.test(key) || key.includes('/')) return false;
  // Reject if contains spaces (translation keys are camelCase or dot.separated)
  if (/\s/.test(key)) return false;
  // Reject CSS selectors and DOM attributes
  if (/[\[\]=<>{}#?&]/.test(key)) return false;
  // Must look like a valid key: alphanumeric, dots, underscores, hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) return false;
  return true;
}

// ── Key Extraction ──────────────────────────────────────────────────

/**
 * Extract translation keys from source files.
 * Handles:
 *   - useTranslations('Section') → t('key') = Section.key
 *   - const tFoo = useTranslations('Foo') → tFoo('bar') = Foo.bar
 *   - getTranslations('Section') and await patterns
 */
function extractKeysFromSource(files: string[]): Set<string> {
  const keys = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // Build a map of variable name → namespace for this file
    const varMap = new Map<string, string>();

    // Match: useTranslations('Namespace') or getTranslations('Namespace')
    // Captures the variable name on the left side of assignment
    const hookPattern =
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = hookPattern.exec(content)) !== null) {
      varMap.set(match[1], match[2]);
    }

    // Also handle: useTranslations('Namespace') without assignment (implicit `t`)
    const implicitPattern =
      /(?:const|let|var)\s+t\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = implicitPattern.exec(content)) !== null) {
      varMap.set('t', match[1]);
    }

    // For each variable mapped to a namespace, find all calls like varName('key')
    for (const [varName, namespace] of varMap) {
      // Escape the variable name for regex
      const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Only match varName( immediately — not varName.something( (except .rich/.raw/.markup)
      // This avoids matching e.g. t.push(), t.filter(), etc.
      const callPattern = new RegExp(
        `(?<![.\\w])${escaped}\\(\\s*['"]([^'"]+)['"]`,
        'g'
      );
      while ((match = callPattern.exec(content)) !== null) {
        const key = match[1];
        // Filter out false positives: SQL columns, import paths, URLs, etc.
        if (isValidTranslationKey(key)) {
          keys.add(`${namespace}.${key}`);
        }
      }

      // Also handle t.rich('key', ...) and t.raw('key')
      const richPattern = new RegExp(
        `${escaped}\\.(?:rich|raw|markup)\\(\\s*['"]([^'"]+)['"]`,
        'g'
      );
      while ((match = richPattern.exec(content)) !== null) {
        const key = match[1];
        if (isValidTranslationKey(key)) {
          keys.add(`${namespace}.${key}`);
        }
      }
    }

    // Handle useTranslations('Namespace') where result is destructured or used inline
    // e.g., {useTranslations('Foo')('key')}
    const inlinePattern =
      /useTranslations\(\s*['"]([^'"]+)['"]\s*\)\(\s*['"]([^'"]+)['"]/g;
    while ((match = inlinePattern.exec(content)) !== null) {
      keys.add(`${match[1]}.${match[2]}`);
    }
  }

  return keys;
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 i18n Audit\n');

  // Load all locale files
  const localeData: Record<string, Record<string, unknown>> = {};
  const flatMaps: Record<string, Map<string, string>> = {};

  for (const locale of LOCALES) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    localeData[locale] = raw;
    flatMaps[locale] = flattenObject(raw);
  }

  const enKeys = flatMaps[PRIMARY_LOCALE];

  // Scan source code
  const sourceFiles = collectTsFiles(SRC_DIR);
  const usedKeys = extractKeysFromSource(sourceFiles);

  console.log(`  Source files scanned: ${sourceFiles.length}`);
  console.log(`  Keys used in code:    ${usedKeys.size}`);
  console.log(`  Keys in en.json:      ${enKeys.size}\n`);

  // ── Analysis ────────────────────────────────────────────────

  // 1. Keys used in code but missing from en.json
  const missingFromEn: string[] = [];
  for (const key of usedKeys) {
    if (!enKeys.has(key)) {
      missingFromEn.push(key);
    }
  }
  missingFromEn.sort();

  // 2. Keys in en.json missing from other locales
  const missingFromLocales: Record<string, string[]> = {};
  for (const locale of LOCALES) {
    if (locale === PRIMARY_LOCALE) continue;
    const missing: string[] = [];
    for (const key of enKeys.keys()) {
      if (!flatMaps[locale].has(key)) {
        missing.push(key);
      }
    }
    missing.sort();
    missingFromLocales[locale] = missing;
  }

  // 3. Orphan keys in non-primary locales
  const orphanKeys: Record<string, string[]> = {};
  for (const locale of LOCALES) {
    if (locale === PRIMARY_LOCALE) continue;
    const orphans: string[] = [];
    for (const key of flatMaps[locale].keys()) {
      if (!enKeys.has(key)) {
        orphans.push(key);
      }
    }
    orphans.sort();
    orphanKeys[locale] = orphans;
  }

  // ── Report ──────────────────────────────────────────────────

  let hasGaps = false;

  if (missingFromEn.length > 0) {
    hasGaps = true;
    console.log(
      `❌ ${missingFromEn.length} keys used in code but MISSING from en.json:`
    );
    for (const key of missingFromEn) {
      console.log(`   - ${key}`);
    }
    console.log();
  } else {
    console.log('✅ All code-referenced keys exist in en.json\n');
  }

  for (const locale of LOCALES) {
    if (locale === PRIMARY_LOCALE) continue;
    const missing = missingFromLocales[locale];
    if (missing.length > 0) {
      hasGaps = true;
      console.log(
        `❌ ${missing.length} keys in en.json missing from ${locale}.json:`
      );
      // Show first 20 for brevity
      for (const key of missing.slice(0, 20)) {
        console.log(`   - ${key}`);
      }
      if (missing.length > 20) {
        console.log(`   ... and ${missing.length - 20} more`);
      }
      console.log();
    } else {
      console.log(`✅ ${locale}.json is in sync with en.json\n`);
    }
  }

  for (const locale of LOCALES) {
    if (locale === PRIMARY_LOCALE) continue;
    const orphans = orphanKeys[locale];
    if (orphans.length > 0) {
      hasGaps = true;
      console.log(`🗑  ${orphans.length} orphan keys in ${locale}.json:`);
      for (const key of orphans) {
        console.log(`   - ${key}`);
      }
      console.log();
    } else {
      console.log(`✅ No orphan keys in ${locale}.json\n`);
    }
  }

  // ── Fix Mode ────────────────────────────────────────────────

  if (flags.fix) {
    console.log('🔧 Fix mode: applying changes...\n');

    // 1. Stub missing keys in en.json
    if (missingFromEn.length > 0) {
      for (const key of missingFromEn) {
        const lastPart = key.split('.').pop() || key;
        // Convert camelCase/PascalCase to spaced words for a readable stub
        const stub = lastPart
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        deepSet(localeData[PRIMARY_LOCALE], key, stub);
      }
      console.log(`  Added ${missingFromEn.length} stubs to en.json`);
    }

    // Reload en flat map after stubs
    const updatedEnFlat = flattenObject(localeData[PRIMARY_LOCALE]);

    // 2. Copy missing keys from en to other locales
    for (const locale of LOCALES) {
      if (locale === PRIMARY_LOCALE) continue;
      // Also include any newly-stubbed keys
      let addedCount = 0;
      for (const key of updatedEnFlat.keys()) {
        if (!flatMaps[locale].has(key)) {
          deepSet(localeData[locale], key, updatedEnFlat.get(key)!);
          addedCount++;
        }
      }
      if (addedCount > 0) {
        console.log(`  Added ${addedCount} keys to ${locale}.json`);
      }
    }

    // 3. Remove orphan keys
    for (const locale of LOCALES) {
      if (locale === PRIMARY_LOCALE) continue;
      const orphans = orphanKeys[locale];
      if (orphans.length > 0) {
        for (const key of orphans) {
          deepDelete(localeData[locale], key);
        }
        console.log(
          `  Removed ${orphans.length} orphan keys from ${locale}.json`
        );
      }
    }

    // Write all files
    for (const locale of LOCALES) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      fs.writeFileSync(
        filePath,
        JSON.stringify(localeData[locale], null, 2) + '\n'
      );
      console.log(`  Wrote ${filePath}`);
    }

    console.log('\n✅ Fix complete. Run again without --fix to verify.\n');
  }

  // ── CI Mode ─────────────────────────────────────────────────

  if (flags.ci && hasGaps) {
    console.log('💥 CI check failed: translation gaps found.');
    process.exit(1);
  }

  if (!hasGaps) {
    console.log('🎉 All translations are in sync!');
  }
}

main();
