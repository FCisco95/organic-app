import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Structural invariant: a set of packages reach our lockfile only through
 * deeply transitive paths in wallet / OAuth SDKs, and their security history
 * is checkered enough that we've explicitly written down "reachability is
 * structural-zero" as the reason CI ignores their advisories. That claim
 * holds only as long as our app code never imports them directly.
 *
 * This test fails if anyone in `src/` introduces a module-specifier reference
 * to a package listed in TRANSITIVE_ONLY_PACKAGES. It walks a real TypeScript
 * AST instead of grepping, so every reachable syntax form is caught:
 *
 *   - import x from 'pkg' / import 'pkg' / import {a} from 'pkg'
 *   - import type {a} from 'pkg'
 *   - export {x} from 'pkg' / export * from 'pkg' / export * as ns from 'pkg'
 *   - require('pkg')
 *   - import('pkg') / await import('pkg')          (dynamic import)
 *   - type T = import('pkg').X                     (import-type node)
 *
 * Codex adversarial review 2026-05-16 caught the earlier regex-based
 * implementation missing dynamic imports and re-exports — both produce real
 * runtime reachability. The fixture tests below pin each syntax form so a
 * future refactor can't reopen the gap silently.
 *
 * Companion to tests/security/spl-token-import-surface.test.ts which guards
 * the narrower allow-listed import surface for @solana/spl-token (where the
 * package IS a direct dep but only the constant-import shape is safe).
 */

const TRANSITIVE_ONLY_PACKAGES = [
  // Reached via @solana/wallet-adapter-wallets > ... > @stellar/stellar-sdk.
  'axios',
  // Reached via @walletconnect/universal-provider.
  'lodash',
  // Reached via the Trezor wallet adapter chain.
  'protobufjs',
] as const;

const TRANSITIVE_ONLY_SET: ReadonlySet<string> = new Set(TRANSITIVE_ONLY_PACKAGES);

const TRANSITIVE_ONLY_PREFIXES = TRANSITIVE_ONLY_PACKAGES.flatMap((name) => [
  `${name}/`, // submodule import: lodash/get
  `${name}.`, // dot-named single-purpose package: lodash.cloneDeep
]);

interface Violation {
  file: string;
  specifier: string;
  matchedPackage: string;
  syntax: string;
}

function matchedBase(specifier: string): string | null {
  if (TRANSITIVE_ONLY_SET.has(specifier)) {
    return specifier;
  }
  for (const prefix of TRANSITIVE_ONLY_PREFIXES) {
    if (specifier.startsWith(prefix)) {
      return specifier.split(/[/.]/)[0];
    }
  }
  return null;
}

function recordIfViolation(
  specifier: string,
  syntax: string,
  file: string,
  violations: Violation[],
): void {
  const matchedPackage = matchedBase(specifier);
  if (matchedPackage) {
    violations.push({ file, specifier, matchedPackage, syntax });
  }
}

function scanSource(file: string, source: string): Violation[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TSX,
  );

  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      recordIfViolation(node.moduleSpecifier.text, 'ImportDeclaration', file, violations);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      recordIfViolation(node.moduleSpecifier.text, 'ExportDeclaration', file, violations);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      recordIfViolation(node.argument.literal.text, 'ImportTypeNode', file, violations);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
          recordIfViolation(arg.text, 'require()', file, violations);
        } else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          recordIfViolation(arg.text, 'dynamic import()', file, violations);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe('transitive-only-deps stay unreachable from src/ imports (AST scan)', () => {
  describe('scanner fixture coverage', () => {
    // Each fixture is a single guarded-syntax example. The scanner must
    // catch every one. If any of these starts passing through, the
    // production scan over src/ is silently broken.
    const fixtures: Array<{ name: string; source: string; expectSyntax: string }> = [
      {
        name: 'static default import',
        source: `import axios from 'axios';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'static named import',
        source: `import { get } from 'lodash';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'static namespace import',
        source: `import * as proto from 'protobufjs';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'bare side-effect import',
        source: `import 'axios';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'type-only import',
        source: `import type { AxiosResponse } from 'axios';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'submodule import',
        source: `import get from 'lodash/get';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'dotted single-purpose package',
        source: `import cloneDeep from 'lodash.cloneDeep';\n`,
        expectSyntax: 'ImportDeclaration',
      },
      {
        name: 'named re-export',
        source: `export { Buffer } from 'protobufjs';\n`,
        expectSyntax: 'ExportDeclaration',
      },
      {
        name: 'wildcard re-export',
        source: `export * from 'axios';\n`,
        expectSyntax: 'ExportDeclaration',
      },
      {
        name: 'namespace re-export',
        source: `export * as l from 'lodash';\n`,
        expectSyntax: 'ExportDeclaration',
      },
      {
        name: 'dynamic import',
        source: `const a = import('axios');\n`,
        expectSyntax: 'dynamic import()',
      },
      {
        name: 'awaited dynamic import',
        source: `async function f() { const a = await import('lodash/get'); return a; }\n`,
        expectSyntax: 'dynamic import()',
      },
      {
        name: 'CommonJS require',
        source: `const proto = require('protobufjs');\n`,
        expectSyntax: 'require()',
      },
      {
        name: 'import-type node in a type alias',
        source: `type T = import('axios').AxiosResponse;\n`,
        expectSyntax: 'ImportTypeNode',
      },
    ];

    for (const fixture of fixtures) {
      it(`catches: ${fixture.name}`, () => {
        const violations = scanSource('<fixture>', fixture.source);
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].syntax).toBe(fixture.expectSyntax);
      });
    }

    // Negative controls: similar but non-guarded forms must NOT trip.
    const allowedFixtures: Array<{ name: string; source: string }> = [
      {
        name: 'comment containing the package name',
        source: `// we used to depend on axios here\nconst x = 1;\n`,
      },
      {
        name: 'string literal that is not an import',
        source: `const docsUrl = 'https://axios-http.com/docs';\n`,
      },
      {
        name: 'unrelated package with similar prefix',
        source: `import { foo } from 'axioslike';\n`,
      },
      {
        name: 'unrelated dotted package',
        source: `import { foo } from 'lodashx.helper';\n`,
      },
      {
        name: 'import of a different package entirely',
        source: `import { z } from 'zod';\n`,
      },
    ];

    for (const fixture of allowedFixtures) {
      it(`ignores: ${fixture.name}`, () => {
        expect(scanSource('<fixture>', fixture.source)).toEqual([]);
      });
    }
  });

  describe('production scan over src/', () => {
    const files = globSync('src/**/*.{ts,tsx,js,jsx,mjs,cjs}', { absolute: true });

    it('finds a non-trivial number of source files to scan', () => {
      expect(files.length).toBeGreaterThan(100);
    });

    it('contains zero direct imports of transitive-only packages', () => {
      const violations: Violation[] = [];
      const repoRoot = path.resolve(__dirname, '../..');

      for (const file of files) {
        const source = readFileSync(file, 'utf-8');
        for (const v of scanSource(file, source)) {
          violations.push({ ...v, file: path.relative(repoRoot, file) });
        }
      }

      expect(
        violations,
        `Direct reference(s) to transitive-only package(s) detected in src/. ` +
          `These packages live in node_modules only because deeper SDKs pull ` +
          `them in, and audit-ci's allowlist for their advisories rests on ` +
          `"no direct app code call site". A direct import (in any syntax — ` +
          `static, dynamic, re-export, require, import-type) collapses that ` +
          `justification. See the docstring at the top of this file for ` +
          `remediation steps. Violations:\n${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });
  });
});
