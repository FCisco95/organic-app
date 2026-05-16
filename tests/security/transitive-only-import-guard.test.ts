import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'fs';
import path from 'node:path';

/**
 * Structural invariant: a set of packages reach our lockfile only through
 * deeply transitive paths in wallet / OAuth SDKs, and their security history
 * is checkered enough that we've explicitly written down "reachability is
 * structural-zero" as the reason CI ignores their advisories. That claim
 * holds only as long as our app code never imports them directly.
 *
 * This test fails if anyone in `src/` introduces an `import` (or `require`)
 * of a packaged listed in TRANSITIVE_ONLY_PACKAGES. The fix is one of:
 *
 *   1. Don't import it. There is almost always a maintained, smaller, or
 *      built-in alternative (e.g. native fetch instead of axios, structured
 *      clone instead of lodash.cloneDeep).
 *   2. If the import is intentional and necessary, promote the package to a
 *      direct dependency in package.json (so it shows up in supply-chain
 *      tooling under your ownership) AND re-triage every related advisory
 *      in audit-ci.jsonc — the "transitive-only, unreachable" justification
 *      no longer applies. Remove the package from TRANSITIVE_ONLY_PACKAGES
 *      below and update this test's docstring with the rationale.
 *
 * Companion to tests/security/spl-token-import-surface.test.ts which guards
 * the narrower allow-listed import surface for @solana/spl-token (where the
 * package IS a direct dep but only the constant-import shape is safe).
 *
 * Related audits:
 *   - docs/audits/2026-05-15-security-sweep.md
 *   - docs/audits/2026-05-16-spl-token-bigint-buffer-triage.md
 *   - audit-ci.jsonc allowlist entries for axios / lodash / protobufjs
 *     chains (transitive via @solana/wallet-adapter-wallets and the Trezor
 *     wallet adapter chain).
 */

const TRANSITIVE_ONLY_PACKAGES = [
  // Reached via @solana/wallet-adapter-wallets > ... > @stellar/stellar-sdk.
  // Multiple high advisories on the 1.x line (prototype pollution gadgets,
  // NO_PROXY bypass, header injection).
  'axios',

  // Reached via @walletconnect/universal-provider. Code injection via
  // _.template historically; we have native ES features for everything
  // lodash typically offers.
  'lodash',
  // Submodule imports (lodash/get, lodash/merge, lodash.cloneDeep, etc.)
  // share the same supply-chain surface — guard them as a prefix below.

  // Reached via the Trezor wallet adapter chain. Multiple advisories on
  // the 6.x/7.x lines.
  'protobufjs',
] as const;

// Submodule-import prefixes that also count as a direct hit on the base
// package (e.g. `import get from 'lodash/get'`, `import 'lodash.cloneDeep'`).
const TRANSITIVE_ONLY_PREFIXES = TRANSITIVE_ONLY_PACKAGES.flatMap((name) => [
  `${name}/`, // submodule import
  `${name}.`, // dot-named single-purpose package on npm (e.g. lodash.cloneDeep)
]);

const IMPORT_RE =
  /(?:import[^'"`]*from\s*|import\s*|require\s*\()\s*['"`]([^'"`]+)['"`]/g;

interface Violation {
  file: string;
  specifier: string;
  matchedPackage: string;
}

function isViolation(specifier: string): string | null {
  if (TRANSITIVE_ONLY_PACKAGES.includes(specifier as (typeof TRANSITIVE_ONLY_PACKAGES)[number])) {
    return specifier;
  }
  for (const prefix of TRANSITIVE_ONLY_PREFIXES) {
    if (specifier.startsWith(prefix)) {
      // Strip subpath / dotted variant suffix to surface the base package name.
      return specifier.split(/[/.]/)[0];
    }
  }
  return null;
}

describe('transitive-only-deps stay unreachable from src/ imports', () => {
  const files = globSync('src/**/*.{ts,tsx,js,jsx,mjs,cjs}', { absolute: true });

  it('finds a non-trivial number of source files to scan', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('contains zero direct imports of transitive-only packages', () => {
    const violations: Violation[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      IMPORT_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = IMPORT_RE.exec(source)) !== null) {
        const specifier = match[1];
        const matchedPackage = isViolation(specifier);
        if (matchedPackage) {
          violations.push({
            file: path.relative(path.resolve(__dirname, '../..'), file),
            specifier,
            matchedPackage,
          });
        }
      }
    }

    expect(
      violations,
      `Direct import(s) of transitive-only package(s) detected in src/. ` +
        `These packages live in node_modules only because deeper SDKs pull ` +
        `them in, and audit-ci's allowlist for their advisories rests on ` +
        `"no direct app code call site". A direct import collapses that ` +
        `justification. See the docstring at the top of this file for ` +
        `remediation steps. Violations:\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });
});
