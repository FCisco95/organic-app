import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'fs';

describe('Compliance & Monitoring', () => {
  it('wallet link endpoint logs to activity_log', () => {
    const content = readFileSync('src/app/api/auth/link-wallet/route.ts', 'utf-8');
    expect(content).toContain('activity_log');
    expect(content).toContain('wallet_linked');
  });

  it('twitter link callback logs to activity_log', () => {
    const content = readFileSync('src/app/api/twitter/link/callback/route.ts', 'utf-8');
    expect(content).toContain('activity_log');
    expect(content).toContain('twitter_linked');
  });

  it('rate limit logs do not expose full IP addresses', () => {
    const content = readFileSync('src/lib/rate-limit.ts', 'utf-8');
    // Should use hash-based preview, not raw substring of IP
    expect(content).toContain('fnv1aHash');
  });

  it('logger calls should not contain PII patterns', () => {
    const files = globSync('src/**/*.{ts,tsx}', { exclude: ['**/node_modules/**', '**/*.test.*'] });
    // Match logger calls that log PII as variable values (not just mentioning "token" in a description string).
    // Looks for patterns like: { password: ..., apiKey: ..., sessionToken: ... }
    const piiPatterns = /logger\.(error|warn|info)\([^)]*\{\s*[^}]*?(password|secret|apiKey|sessionToken)\s*:/i;
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (piiPatterns.test(content)) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });
});
