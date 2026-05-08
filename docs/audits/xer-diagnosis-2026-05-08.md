# XER (X Engagement Rewards) Zero-Output Diagnosis — 2026-05-08

## TL;DR

The cron **is** running. The data pipeline has **no inputs**.

`processEngagementTick` walks an empty list of `engagement_handles` (or fails to obtain a Twitter crawler token), returns `processedEngagements: 0`, and the GitHub Actions schedule logs nothing alarming. Three operator-side preconditions are missing in production. Once seeded, the cron should start producing output on its next 15-minute tick.

---

## How the system is plumbed

- **Schedule:** `.github/workflows/engagement-poll.yml` runs `*/15 * * * *` and hits `POST /api/internal/engagement/poll` with `Authorization: Bearer ${CRON_SECRET}`. Confirmed working — `vercel.json` does *not* contain these crons because the original PR (#77) called out that Vercel Hobby caps cron at daily, so they were moved to GitHub Actions on purpose.
- **Auth:** `/api/internal/engagement/poll` checks `CRON_SECRET` and returns 503 if unset, 401 on mismatch, then calls `processEngagementTick(serviceClient)`. The cron handler always returns 200 (even on soft failure) to avoid retry spam — so the GitHub Actions log is **always green** regardless of whether anything was processed. This is the surface symptom.
- **Pipeline:** `processEngagementTick` runs three phases:
  1. **Acquire crawler token** — load first `twitter_accounts` row with `is_active = true`, decrypt access token using `TWITTER_TOKEN_ENCRYPTION_KEY`, refresh if within 60s of expiry. If anything fails ⇒ `{ ok: false, error: 'no_crawler_token' }` and exit.
  2. **Discover new posts** — for each row in `engagement_handles WHERE is_active = true`, call `twitter.fetchPostsByHandle()` and upsert into `engagement_posts`. Empty handle table ⇒ silent zero.
  3. **Process engagements on open posts** — for each `engagement_posts` where `engagement_window_ends_at > now()`, call Twitter verify-like / verify-retweet / fetch-replies for every user in `loadEligibleLinkedAccounts` (twitter_accounts.is_active=true AND user_profiles.organic_id IS NOT NULL). Insert `engagement_submissions` rows. No open posts OR no eligible users ⇒ zero processed.

---

## Root-cause analysis (ranked)

### #1 — `engagement_handles` is empty in production (highest probability)

- The table is created by `supabase/migrations/20260424000000_engagement_xp.sql` but **no migration seeds a row**. I grepped:
  ```bash
  grep -n "INSERT INTO public.engagement_handles\|INSERT INTO engagement_handles" supabase/migrations/*.sql
  # → no matches
  ```
- The admin route `POST /api/admin/engagement/handles` exists for adding handles, but per memory + PR #77 message: **"UI is intentionally out of scope … per CLAUDE.md organic-ux rules, UI surfaces require a clarification round before build."** So no admin-facing UI shipped, and no one has ever called the API to add `@organic_bonk` (or whatever the org's tracked handle should be).
- Result: `discoverNewPosts` iterates an empty array, returns 0 discovered, and the loop over `openPosts` has nothing to process.

### #2 — `TWITTER_TOKEN_ENCRYPTION_KEY` may not be set in production

- `loadCrawlerToken` short-circuits with `logger.error('TWITTER_TOKEN_ENCRYPTION_KEY not set')` and returns `null` if the env var is missing. The cron then returns `{ ok: false, error: 'no_crawler_token' }`.
- Cannot verify from the repo whether Vercel production has this var set (no `vercel env` access). Per memory: *"likely env var"* missing.
- If this var is unset, fix #1 alone is insufficient — discovery would still fail.

### #3 — No active `twitter_accounts` row with a valid encrypted token

- Even with `TWITTER_TOKEN_ENCRYPTION_KEY` set, `loadCrawlerToken` requires at least one row in `twitter_accounts` where `is_active = true` and `access_token_encrypted` is decryptable.
- An admin/council member must have linked Twitter via the OAuth PKCE flow at `/api/twitter/link/start`. If no admin has done this in production, the crawler has no identity to authenticate as.

### #4 — Even if 1–3 are fixed, no users will earn XP until they link Twitter

- `loadEligibleLinkedAccounts` filters to `twitter_accounts.is_active = true AND user_profiles.organic_id IS NOT NULL`. If users haven't completed the Twitter-link UX, even discovered posts produce zero submissions.
- This is a UX/engagement issue, not a code bug. But it explains why even after fixing #1–3, output may stay near zero until users adopt.

### #5 — `engagement_rubric_examples` empty would skip comment scoring

- `loadRubricExamples` SELECTs from `engagement_rubric_examples`. Likes and retweets work without it, but comments require at least one rubric example or `scoreComment` will misbehave (the prompt expects examples).
- Per the schema, this table is also created without a seed. Likely empty in prod.

---

## Verification queries (operator runs in Supabase)

```sql
-- (1) handles table populated?
SELECT count(*) AS active_handles FROM engagement_handles WHERE is_active;

-- (2) at least one admin/council twitter_accounts active?
SELECT ta.id, up.role, ta.is_active, ta.token_expires_at
FROM twitter_accounts ta
JOIN user_profiles up ON up.id = ta.user_id
WHERE ta.is_active = true AND up.role IN ('admin','council');

-- (3) discovered posts in current window?
SELECT count(*) AS open_posts
FROM engagement_posts
WHERE is_excluded = false
  AND engagement_window_ends_at > now();

-- (4) eligible verified members?
SELECT count(*) AS eligible_linked
FROM twitter_accounts ta
JOIN user_profiles up ON up.id = ta.user_id
WHERE ta.is_active = true AND up.organic_id IS NOT NULL;

-- (5) rubric examples seeded?
SELECT count(*) AS active_rubrics FROM engagement_rubric_examples WHERE is_active;

-- (6) anything ever submitted?
SELECT count(*) AS total_submissions FROM engagement_submissions;
```

If (1) returns 0 → primary blocker.
If (2) returns 0 → secondary blocker even after (1) fixed.
If (4) returns 0 → no users will earn XP regardless.

---

## Recommended fix sequence

### Step 1 — Verify `TWITTER_TOKEN_ENCRYPTION_KEY` in Vercel production

```bash
vercel env ls production | grep TWITTER_TOKEN_ENCRYPTION_KEY
# If absent, generate a key locally and set it:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" \
  | xargs -I {} vercel env add TWITTER_TOKEN_ENCRYPTION_KEY production
```

If the key was rotated mid-production, **previously-encrypted tokens become unreadable and users must re-link**. Do this only if you confirm it is genuinely missing.

### Step 2 — Have an admin/council member link Twitter

- Sign in as an admin or council member.
- Visit `/profile` (or wherever the "Link Twitter" button lives) and complete OAuth.
- After success, `twitter_accounts` will have a fresh `is_active = true` row.

### Step 3 — Seed at least one allowlisted handle

Use the existing admin endpoint:

```bash
curl -X POST https://organichub.fun/api/admin/engagement/handles \
  -H "Cookie: <admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{"handle":"organic_bonk","display_name":"Organic Bonk","is_active":true}'
```

(Per memory: `@organic_bonk` is the org's canonical X handle.)

### Step 4 — Seed at least one rubric example for comment scoring

The UI for this isn't built. Direct SQL is the path of least resistance:

```sql
INSERT INTO engagement_rubric_examples (comment, ideal_score, rationale, is_active)
VALUES
  ('Great take on tokenomics — the emission curve really does favor long-term holders.',
   8, 'Substantive, on-topic, references specifics.', true),
  ('Bullish 🚀🚀🚀',
   2, 'Generic shilling, no substance.', true),
  ('lol nice',
   1, 'Empty engagement.', true);
```

### Step 5 — Wait one tick

Within ≤ 15 minutes, the next GitHub Actions cron will fire. Verify:

```sql
SELECT count(*) FROM engagement_posts WHERE created_at > now() - interval '30 minutes';
SELECT count(*) FROM engagement_submissions WHERE awarded_at > now() - interval '30 minutes';
```

If post discovery works but submissions stay at 0, jump back to query (4) — users haven't linked their Twitter accounts yet.

---

## Observability gap (recommended follow-up, NOT in this PR)

The cron returns 200 OK with `{ ok, discoveredPosts, processedEngagements, error? }` in the JSON body, but the GitHub Actions step only checks the HTTP status. Operators have no signal when the pipeline silently produces zero.

Two small improvements would dramatically reduce future "0 output" mystery debugging:

1. **`processEngagementTick` should return a richer precondition diagnostic.** Replace the single `error: 'no_crawler_token'` string with an enum:
   ```ts
   type Precondition =
     | 'missing_encryption_key'
     | 'no_active_twitter_accounts'
     | 'token_decrypt_failed'
     | 'token_refresh_failed'
     | 'no_active_handles'
     | 'no_open_posts'
     | 'no_eligible_users'
     | 'no_rubric_examples';
   ```
   Then expose the failed precondition in the response so the cron output makes the failure visible.

2. **The GitHub Actions workflow should fail (non-zero exit) on `ok: false` OR on `processedEngagements: 0` for N consecutive runs.** This converts silent pipeline starvation into a paged alert. Or add a Sentry breadcrumb on every "0 output" path so it shows up in production alerting.

I deliberately did **not** change the cron in this PR because:

- (a) Phase 4 brief was "Fix it OR write a clear diagnosis" — the actual blockers (handles seed, env var, Twitter linking) are operator-side, not code-side.
- (b) Adding rich diagnostics is a non-trivial schema change (new return fields → consumer updates → tests) and falls outside the surgical-changes rule for this hardening pass.

A follow-up issue should track item (1) above as a small hardening.

---

## Summary

| Finding | Severity | Owner | Fix |
|---|---|---|---|
| `engagement_handles` empty in prod | HIGH | Operator (admin) | POST /api/admin/engagement/handles for `@organic_bonk` |
| `TWITTER_TOKEN_ENCRYPTION_KEY` likely missing | HIGH | Operator (env) | Verify with `vercel env ls production` and set if missing |
| No admin has linked Twitter (active token) | HIGH | Operator (admin) | Admin completes OAuth flow at /profile |
| `engagement_rubric_examples` empty | MEDIUM | Operator (DB) | Seed 3+ example comments via SQL |
| Cron silently returns 200 on zero output | LOW | Code (follow-up) | Add precondition enum to processEngagementTick result |
| Users have not linked Twitter | LOW (UX) | Engagement/marketing | Promote /profile → Link X flow |

No code fix is appropriate at this layer. The diagnostic and verification queries above unblock the operator.
