import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCspHeader } from '@/middleware';

const NONCE = 'test-nonce-abc123';

describe('Content-Security-Policy: dev/prod gating', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // sanity: tests should explicitly set NODE_ENV in each case below
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("never includes 'unsafe-eval' in production", () => {
    process.env.NODE_ENV = 'production';
    const csp = buildCspHeader(NONCE);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`);
  });

  it("allows 'unsafe-eval' in development for Next.js React Refresh", () => {
    process.env.NODE_ENV = 'development';
    const csp = buildCspHeader(NONCE);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic' 'unsafe-eval'`);
  });

  it("allows 'unsafe-eval' for any non-production NODE_ENV (e.g. 'test')", () => {
    process.env.NODE_ENV = 'test';
    const csp = buildCspHeader(NONCE);
    expect(csp).toContain("'unsafe-eval'");
  });

  it('always preserves the per-request nonce', () => {
    process.env.NODE_ENV = 'production';
    expect(buildCspHeader('nonce-A')).toContain("'nonce-nonce-A'");
    process.env.NODE_ENV = 'development';
    expect(buildCspHeader('nonce-B')).toContain("'nonce-nonce-B'");
  });

  it('keeps frame-ancestors locked to none in both modes', () => {
    process.env.NODE_ENV = 'production';
    expect(buildCspHeader(NONCE)).toContain("frame-ancestors 'none'");
    process.env.NODE_ENV = 'development';
    expect(buildCspHeader(NONCE)).toContain("frame-ancestors 'none'");
  });
});
