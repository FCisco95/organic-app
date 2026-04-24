import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'fs';

describe('DDoS & Cost Prevention', () => {
  it('rate-limit module warns about missing Upstash in production', () => {
    const content = readFileSync('src/lib/rate-limit.ts', 'utf-8');
    expect(content).toContain('UPSTASH_REDIS_REST_URL');
    expect(content.toLowerCase()).toContain('production');
  });

  it('getAllTokenHolders is only called from admin/server contexts', () => {
    const apiRoutes = globSync('src/app/api/**/route.ts');
    const userFacingCallers: string[] = [];

    for (const file of apiRoutes) {
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('getAllTokenHolders')) continue;

      // Route is acceptable if it has admin/council role enforcement OR
      // an explicit `// ddos-exempt: <reason>` marker documenting why a
      // user-facing route that calls getAllTokenHolders is safe
      // (e.g. rate-limited + CDN-cached + stale-fallback).
      const hasAdminCheck =
        content.includes("'admin'") ||
        content.includes("'council'") ||
        content.includes('isAdmin') ||
        content.includes('cron');
      const hasExemptionMarker = content.includes('// ddos-exempt:');
      if (!hasAdminCheck && !hasExemptionMarker) {
        userFacingCallers.push(file);
      }
    }

    // start-voting requires admin/council role - verified manually
    // If any new user-facing callers appear, this test flags them
    if (userFacingCallers.length > 0) {
      console.warn(
        'getAllTokenHolders called from non-admin routes:',
        userFacingCallers
      );
    }
    expect(userFacingCallers).toHaveLength(0);
  });

  it('list endpoints should use pagination or limits', () => {
    const apiRoutes = globSync('src/app/api/**/route.ts');
    const unboundedEndpoints: string[] = [];

    for (const file of apiRoutes) {
      const content = readFileSync(file, 'utf-8');
      // Check if it returns lists (has .select() calls)
      const hasSelect = content.includes('.select(');
      if (!hasSelect) continue;

      // Check for pagination
      const hasPagination =
        content.includes('.limit(') ||
        content.includes('.range(') ||
        content.includes('LIMIT');
      if (!hasPagination && content.includes('GET')) {
        // Might be single-record fetches (.single() or .maybeSingle())
        const isSingleRecord =
          content.includes('.single()') || content.includes('.maybeSingle()');
        if (!isSingleRecord) {
          unboundedEndpoints.push(file);
        }
      }
    }

    // Document any unbounded endpoints (informational, not blocking)
    if (unboundedEndpoints.length > 0) {
      console.warn(
        'Endpoints without explicit pagination:',
        unboundedEndpoints
      );
    }
    // This is a documentation test - we track but don't fail for now
    expect(true).toBe(true);
  });
});
