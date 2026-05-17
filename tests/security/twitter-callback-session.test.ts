import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Regression: `src/app/api/twitter/link/callback/route.ts` must reject the
 * OAuth callback when there is no authenticated session, not only when the
 * session belongs to a different user.
 *
 * Background (audit 2026-05-16, docs/audits/2026-05-16-routes-auth-check-triage.md):
 *
 * The original guard was:
 *
 *   if (user && user.id !== oauthSession.user_id) { redirect('session_mismatch') }
 *
 * Logged-out callers carrying a valid `state` token slipped past this check.
 * The random `state` token is still the primary CSRF protection, but if it
 * ever leaks (logs, referrer, XSS on the redirect target, etc.) an attacker
 * could complete the callback themselves and link an attacker-controlled
 * Twitter handle to the victim's account.
 *
 * The corrected guard requires both: a valid session AND a session id that
 * matches the one stored at OAuth-init time. The original combined guard was
 * split into two branches for diagnostics, but the security intent is the
 * same — every callback must short-circuit on either condition.
 *
 *   if (!user) { redirect('session_no_user') }
 *   if (user.id !== oauthSession.user_id) { redirect('session_user_mismatch') }
 */

const ROUTE = path.resolve(
  __dirname,
  '../../src/app/api/twitter/link/callback/route.ts'
);

describe('Twitter OAuth callback requires an authenticated session', () => {
  const source = readFileSync(ROUTE, 'utf-8');

  it('rejects when there is no authenticated session', () => {
    // The earlier vulnerable form was `if (user && user.id !== ...)` which let
    // unauthenticated callers slip through. This test asserts the guard rejects
    // when `user` is null/undefined, regardless of whether the same condition
    // lives in one combined `if` or a dedicated branch.
    const guard = source.match(
      /if\s*\(\s*(?:!\s*user|user\s*==\s*null|user\s*===\s*null)\s*[)|]/
    );
    expect(
      guard,
      'callback must short-circuit when !user (e.g. `if (!user)` or `if (!user || ...)`)'
    ).not.toBeNull();
  });

  it('rejects when callback user does not match session user', () => {
    expect(
      source,
      'callback must short-circuit when user.id !== oauthSession.user_id'
    ).toMatch(/user\.id\s*!==\s*oauthSession\.user_id/);
  });

  it('still calls supabase.auth.getUser() before the guard', () => {
    expect(source).toMatch(/await\s+supabase\.auth\.getUser\(\)/);
  });

  it('still validates state against twitter_oauth_sessions row', () => {
    expect(source).toMatch(/from\(['"]twitter_oauth_sessions['"]\)/);
    expect(source).toMatch(/\.eq\(['"]state['"]\s*,\s*state\)/);
  });
});
