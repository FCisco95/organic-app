import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'fs';

/**
 * Guards the `@solana/spl-token` import surface so the
 * `bigint-buffer.toBigIntLE` advisory (GHSA-3gc7-fjrx-p6mg, allowlisted in
 * audit-ci.jsonc) stays unreachable from our code.
 *
 * See docs/audits/2026-05-16-spl-token-bigint-buffer-triage.md for the
 * full triage. Short version:
 *
 *   - @solana/spl-token@0.4.14 depends on @solana/buffer-layout-utils@0.2.0
 *     which depends on bigint-buffer@1.1.5
 *   - bigint-buffer@1.1.5 IS the latest published version — no upstream patch
 *     exists for the toBigIntLE buffer-overflow advisory
 *   - The vulnerable function is only invoked by spl-token decode helpers
 *     (e.g. unpackMint / unpackAccount / decodeMintToInstruction)
 *   - Our codebase imports spl-token in exactly one place and only for the
 *     `TOKEN_PROGRAM_ID` PublicKey constant — never for any decoder
 *
 * If a future change adds a function-call import from @solana/spl-token,
 * this test fails so we re-evaluate reachability instead of silently
 * pulling the vulnerable path into use.
 *
 * To intentionally extend the allowed import surface (e.g. add another
 * known-safe constant), update ALLOWED_SPL_TOKEN_NAMED_IMPORTS below and
 * leave a note in the audit doc explaining why the new import is safe.
 */

const ALLOWED_SPL_TOKEN_NAMED_IMPORTS = new Set<string>([
  // PublicKey constant. Verified at runtime to equal
  // TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA. Does not invoke any
  // bigint-buffer decoder.
  'TOKEN_PROGRAM_ID',
]);

// Match `import { A, B as C } from '@solana/spl-token'`. Default and
// namespace imports are not currently used and are not in the allowed
// surface — they would silently pull the full module surface in.
const NAMED_IMPORT_RE =
  /import\s*\{\s*([^}]+)\}\s*from\s*['"]@solana\/spl-token['"]/g;
const NON_NAMED_IMPORT_RE =
  /import\s+(?:\*\s+as\s+\w+|\w+)\s+from\s*['"]@solana\/spl-token['"]/g;

function parseImportedNames(rawList: string): string[] {
  return rawList
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // Handles `Foo as Bar` — the original symbol is what matters.
      const [original] = entry.split(/\s+as\s+/);
      return original.trim();
    });
}

describe('@solana/spl-token import surface stays narrow (bigint-buffer advisory)', () => {
  const files = globSync('src/**/*.{ts,tsx}', { absolute: true });

  it('finds at least one source file to scan', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('uses only named imports of allow-listed symbols', () => {
    const violations: Array<{ file: string; symbol: string }> = [];
    const wildcardOrDefault: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');

      if (NON_NAMED_IMPORT_RE.test(source)) {
        wildcardOrDefault.push(file);
      }
      NON_NAMED_IMPORT_RE.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = NAMED_IMPORT_RE.exec(source)) !== null) {
        for (const name of parseImportedNames(match[1])) {
          if (!ALLOWED_SPL_TOKEN_NAMED_IMPORTS.has(name)) {
            violations.push({ file, symbol: name });
          }
        }
      }
      NAMED_IMPORT_RE.lastIndex = 0;
    }

    expect(
      wildcardOrDefault,
      `Wildcard or default imports from @solana/spl-token are not allowed (they pull the full module surface, which includes bigint-buffer-touching decoders). Files: ${wildcardOrDefault.join(', ')}`,
    ).toEqual([]);

    expect(
      violations,
      `New @solana/spl-token symbol(s) imported outside the allow-list. ` +
        `If the new symbol is a constant that does not invoke any decoder, ` +
        `add it to ALLOWED_SPL_TOKEN_NAMED_IMPORTS and document why in ` +
        `docs/audits/2026-05-16-spl-token-bigint-buffer-triage.md. ` +
        `If it is a function or class with decode behavior, the ` +
        `bigint-buffer advisory (GHSA-3gc7-fjrx-p6mg) becomes reachable ` +
        `and must be re-triaged before merge. ` +
        `Violations: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });
});
