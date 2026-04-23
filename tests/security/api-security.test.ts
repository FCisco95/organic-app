import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'fs';

describe('API Security', () => {
  it('should support idempotency key on reward claims', () => {
    const content = readFileSync('src/app/api/rewards/claims/route.ts', 'utf-8');
    expect(content.toLowerCase()).toContain('idempotency');
  });

  it('all mutation endpoints should check authentication', () => {
    const apiRoutes = globSync('src/app/api/**/route.ts');
    const unauthMutations: string[] = [];

    for (const file of apiRoutes) {
      const content = readFileSync(file, 'utf-8');
      const hasMutation = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)/m.test(content);
      if (!hasMutation) continue;

      // Skip internal/webhook routes that use different auth (CRON_SECRET, Stripe signature)
      if (file.includes('/internal/') || file.includes('/webhooks/') || file.includes('/webhook/')) continue;

      // Skip referral validation - intentionally unauthenticated (used during signup)
      if (file.includes('/referrals/validate/')) continue;

      const hasAuth = content.includes('getUser') || content.includes('Bearer') || content.includes('authorization');
      if (!hasAuth) {
        unauthMutations.push(file);
      }
    }

    expect(unauthMutations).toEqual([]);
  });
});
