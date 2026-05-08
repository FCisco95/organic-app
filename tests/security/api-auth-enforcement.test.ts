import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Phase 3 coverage gap: every mutating API route under src/app/api/ MUST
 * enforce auth (or explicitly opt out with a documented reason).
 *
 * This is a sweeping static guard. It walks every route.ts file, finds the
 * exported HTTP-method handlers, and asserts each non-GET handler either:
 *   1. Calls supabase.auth.getUser() / getSession() (cookie-based auth), OR
 *   2. Validates a CRON_SECRET / X-CRON-SECRET bearer token (cron routes), OR
 *   3. Validates a service-to-service signing secret, OR
 *   4. Is explicitly annotated as `// @public` with a reason.
 *
 * Catches regressions where someone adds a POST/PATCH/DELETE route and
 * forgets the auth gate.
 *
 * GET handlers are intentionally not enforced here — many list endpoints
 * are public by design (leaderboard, treasury balance, etc.). Per-route
 * GET-auth is asserted in domain-specific tests (e.g. notifications-api).
 */

const API_ROOT = path.resolve(__dirname, '../../src/app/api');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (entry === 'route.ts') {
      acc.push(full);
    }
  }
  return acc;
}

const ROUTE_FILES = walk(API_ROOT);

// Routes that are intentionally unauthenticated (justified). New entries
// require a comment explaining why.
const PUBLIC_MUTATION_ALLOWLIST = new Set<string>([
  // Health-check endpoint: explicitly designed for unauthenticated probing.
  'src/app/api/health/route.ts',
  // Referral code validation runs at signup, before the user has a session.
  // The route only does a code lookup; it does not perform any mutation
  // beyond the lookup itself (referrer_id is read-only).
  'src/app/api/referrals/validate/route.ts',
]);

function relPath(absolute: string): string {
  return path.relative(path.resolve(__dirname, '../..'), absolute);
}

const HTTP_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const;

function exportedMethods(source: string): string[] {
  const methods: string[] = [];
  for (const m of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`);
    if (re.test(source)) methods.push(m);
    const reConst = new RegExp(`export\\s+const\\s+${m}\\s*=`);
    if (reConst.test(source)) methods.push(m);
  }
  return methods;
}

function hasAuthGate(source: string): boolean {
  return (
    /supabase\.auth\.getUser\b/.test(source) ||
    /supabase\.auth\.getSession\b/.test(source) ||
    // Role-based helpers under @/lib/auth/require-role.
    /\brequire(?:Admin|Council|User|Session|Role|AdminOrCouncil|VerifiedMember)/.test(source) ||
    /CRON_SECRET\b|X-CRON-SECRET\b|cronAuthorized\b/.test(source) ||
    /verifyServiceSecret\b|INTERNAL_SECRET\b/.test(source) ||
    // Some routes pull auth via a feature helper that calls getUser inside.
    /getAuthenticatedUser\b|getAuthUser\b/.test(source)
  );
}

describe('Every mutating API route enforces auth (Phase 3)', () => {
  it('finds at least one route file', () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(50);
  });

  it.each(ROUTE_FILES.map((f) => [relPath(f), f]))(
    '%s — every POST/PATCH/PUT/DELETE handler has an auth gate',
    (rel, abs) => {
      const source = readFileSync(abs, 'utf-8');
      const methods = exportedMethods(source);
      if (methods.length === 0) return; // Read-only route.

      if (PUBLIC_MUTATION_ALLOWLIST.has(rel)) return;

      const ok = hasAuthGate(source);
      expect(
        ok,
        `${rel} exports ${methods.join(', ')} but has no recognizable auth gate.\n` +
          `Add a session check, CRON_SECRET check, or add the file to PUBLIC_MUTATION_ALLOWLIST with a justification.`,
      ).toBe(true);
    },
  );
});
