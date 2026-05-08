import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * HIGH-1 regression test (Security audit 2026-05-08).
 *
 * The middleware previously contained:
 *   userAgent.includes('Next.js') ||
 *   request.headers.has('x-middleware-subrequest')
 * inside an isInternalSystemRequest() helper that bypassed rate limiting.
 *
 * Any HTTP client can spoof `User-Agent: Next.js`, so the entire rate
 * limiter could be defeated by setting one header. The fix removes the
 * UA branch (and, since x-middleware-subrequest is stripped at the top
 * of the middleware to mitigate CVE-2025-29927, the entire helper
 * becomes a no-op and is removed).
 */

const middlewareSource = readFileSync(
  path.resolve(__dirname, '../../src/middleware.ts'),
  'utf-8',
);

describe('middleware does not trust User-Agent (HIGH-1)', () => {
  it('does not check userAgent.includes("Next.js")', () => {
    expect(middlewareSource).not.toMatch(/userAgent\.includes\(\s*['"]Next\.js['"]\s*\)/);
  });

  it('does not branch on the request user-agent header for rate-limit bypass', () => {
    // The string "user-agent" should not appear in any branch that returns
    // NextResponse.next() or skips the rate limiter.
    const lines = middlewareSource.split('\n');
    let inSuspectFn = false;
    let braceDepth = 0;
    for (const line of lines) {
      if (/function\s+\w*[Ii]nternal\w*\s*\(/.test(line)) {
        inSuspectFn = true;
      }
      if (inSuspectFn) {
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        expect(line.toLowerCase()).not.toContain('user-agent');
        if (braceDepth === 0 && line.includes('}')) inSuspectFn = false;
      }
    }
  });

  it('still strips x-middleware-subrequest for CVE-2025-29927', () => {
    // Defense-in-depth check: don't accidentally remove the CVE mitigation.
    expect(middlewareSource).toMatch(
      /request\.headers\.delete\(\s*['"]x-middleware-subrequest['"]\s*\)/,
    );
  });
});
