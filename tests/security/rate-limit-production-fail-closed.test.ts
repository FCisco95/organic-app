import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * HIGH-2 regression test (Security audit 2026-05-08).
 *
 * The in-memory rate-limit fallback runs in serverless, where every cold
 * start gets a fresh Map. An attacker with basic tooling can defeat any
 * rate limit by spreading traffic across instances. The original code
 * logged a warning at module load — visible only in server logs, never
 * enforced.
 *
 * Fix: in production-on-Vercel, when UPSTASH credentials are missing,
 * applyRateLimit returns 503 (fail closed) and logs at error level. Dev
 * and explicit-bypass flows are unchanged.
 */

const ORIGINAL_ENV = { ...process.env };

function resetEnv(values: Record<string, string | undefined> = {}) {
  // Restore baseline first.
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    process.env[k] = v;
  }
  // Apply the test-specific overrides.
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

async function freshImport() {
  // Vitest caches modules; reset so the rate-limit module re-evaluates env.
  vi.resetModules();
  const mod = await import('../../src/lib/rate-limit');
  return mod;
}

describe('applyRateLimit fails closed without Upstash in production (HIGH-2)', () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('returns 503 when production-on-Vercel without Upstash', async () => {
    resetEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      VERCEL_URL: 'organic-app.vercel.app',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      DISABLE_RATE_LIMIT: undefined,
    });
    const { applyRateLimit } = await freshImport();
    const response = await applyRateLimit('test:ip:1.2.3.4', { limit: 5, windowMs: 60_000 });
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    const body = (await response!.json()) as { error: string };
    expect(body.error).toMatch(/unavailable/i);
    expect(response!.headers.get('Retry-After')).toBeTruthy();
  });

  it('does not 503 when Upstash IS configured in production', async () => {
    resetEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      VERCEL_URL: 'organic-app.vercel.app',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
      DISABLE_RATE_LIMIT: undefined,
    });
    const { applyRateLimit } = await freshImport();
    // Upstash is "configured" but the URL is fake; runUpstashPipeline will
    // fail and return null, which falls back to the in-memory store.
    // The point of this test is that we DON'T short-circuit to 503 just
    // because Upstash is unreachable on a single call — only if it is
    // unconfigured at all. The in-memory result is fine here.
    const response = await applyRateLimit('test:ip:1.2.3.4', { limit: 5, windowMs: 60_000 });
    expect(response).toBeNull();
  });

  it('does NOT 503 in development without Upstash (in-memory fallback OK)', async () => {
    resetEnv({
      NODE_ENV: 'development',
      VERCEL: undefined,
      ENABLE_RATE_LIMIT_NON_VERCEL: 'true', // force the limiter to run in dev
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });
    const { applyRateLimit } = await freshImport();
    const response = await applyRateLimit('dev:ip:1.2.3.4', { limit: 5, windowMs: 60_000 });
    expect(response).toBeNull();
  });

  it('does NOT 503 when DISABLE_RATE_LIMIT=true (CI / build)', async () => {
    resetEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      VERCEL_URL: 'organic-app.vercel.app',
      DISABLE_RATE_LIMIT: 'true',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });
    const { applyRateLimit } = await freshImport();
    const response = await applyRateLimit('test:ip:1.2.3.4', { limit: 5, windowMs: 60_000 });
    expect(response).toBeNull();
  });
});
