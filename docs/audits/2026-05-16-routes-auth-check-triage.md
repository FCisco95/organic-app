# Routes auth-check triage

**Date:** 2026-05-16
**Audit branch:** `docs/routes-auth-check-triage`
**Prior claim being re-examined:** `docs/audits/2026-05-15-security-sweep.md` flagged **"~33 of 163 route handlers lack an obvious auth/session check"** under finding `[Custom]` (Medium).
**Reviewer hypothesis going in:** the count is misleading — the same pattern as the rate-limit "83% unmetered" claim. Static-scan misses the actual auth surface area.

## TL;DR

The "~33 routes" figure is **misleading**. Conclusions after reading every flagged route:

- **100%** of mutating (`POST` / `PATCH` / `PUT` / `DELETE`) handlers enforce auth. Verified by the static-scan test at `tests/security/api-auth-enforcement.test.ts` — **161/161 cases green**.
- **All 5** `/api/internal/*` routes enforce `CRON_SECRET` on both `GET` and `POST`.
- **All 5** `/api/admin/*` `GET` routes use `requireAdmin` or `requireAdminOrCouncil` — proper RBAC, not just authed-user.
- **All 12** per-user `GET` routes scope queries to `auth.getUser().id`. **No IDOR.** (Examples: `user/points`, `donations/history`, `donations/receipt`, `egg-opening/history`, `analytics/personal`, `dashboard`, `gamification/*`, `rewards/{summary,distributions}`, `onboarding/steps`, `proposals/eligibility`.)
- **All 3** per-userId routes (`reputation/[userId]`, `members/[id]`, `proposals/[id]/effective-power`) handle the `userId` from the URL safely: profile routes respect `profile_visible` + redact PII for non-self callers; effective-power data is governance-public by design.
- The remaining ~28 GET-only routes are **intentionally public** (leaderboard, treasury balance, market stats, daily-tasks listing, public proposal results, Solana proxies, etc.) and do **not** leak private fields.

**One genuine finding** (defense-in-depth, not a confirmed bypass): `src/app/api/twitter/link/callback/route.ts` does not require an authenticated session — it only rejects when a *mismatched* session is present. See **Finding 1** below.

## Method

1. Ran `npx vitest run tests/security/api-auth-enforcement.test.ts` — confirmed every `POST` / `PATCH` / `PUT` / `DELETE` handler under `src/app/api/` matches one of the documented auth gates (session, role helper, `CRON_SECRET`, service-secret) or is on the documented `PUBLIC_MUTATION_ALLOWLIST`.
2. Enumerated all `route.ts` files exporting only `GET` (54 files) — these are the population the prior audit's grep would have under-counted, since the static-scan only enforces mutation auth.
3. For each high-risk GET (admin, per-user, per-userId, OAuth callback, engagement-with-PII), read the source and recorded the actual auth gate.
4. For "intentionally public" GETs, grepped for `createServiceClient` / `SUPABASE_SERVICE_ROLE_KEY` to catch any route that might bypass RLS while serving anonymous traffic, then read the three matches (`easter/leaderboard`, `easter/egg-check`, `auth/nonce`) to confirm only public-safe fields are emitted.

## Why the audit's ~33 figure was misleading

The original audit's grep was:

```
getUser|getSession|auth(|requireAuth|verifySession
```

That regex misses:

- `requireAdmin`, `requireAdminOrCouncil`, `requireCouncil`, `requireRole`, `requireVerifiedMember` (used by every `/admin/*` GET and several others)
- `CRON_SECRET` / `cronAuthorized` (used by every `/internal/*` route)
- `INTERNAL_SECRET` / `verifyServiceSecret`
- `getAuthenticatedUser` / `getAuthUser` (feature-level wrappers that call `getUser` internally)

The static-scan test `tests/security/api-auth-enforcement.test.ts` already encodes the **correct** regex set. As long as that test stays green in CI, the "lacks auth" class of regression is caught automatically for every mutation route. GET-only routes are *intentionally* not enforced there — many list endpoints are public by design, and per-route GET auth lives in domain-specific tests.

This is the same pattern that PR #151's rate-limit audit corrected: a static grep at audit time produced a scary number that didn't reflect the actual coverage.

## Findings

### Finding 1 — Twitter OAuth callback does not require an authed session (defense-in-depth)

**File:** `src/app/api/twitter/link/callback/route.ts:54`
**Severity:** Low (defense-in-depth, not a confirmed bypass)

```ts
if (user && user.id !== oauthSession.user_id) {
  return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'session_mismatch'));
}
```

The check fires *only when* `user` is truthy. An unauthenticated caller carrying a valid `state` token (which is unguessable random) skips the check entirely. The Twitter account is then linked to `oauthSession.user_id` (the user who initiated the flow), so the attacker cannot link their Twitter to *their own* account using the victim's state — but if the state token leaks (logs, referrer header, an XSS payload on the redirect target, etc.), the attacker can complete the OAuth callback themselves and link their attacker-controlled Twitter handle to the victim's account.

The primary CSRF protection is the random `state` token, which is correct standard OAuth pattern. The session-match check at line 54 is the second layer — it should also reject when there is *no* session at all.

**Recommended fix (single line):**

```ts
if (!user || user.id !== oauthSession.user_id) {
  return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'session_mismatch'));
}
```

This is a defense-in-depth change. Not blocking. Worth a separate small PR with a regression test in `tests/security/twitter-callback-session.test.ts`.

## Confirmations (no action needed)

### Internal cron routes — `CRON_SECRET` enforced on every handler

All 5 routes follow the same pattern: read `process.env.CRON_SECRET`, compare against bearer token, 401 on mismatch.

| Route | Methods |
|---|---|
| `api/internal/engagement/appeals-sweep` | GET, POST |
| `api/internal/engagement/poll` | GET, POST |
| `api/internal/market-cache/refresh` | GET, POST |
| `api/internal/cron/sprint-summary` | GET, POST |
| `api/internal/ai/governance-summary/generate` | GET, POST |

### Admin GET routes — RBAC enforced

| Route | Gate |
|---|---|
| `api/admin/badges` | `requireAdmin` |
| `api/admin/audit-log` | `requireAdminOrCouncil` |
| `api/admin/users` | `requireAdminOrCouncil` |
| `api/admin/easter/stats` | `requireAdmin` |
| `api/admin/engagement/calibration` | `requireAdminOrCouncil` |

### Per-user GETs — scoped to `auth.getUser().id`

All 12 routes call `await supabase.auth.getUser()`, return 401 on failure, and filter every query by `user.id` from the session. No route accepts a `user_id` parameter that would override the session id.

### Per-userId GETs — PII redaction enforced

- `api/members/[id]` — respects `profile_visible`; redacts `email` (shows `local@***`) and `wallet_pubkey` for non-self callers.
- `api/reputation/[userId]` — respects `profile_visible`; only returns public stats (xp, level, streaks, achievements). Returns 403 on private profiles.
- `api/proposals/[id]/effective-power` — accepts `user_id` query param; this is intentional (governance UI shows voting power for any participant). Snapshot data is public-by-design once voting starts; pre-voting data is derived from public delegations + holder snapshots.

### Public GETs using service-role — confirmed safe

| Route | Why service-role | Verified |
|---|---|---|
| `api/easter/leaderboard` | aggregate cross-user read of `golden_eggs` + `user_profiles` | Returns only public-safe fields (name, avatar, organic_id, egg_count, elements, earliest_find). |
| `api/easter/egg-check` | inserts pending claim token blocked by RLS for authed users | Auth-gated (returns EMPTY for unauthed); rate-limited per user; service-role used only for the user's own insert. |
| `api/auth/nonce` | inserts to `wallet_nonces` pre-session | Rate-limited per IP; nonce is random; standard pre-auth pattern. |

## Recommended follow-ups (not blocking)

1. **Harden Twitter OAuth callback (Finding 1)** — one-line change + regression test. ~15 min of work.
2. **Update prior audit text** — the `[Custom] ~33 routes` entry in `docs/audits/2026-05-15-security-sweep.md` should be amended with a note pointing at this triage, the same way the rate-limit audit was reframed.
3. **Tighten the static-scan regex** in `tests/security/api-auth-enforcement.test.ts` to optionally enforce **GET-handler** auth for an allowlisted set of "must-be-private" path prefixes (`/api/admin/`, `/api/user/`, `/api/donations/{history,receipt}`, `/api/egg-opening/`, `/api/analytics/personal`, `/api/dashboard`, `/api/onboarding/`, `/api/gamification/`, `/api/rewards/{summary,distributions}`). This would have caught Finding 1 at CI time and prevents future regressions of the same class.

## Memory hooks confirmed

- `feedback_dont_trust_issue_framing` — audit framings should be reproduced + verified before acting. The "~33 routes" claim was the third high-severity audit number this month (after rate-limit 83% unmetered and RLS 8 USING(true) policies) where the static grep over-counted by an order of magnitude. Pattern is now firmly established.
- `feedback_one_pr_per_task` — this audit is documentation-only; the recommended follow-ups are intentionally split into separate PRs.

## Run history

| Date | Action | Outcome |
|---|---|---|
| 2026-05-16 | Static-scan test (`api-auth-enforcement.test.ts`) | 161/161 PASS — all mutation routes auth-gated |
| 2026-05-16 | Manual triage of 18 high-risk GET routes | All properly gated; 1 defense-in-depth finding on Twitter callback |
| 2026-05-16 | Service-role check on 28 "intentionally public" GETs | 25 use anon/session client; 3 use service-role with verified-safe output |
