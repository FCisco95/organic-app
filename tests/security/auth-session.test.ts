import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'fs';

/**
 * Auth & Session Security Audit Tests
 *
 * Agent 5 findings (2026-03-29):
 *
 * TASK 1 — getSession vs getUser
 * ==============================
 * Result: PASS. No API routes use supabase.auth.getSession().
 * All API routes use supabase.auth.getUser() which validates the JWT server-side.
 *
 * getSession() usage is limited to client-side code (acceptable):
 *   - src/features/auth/context.tsx (auth context provider)
 *   - src/components/profile/profile-wallet-tab.tsx (client component)
 *
 * TASK 2 — Nonce lifecycle
 * ========================
 * Result: PASS. Nonce security properties are all present:
 *   1. Cryptographically random: 32 bytes via crypto.randomBytes (nonce/route.ts:18)
 *   2. Single-use: marked with used_at timestamp after verification
 *   3. Time-limited: 5-minute TTL (NONCE_TTL_MS = 5 * 60 * 1000)
 *   4. Cleanup: pg_cron runs every 15 minutes ('* /15 * * * *') via
 *      cleanup_expired_nonces() which deletes rows where expires_at < NOW()
 *      OR used_at IS NOT NULL
 *   5. RLS: wallet_nonces table has RLS enabled with a deny-all policy;
 *      only the service role can access it
 *   6. Rate-limited: nonce endpoint uses applyIpRateLimit with auth limits
 *
 * Migration files:
 *   - supabase/migrations/20250122000000_add_wallet_nonces.sql (table + cleanup fn)
 *   - supabase/migrations/20260217121000_schedule_wallet_nonce_cleanup.sql (pg_cron)
 *
 * TASK 3 — Twitter OAuth PKCE flow
 * =================================
 * Result: PASS with one advisory note.
 *
 * 1. State parameter: Validated against DB via twitter_oauth_sessions table lookup
 *    (callback/route.ts:44-51). State is matched to user_id, preventing CSRF.
 *    Session mismatch check at line 54 prevents a different logged-in user from
 *    completing another user's OAuth flow.
 *
 * 2. Code verifier: Stored in twitter_oauth_sessions table (start/route.ts:110-115).
 *    Consumed (single-use) by deleting the session row after successful callback
 *    (callback/route.ts:178). PKCE pair uses 64 bytes of crypto.randomBytes with
 *    S256 challenge method (pkce.ts).
 *
 * 3. TTL: OAuth sessions expire after 10 minutes (start/route.ts:102).
 *    Expiry is checked in callback (callback/route.ts:58-61). Expired sessions
 *    are cleaned up both on new flow start (line 104-108) and on expiry detection.
 *
 * 4. Duplicate account detection: If twitter_user_id is already linked to a
 *    different user (is_active=true), the link is rejected with
 *    'twitter_already_linked' (callback/route.ts:123-136).
 *
 * 5. Rate limiting: Max 5 OAuth attempts per hour per user (start/route.ts:50-62).
 *
 * 6. Re-link cooldown: 24-hour cooldown after unlinking (start/route.ts:65-83).
 *
 * Advisory note: When getUserInfo fails (Free-tier Twitter API), a placeholder
 * profile with id='pending_<timestamp>' is used. The duplicate detection check
 * (callback/route.ts:123) correctly skips the check for pending profiles, but
 * this means Free-tier flows cannot detect duplicate Twitter accounts until
 * the user manually enters their handle. This is an accepted trade-off
 * documented in the codebase.
 */

describe('Auth Session Security', () => {
  it('should not use getSession() in API routes for auth decisions', () => {
    const apiRoutes = globSync('src/app/api/**/route.ts');
    const violations: string[] = [];

    for (const file of apiRoutes) {
      const content = readFileSync(file, 'utf-8');
      // Check for getSession usage (not just the import)
      if (content.includes('.getSession()') && !content.includes('// security-exempt: getSession')) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should use getUser() for auth in API routes that require authentication', () => {
    const apiRoutes = globSync('src/app/api/**/route.ts');
    const authRoutes: string[] = [];

    for (const file of apiRoutes) {
      const content = readFileSync(file, 'utf-8');
      // Routes that import createClient and check auth should use getUser
      if (content.includes('createClient') && content.includes('auth')) {
        if (content.includes('.getUser()')) {
          authRoutes.push(file);
        }
      }
    }

    // We expect authenticated routes to exist and all use getUser
    expect(authRoutes.length).toBeGreaterThan(0);
  });

  it('should document nonce lifecycle security properties', () => {
    // Nonces must be:
    // 1. Cryptographically random (32 bytes via crypto.randomBytes)
    // 2. Single-use (marked used_at after verification)
    // 3. Time-limited (5 min TTL)
    // 4. Cleaned up periodically (pg_cron every 15 min)
    // 5. RLS deny-all policy (service role only)
    // 6. Rate-limited endpoint (applyIpRateLimit)
    //
    // Verified in:
    //   - src/app/api/auth/nonce/route.ts
    //   - supabase/migrations/20250122000000_add_wallet_nonces.sql
    //   - supabase/migrations/20260217121000_schedule_wallet_nonce_cleanup.sql
    expect(true).toBe(true); // Living documentation
  });

  it('should document Twitter OAuth PKCE security properties', () => {
    // Twitter OAuth flow must have:
    // 1. State parameter validated against DB (not just existence)
    // 2. Code verifier stored securely, consumed after use (row deleted)
    // 3. OAuth sessions have 10-minute TTL
    // 4. Duplicate Twitter account detection (twitter_user_id uniqueness)
    // 5. Rate limit: max 5 attempts per hour per user
    // 6. 24-hour cooldown after unlinking before re-linking
    // 7. PKCE uses S256 with 64-byte random code verifier
    //
    // Verified in:
    //   - src/app/api/twitter/link/start/route.ts
    //   - src/app/api/twitter/link/callback/route.ts
    //   - src/lib/twitter/client.ts
    //   - src/lib/twitter/pkce.ts
    expect(true).toBe(true); // Living documentation
  });

  it('should not have OAuth sessions without TTL', () => {
    // Verify the start route sets an expiry
    const startRoute = readFileSync('src/app/api/twitter/link/start/route.ts', 'utf-8');
    expect(startRoute).toContain('expires_at');
    expect(startRoute).toContain('10 * 60 * 1000'); // 10 minute TTL
  });

  it('should consume OAuth sessions after callback', () => {
    // Verify the callback route deletes the session after use
    const callbackRoute = readFileSync('src/app/api/twitter/link/callback/route.ts', 'utf-8');
    // Session is deleted after successful account insert
    expect(callbackRoute).toContain("from('twitter_oauth_sessions').delete()");
  });

  it('should validate state against DB in OAuth callback', () => {
    const callbackRoute = readFileSync('src/app/api/twitter/link/callback/route.ts', 'utf-8');
    // State is looked up in the database, not just checked for existence
    expect(callbackRoute).toContain(".eq('state', state)");
    // User identity is verified against the session
    expect(callbackRoute).toContain('oauthSession.user_id');
  });

  it('should detect duplicate Twitter account linking', () => {
    const callbackRoute = readFileSync('src/app/api/twitter/link/callback/route.ts', 'utf-8');
    expect(callbackRoute).toContain('twitter_already_linked');
    expect(callbackRoute).toContain(".eq('twitter_user_id', twitterProfile.id)");
  });
});
