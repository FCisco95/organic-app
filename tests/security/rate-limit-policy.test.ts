import { describe, it, expect } from 'vitest';
import { getApiRateLimitPolicy } from '@/middleware';
import { RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Regression test for the 2026-05-16 rate-limit tightening audit
 * (docs/audits/2026-05-16-rate-limit-tightening.md).
 *
 * Pins each high-risk route to the bucket it should fall under. If the
 * middleware matcher table gets reshuffled and one of these routes
 * silently drops back to the loose `write` 20/min/user default, this
 * test fails and the regression is caught at PR time.
 */

function policy(pathname: string, method: string) {
  return getApiRateLimitPolicy(pathname, method);
}

describe('rate-limit policy presets', () => {
  it('exposes adminWrite at 10/min', () => {
    expect(RATE_LIMITS.adminWrite).toEqual({ limit: 10, windowMs: 60_000 });
  });

  it('exposes costly at 3/min', () => {
    expect(RATE_LIMITS.costly).toEqual({ limit: 3, windowMs: 60_000 });
  });

  it('keeps existing presets intact', () => {
    expect(RATE_LIMITS.write).toEqual({ limit: 20, windowMs: 60_000 });
    expect(RATE_LIMITS.sensitive).toEqual({ limit: 5, windowMs: 60_000 });
    expect(RATE_LIMITS.auth).toEqual({ limit: 10, windowMs: 60_000 });
  });
});

describe('admin-write bucket', () => {
  it.each([
    '/api/admin/badges/award',
    '/api/admin/users/restrict',
    '/api/admin/users/flag-check',
    '/api/admin/campaigns',
    '/api/admin/campaigns/abc-123',
    '/api/admin/quests',
    '/api/admin/quests/abc-123',
    '/api/admin/engagement/calibration',
    '/api/admin/engagement/calibration/abc-123',
    '/api/admin/gamification/config',
    '/api/admin/easter/config',
  ])('routes %s mutations to admin-write', (path) => {
    const result = policy(path, 'POST');
    expect(result?.bucket).toBe('admin-write');
    expect(result?.config).toEqual(RATE_LIMITS.adminWrite);
    expect(result?.scope).toBe('user');
  });

  it.each([
    '/api/proposals/abc-123/start-voting',
    '/api/proposals/abc-123/finalize',
    '/api/proposals/abc-123/execute',
    '/api/disputes/abc-123/resolve',
    '/api/disputes/abc-123/mediate',
    '/api/disputes/abc-123/assign',
  ])('routes %s mutations to admin-write via pattern', (path) => {
    expect(policy(path, 'POST')?.bucket).toBe('admin-write');
  });

  it('GET on /api/admin/* still gets read, not admin-write', () => {
    expect(policy('/api/admin/users', 'GET')?.bucket).toBe('read');
  });
});

describe('costly bucket', () => {
  it.each([
    '/api/gamification/burn',
    '/api/profile/upload-avatar',
    '/api/twitter/link/start',
    '/api/engagement/posts',
  ])('routes POST %s to costly', (path) => {
    const result = policy(path, 'POST');
    expect(result?.bucket).toBe('costly');
    expect(result?.config).toEqual(RATE_LIMITS.costly);
    expect(result?.scope).toBe('user');
  });

  it('GET on a costly path falls back to read', () => {
    expect(policy('/api/gamification/burn', 'GET')?.bucket).toBe('read');
  });
});

describe('sensitive-write bucket (mutation-only patterns)', () => {
  it.each([
    '/api/disputes',
    '/api/disputes/abc-123/appeal',
    '/api/sprints/abc-123/start',
    '/api/sprints/abc-123/complete',
    '/api/submissions/abc-123/review',
    '/api/marketplace/boosts',
    '/api/marketplace/boosts/abc-123/engage',
    '/api/proposals/abc-123/vote',
    '/api/engagement/appeals/abc-123/vote',
    '/api/engagement/submissions/abc-123/appeal',
  ])('routes POST %s to sensitive', (path) => {
    const result = policy(path, 'POST');
    expect(result?.bucket).toBe('sensitive');
    expect(result?.config).toEqual(RATE_LIMITS.sensitive);
  });

  it('GET on /api/disputes (list) falls back to read, not sensitive', () => {
    expect(policy('/api/disputes', 'GET')?.bucket).toBe('read');
  });

  it('GET on /api/marketplace/boosts (list) falls back to read', () => {
    expect(policy('/api/marketplace/boosts', 'GET')?.bucket).toBe('read');
  });

  it('GET on /api/proposals/[id]/vote falls back to read', () => {
    expect(policy('/api/proposals/abc-123/vote', 'GET')?.bucket).toBe('read');
  });
});

describe('expanded sensitive prefix (/api/rewards/distributions)', () => {
  it('POST /api/rewards/distributions falls under sensitive', () => {
    expect(policy('/api/rewards/distributions', 'POST')?.bucket).toBe('sensitive');
  });

  it('POST /api/rewards/distributions/manual still under sensitive (regression)', () => {
    expect(policy('/api/rewards/distributions/manual', 'POST')?.bucket).toBe('sensitive');
  });
});

describe('existing buckets preserved (regression)', () => {
  it('POST /api/auth/nonce stays in auth bucket', () => {
    expect(policy('/api/auth/nonce', 'POST')?.bucket).toBe('auth');
  });

  it('POST /api/settings stays in sensitive bucket', () => {
    expect(policy('/api/settings', 'POST')?.bucket).toBe('sensitive');
  });

  it('POST /api/posts/abc/translate stays in translate bucket', () => {
    expect(policy('/api/posts/abc-123/translate', 'POST')?.bucket).toBe('translate');
  });

  it('GET /api/solana/is-holder stays in solana-proxy-user bucket', () => {
    expect(policy('/api/solana/is-holder', 'GET')?.bucket).toBe('solana-proxy-user');
  });

  it('GET /api/stats stays in dashboard-read bucket', () => {
    expect(policy('/api/stats', 'GET')?.bucket).toBe('dashboard-read');
  });

  it('POST /api/internal/market-cache/refresh stays bypassed', () => {
    expect(policy('/api/internal/market-cache/refresh', 'POST')).toBeNull();
  });

  it('arbitrary unmatched POST falls back to write', () => {
    expect(policy('/api/notifications', 'POST')?.bucket).toBe('write');
  });

  it('OPTIONS is always null', () => {
    expect(policy('/api/admin/users/restrict', 'OPTIONS')).toBeNull();
  });
});
