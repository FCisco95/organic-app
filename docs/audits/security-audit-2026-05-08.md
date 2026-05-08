# Security Audit — 2026-05-08

## Summary

**Scope:** Wallet signature flow, Supabase RLS, API route auth, SQL/HTML injection, economic exploits, rate limiting, secrets.

**Finding counts:**

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 3 |
| MEDIUM | 1 |
| LOW | 2 |

**Top risks:**
1. Email PII exposed to unauthenticated users via leaderboard view/materialized view (anon SELECT grant)
2. SSRF via user-controlled `twitter_url` field with no domain whitelist
3. Nonce replay window on wallet link — deliberately continues if nonce invalidation fails

No hardcoded secrets found. No raw SQL concatenation found. No `dangerouslySetInnerHTML` usage found. All admin routes properly gated. All internal/cron routes properly use `CRON_SECRET`. CVE-2025-29927 mitigation is present.

---

## CRITICAL Findings

### CRIT-1: Leaderboard view exposes `email` and `claimable_points` to unauthenticated users

**File:** `supabase/migrations/20260507221350_leaderboard_views_easter_egg_elements.sql` (and `20260507212349_easter_egg_elements.sql`)

**Severity:** CRITICAL — PII disclosure to anonymous users

**Details:**

The leaderboard view was originally hardened to remove email in an earlier migration (`20260329100000_hotfix_leaderboard_anon_grant.sql`), whose comment reads:

> "The view no longer contains email/PII (removed in security_hardening), so it's safe for public/cached access."

However, two subsequent feature migrations (`20260507212349` and `20260507221350`) both recreate `leaderboard_view` with the `email` and `claimable_points` columns included, then re-grant `SELECT` to `anon`:

```sql
CREATE VIEW public.leaderboard_view AS
SELECT
  id, name, email, organic_id, avatar_url,
  total_points, claimable_points, ...
FROM public.user_profiles
WHERE organic_id IS NOT NULL ...;

GRANT SELECT ON public.leaderboard_view TO anon;
GRANT SELECT ON public.leaderboard_materialized TO anon;
```

Any unauthenticated request can now read the email address and claimable_points balance of every user who appears on the leaderboard. `leaderboard_materialized` inherits this via `SELECT * FROM leaderboard_view`.

**Fix:** Remove `email` and `claimable_points` from `leaderboard_view`. Add a new migration that drops and recreates the view without those columns, then refreshes the materialized view. Update the `anon` grant only after PII columns are removed.

---

### CRIT-2: SSRF via user-controlled `twitter_url` in OG metadata fetch

**File:** `src/lib/og-preview.ts`, called from `src/app/api/posts/route.ts`

**Severity:** CRITICAL — server-side request forgery, internal metadata service exposure

**Details:**

`fetchOgMetadata(url: string)` fetches the caller-supplied URL directly with no domain whitelist and no private-IP/loopback blocking:

```typescript
// src/lib/og-preview.ts
const response = await fetch(url, {   // url is the raw user-provided twitter_url
  signal: controller.signal,
  headers: { 'User-Agent': 'OrganicBot/1.0 (Open Graph Preview)', ... },
  redirect: 'follow',                 // follows redirects — worsens SSRF
});
```

An authenticated attacker submitting a post with `twitter_url: "http://169.254.169.254/latest/meta-data/"` (AWS IMDS), `http://100.100.100.200/latest/meta-data/` (Alibaba), `http://localhost:6379/` (Redis), or any internal VPC hostname will cause the server to issue that request and potentially return the response body.

**Fix:**

```typescript
import { URL } from 'url';

const ALLOWED_OG_HOSTS = [
  'twitter.com', 'x.com', 't.co',
  'open.spotify.com', 'youtube.com', 'youtu.be',
];

function isSafeOgUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const hostname = u.hostname.toLowerCase();
    // Block private IP ranges
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fc|fd)/.test(hostname)) return false;
    return ALLOWED_OG_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
```

Call `isSafeOgUrl(twitter_url)` before `fetchOgMetadata`. Return empty OG data if the check fails.

---

### CRIT-3: Nonce replay window on wallet link — invalidation failure is silently swallowed

**File:** `src/app/api/auth/link-wallet/route.ts`

**Severity:** CRITICAL — authentication replay attack window

**Details:**

After verifying the Ed25519 signature, the route updates `used_at` on the nonce to invalidate it. If that update fails, the code deliberately continues:

```typescript
// line ~99
// Continue even if marking nonce fails - validation was successful
```

If the `UPDATE` to set `used_at` races or fails (DB contention, network hiccup, Supabase timeout), the nonce remains valid in the DB. A second request using the same signed message can arrive before the record expires and successfully link the wallet — bypassing the one-time-use guarantee.

This is particularly dangerous because the attacker doesn't need to control the signing key: they only need to intercept or replay the HTTP request (e.g., a captured SIWS payload from a MITM or a shared-device browser).

**Fix:** The nonce invalidation must be atomic and the route must fail hard if it cannot be confirmed. Wrap nonce verification and invalidation in a single DB transaction or use an atomic `UPDATE ... WHERE used_at IS NULL RETURNING id`. If the `RETURNING` set is empty, reject the request with 409 Conflict — do not continue.

```typescript
const { data: invalidated } = await supabase
  .from('wallet_nonces')
  .update({ used_at: new Date().toISOString() })
  .eq('nonce', nonce)
  .is('used_at', null)          // atomic: only succeeds if not yet used
  .select('id');

if (!invalidated || invalidated.length === 0) {
  return NextResponse.json({ error: 'Nonce already used or expired' }, { status: 409 });
}
```

---

## HIGH Findings

### HIGH-1: Middleware rate limit bypass via spoofable `User-Agent` header

**File:** `src/middleware.ts` (lines 61–66)

**Severity:** HIGH — all rate limiting defeatable by any client

**Details:**

```typescript
function isInternalSystemRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') ?? '';
  return (
    userAgent.includes('Next.js') ||       // ← any client can set this
    request.headers.has('x-middleware-subrequest')
  );
}
```

Any HTTP client that sets `User-Agent: Next.js` bypasses all middleware rate limiting. The `x-middleware-subrequest` branch is correctly neutralized by CVE-2025-29927 mitigation elsewhere in the middleware, but the `User-Agent` branch remains exploitable.

**Fix:** Remove the `userAgent.includes('Next.js')` branch entirely. Next.js internal subrequests should be identified via the `x-middleware-subrequest` header alone, which is already stripped from external requests at line 231.

---

### HIGH-2: In-memory rate limiting is ineffective on serverless deployments

**File:** `src/lib/rate-limit.ts`

**Severity:** HIGH — rate limiting provides no protection when `UPSTASH_REDIS_REST_URL` is absent

**Details:**

The in-memory fallback uses a module-level `Map` that resets on every serverless function cold start. On Vercel, each request may land on a fresh instance with a clean slate. The code logs a warning but does not fail or block:

```typescript
if (process.env.NODE_ENV === 'production' && (!process.env.UPSTASH_REDIS_REST_URL || ...)) {
  console.warn('[SECURITY] Rate limiting is using in-memory fallback in production...');
}
```

The warning is only visible in server logs, not enforced. An attacker with basic tooling can trivially exceed any rate limit.

**Fix:** In production, if Upstash credentials are missing, either:
(a) Throw an error at startup to force correct configuration, or
(b) Return a 503 from the rate limit check with a clear operator-facing log entry.

Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in all Vercel environments.

---

### HIGH-3: RLS allows any authenticated user to self-insert `golden_eggs` records

**File:** `supabase/migrations/20260331000001_egg_hunt.sql`

**Severity:** HIGH — game economy bypass; egg discovery not enforced server-side

**Details:**

```sql
CREATE POLICY "golden_eggs_insert_authenticated"
  ON public.golden_eggs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

Any authenticated user can `INSERT INTO public.golden_eggs (user_id, element, egg_number, ...) VALUES (auth.uid(), 'cosmic', 1, ...)` directly via the Supabase client. The RLS check only verifies that `user_id` matches the calling user — it does not verify that the egg was legitimately discovered via the game mechanism.

This policy was written for the live Easter 2026 campaign. Although the campaign data has been archived (PR #106), the `golden_eggs` table and this policy still exist. If any future campaign reuses this table, the bypass reactivates.

**Fix:** Remove the INSERT policy from the `golden_eggs` table and ensure all egg grants go through a `service_role` function or a Postgres function with `SECURITY DEFINER` that validates discovery conditions before inserting. If the table is permanently retired, lock it down entirely:

```sql
REVOKE ALL ON public.golden_eggs FROM authenticated;
REVOKE ALL ON public.golden_eggs FROM anon;
```

---

## MEDIUM Findings

### MED-1: `token-balance` endpoint has no authentication — enables wallet financial surveillance

**File:** `src/app/api/solana/token-balance/route.ts`

**Severity:** MEDIUM — information disclosure; no direct exploit but enables targeted attacks

**Details:**

The endpoint accepts a `wallet` query parameter and returns the SPL token balance for that wallet with no authentication check. Any unauthenticated actor can query the balance of any wallet address, building a financial profile of users by cycling through known organic_id → wallet mappings from the public leaderboard.

**Fix:** Add `supabase.auth.getUser()` and reject unauthenticated callers with 401. If the endpoint must remain public for wallet-verification UX before login, consider rate limiting it aggressively by IP (using Upstash, not the in-memory fallback).

---

## LOW Findings

### LOW-1: `escapePostgrestValue` mitigates PostgREST injection but is not documented as a security boundary

**File:** `src/lib/security.ts`, used in `src/app/api/posts/route.ts`

**Severity:** LOW — defense in depth gap; not an active exploit

**Details:**

`escapePostgrestValue` is applied to the `search` parameter before passing it into a `.or(... ilike ...)` filter. This is the correct pattern for PostgREST `.or()` filters, which do not accept bound parameters. The implementation should be documented with a comment noting why it exists and what it protects against, so future maintainers do not remove it as "unnecessary".

**Fix:** Add a comment above the call site explaining that PostgREST `.or()` does not support parameterized values and that `escapePostgrestValue` is a required security boundary.

---

### LOW-2: `claimable_points` exposed in leaderboard is a separate concern from the email leak

**File:** Same as CRIT-1

**Severity:** LOW (financial information disclosure — lower risk than email PII)

**Details:**

Even after removing `email`, `claimable_points` would remain exposed to `anon`. Claimable balance is internal economic data. Exposing it publicly allows competitors or bad actors to identify and target high-value accounts. This should be removed from the public leaderboard view along with `email`.

---

## Out of Scope / Blockers

- **Supabase RLS policies on other tables** (proposals, tasks, votes, disputes): Not fully audited. The `translations` RLS hotfix (`20260416000000_translations_rls_hotfix.sql`) correctly tightened an overly permissive policy. Other tables should be audited in a follow-on pass.
- **Dependency audit**: `npm audit` not run in this session. A separate dependency CVE scan should be scheduled.
- **CSP nonce effectiveness**: The nonce implementation in `src/middleware.ts` looks correct (per-request random nonce, passed to components). No `'unsafe-inline'` fallback observed. Full CSP header validation against browser devtools was not performed.
- **Solana consensus verifier edge cases**: The multi-RPC consensus verifier logic was reviewed at a high level and appears sound. Formal verification of the consensus threshold and fallback behavior is out of scope for this audit.
- **File upload MIME bypass**: The upload allowlist (mime type + extension) was confirmed to exist. File content sniffing and polyglot file attacks were not tested.
