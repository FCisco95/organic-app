# Rate-Limit Tightening Audit — 2026-05-16

Follow-up to PR #135's `[NX-auth] Rate-limit coverage gap` finding (`docs/audits/2026-05-15-security-sweep.md:127-130`). That finding claimed "only ~28 (17%) reference a rate-limit primitive" and framed it as an 83% coverage gap. **That framing is misleading.** Re-reading `src/middleware.ts:61-99` shows every `/api/*` route receives a default rate-limit policy from middleware. The actual question is whether the default is appropriate for each route's risk profile.

## Coverage reality

Middleware applies these defaults via `getApiRateLimitPolicy()`:

| Bucket | Match | Limit | Scope |
|---|---|---|---|
| `auth` | `/api/auth/{nonce,link-wallet}` | 10/min | IP |
| `sensitive` | `/api/settings/*`, `/api/rewards/claims/*`, `/api/rewards/distributions/manual`, `/api/organic-id/assign` | 5/min | user |
| `translate` | `/api/{posts,proposals,ideas,tasks}/*/translate`, `/api/translate/comment/*` POST | 20/hour | user |
| `solana-proxy` / `solana-proxy-user` | `/api/solana/*` GET | 100/min IP or 300/min user | both |
| `dashboard-read` | `/api/stats`, `/api/analytics`, `/api/leaderboard`, `/api/treasury` GET/HEAD | 300/min | IP |
| `read` | any other GET/HEAD | 100/min | IP |
| **`write` (default fallback)** | **any other POST/PATCH/PUT/DELETE** | **20/min** | **user (or IP if anon)** |

25 routes already layer a stricter per-route limit on top (see `grep -l applyUserRateLimit src/app/api/**/route.ts`).

`RATE_LIMITS` aliases that are **identical to default `write` 20/min** and offer no real tightening: `proposalCreate`, `disputeCreate`, `taskSubmission`. Treat these as no-ops at the time of writing.

## Findings

Default `write` 20/min/user is appropriate for routine mutations (notification reads, profile edits, etc.) but too loose for several risk categories below. Each finding lists routes currently under default, the abuse vector, and a recommended bucket.

### HIGH — Privileged admin mutations (10 routes)

Routes that grant points/badges, restrict accounts, edit governance config, or run privileged ops. 20/min/user means a compromised admin token can do 1,200 admin actions per hour before throttling.

- `POST /api/admin/badges/award`
- `POST /api/admin/users/restrict`
- `POST /api/admin/users/flag-check`
- `POST/DELETE /api/admin/campaigns/[id]`
- `POST /api/admin/campaigns`
- `POST/DELETE /api/admin/quests/[id]`
- `POST /api/admin/quests`
- `POST /api/admin/engagement/calibration`, `…/[id]`
- `POST /api/admin/gamification/config`
- `POST /api/admin/easter/config`

**Recommendation:** new preset `RATE_LIMITS.adminWrite = { limit: 10, windowMs: 60_000 }` (10/min/user). Tighter than `write` but not as tight as `sensitive` (5/min) so legitimate admin tooling still works. Apply via a `SENSITIVE_RATE_LIMIT_PREFIXES`-style allowlist: `/api/admin/*` POST/PATCH/PUT/DELETE.

### HIGH — Cost-bearing operations (4 routes)

Routes that move value, burn points, or call expensive external APIs. 20/min/user is a real money/credit drain at the upper limit.

- `POST /api/gamification/burn` — burns user points; tight rate-limit prevents accidental-double-spend race conditions and cost-attack patterns.
- `POST /api/profile/upload-avatar` — file upload to Supabase Storage; metered storage bandwidth.
- `POST /api/twitter/link/start` — initiates OAuth dance, consumes Twitter API quota.
- `GET /api/twitter/link/callback` — completes OAuth; usually fine via flow design, but worth a bucket.

**Recommendation:** new preset `RATE_LIMITS.costly = { limit: 3, windowMs: 60_000 }` (3/min/user), or reuse `sensitive` (5/min) where 3/min would frustrate legitimate UX.

### HIGH — Governance-mutating ops (5 routes)

Proposals are token-weighted; vote-spam or rapid proposal churn distorts governance.

- `POST /api/proposals` — proposal creation. Domain logic enforces `proposer_cooldown_days` so DB-level throttling exists, but rate-limit defense-in-depth is still valuable.
- `POST /api/proposals/[id]/vote` — token-weighted voting.
- `POST /api/proposals/[id]/start-voting` — admin/council only; should be `adminWrite` once that exists.
- `POST /api/proposals/[id]/finalize` — admin/council only; same.
- `POST /api/proposals/[id]/execute` — admin/council only; same.

**Recommendation:** vote POST gets `sensitive` (5/min/user) — voters typically vote once per proposal so 5/min is generous. Proposal lifecycle ops (`start-voting`, `finalize`, `execute`) fold under the proposed `adminWrite` 10/min/user.

### MEDIUM — Reward/sprint payout chain (4 routes)

Already partially covered by the `sensitive` prefix (`/api/rewards/claims/*` matches). The uncovered ones:

- `POST /api/sprints/[id]/complete` — triggers reward distribution.
- `POST /api/sprints/[id]/start` — opens a new sprint.
- `POST /api/submissions/[id]/review` — admin reviews a submission, grants points.
- `POST /api/rewards/distributions/route.ts` — list/create rewards distribution (manual is already in `sensitive`; the bulk route is not).

**Recommendation:** add `/api/sprints/[id]/{start,complete}`, `/api/submissions/[id]/review`, and `/api/rewards/distributions` to the `sensitive` prefix list (5/min/user).

### MEDIUM — Dispute lifecycle (5 routes)

Disputes carry stake/reputation. Resolve/mediate are admin actions that touch user state.

- `POST /api/disputes` — dispute creation.
- `POST /api/disputes/[id]/appeal` — appeal (already user-scoped, no explicit limit).
- `POST /api/disputes/[id]/resolve` — admin/council.
- `POST /api/disputes/[id]/mediate` — admin/council.
- `POST /api/disputes/[id]/assign` — admin/council.
- `POST /api/disputes/[id]/respond` — disputant respond.

**Recommendation:** `disputes/{[id]/resolve,[id]/mediate,[id]/assign}` → `adminWrite` 10/min. `/api/disputes` POST + appeal → `sensitive` 5/min (low frequency, high consequence).

### MEDIUM — Marketplace and engagement money flows (4 routes)

- `POST /api/marketplace/boosts` — purchases a boost; financial.
- `POST /api/marketplace/boosts/[id]/engage` — engagement-for-rewards interaction.
- `POST /api/engagement/posts` — submits an engagement task.
- `POST /api/engagement/appeals/[id]/vote`, `POST /api/engagement/submissions/[id]/appeal` — appeals/votes in the engagement marketplace.

**Recommendation:** boost POST and appeal POST → `sensitive` 5/min/user. Engagement task submission → `costly` 3/min/user (one of these per minute is plenty).

### LOW — Comments and anti-spam (already covered)

`/api/{posts,ideas,proposals}/[id]/comments` already use `applyUserRateLimit` with `RATE_LIMITS.comment` (3/min/user) at the route level. **No change needed.**

### Cron / internal — defence-in-depth

`/api/internal/cron/*` and `/api/internal/{ai,engagement}/*` routes are guarded by `CRON_SECRET` bearer-token checks (already implemented per `internal/cron/sprint-summary/route.ts`). They still receive the middleware `write` 20/min/user default — fine, since legitimate cron invocations are infrequent and the secret check is the actual control. No change needed.

## Proposed rate-limit presets

Add to `src/lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  // ... existing ...
  /** Privileged admin mutations: 10/min per user */
  adminWrite: { limit: 10, windowMs: 60_000 },
  /** Cost-bearing operations (burns, uploads, paid external APIs): 3/min per user */
  costly: { limit: 3, windowMs: 60_000 },
} as const;
```

## Proposed middleware policy changes

Extend `SENSITIVE_RATE_LIMIT_PREFIXES` and add new prefix/path groups:

```typescript
const SENSITIVE_RATE_LIMIT_PREFIXES = [
  '/api/settings',
  '/api/rewards/claims',
  '/api/rewards/distributions',           // was /manual only; widen to all
  '/api/organic-id/assign',
  '/api/sprints/',                        // captures /api/sprints/[id]/{start,complete}; the bare list GET is read
  '/api/submissions/',                    // captures /api/submissions/[id]/review
  '/api/disputes',                        // captures POST /api/disputes + nested mutations not in adminWrite
  '/api/marketplace/boosts',              // captures POST /api/marketplace/boosts and /[id]/engage
];

const ADMIN_WRITE_PREFIXES = ['/api/admin'];
const ADMIN_WRITE_PATHS = new Set([
  '/api/proposals/{id}/start-voting',     // route-pattern, encoded in matcher
  '/api/proposals/{id}/finalize',
  '/api/proposals/{id}/execute',
  '/api/disputes/{id}/resolve',
  '/api/disputes/{id}/mediate',
  '/api/disputes/{id}/assign',
]);

const COSTLY_PATHS = new Set([
  '/api/gamification/burn',
  '/api/profile/upload-avatar',
  '/api/twitter/link/start',
  '/api/twitter/link/callback',
  '/api/engagement/posts',
]);
```

Logic to add in `getApiRateLimitPolicy` (mutating methods only):

```typescript
if (method !== 'GET' && method !== 'HEAD') {
  if (COSTLY_PATHS.has(pathname)) {
    return { bucket: 'costly', config: RATE_LIMITS.costly, scope: 'user' };
  }
  if (
    ADMIN_WRITE_PREFIXES.some((p) => pathname.startsWith(p)) ||
    matchesPattern(ADMIN_WRITE_PATHS, pathname)
  ) {
    return { bucket: 'admin-write', config: RATE_LIMITS.adminWrite, scope: 'user' };
  }
}
```

For vote tightening (POST `/api/proposals/[id]/vote` → sensitive), either:
- Add `/api/proposals/{id}/vote` to a `VOTE_RATE_LIMIT_PATTERN` regex, or
- Apply route-level `applyUserRateLimit(user.id, 'proposal-vote', RATE_LIMITS.sensitive)` directly in the route file.

## Risk if no action

- Compromised admin session: 1,200 admin mutations/hour vs. proposed 600/hour. Cuts blast radius in half.
- Compromised user session: 1,200 burns or uploads per hour vs. proposed 180. ~7× tighter on cost-bearing ops.
- Vote-spam vector: 1,200 vote calls per hour per attacker session, even though `votes.UNIQUE(proposal_id, voter_id)` prevents repeat votes on the same proposal — attacker could still try mass-creating proposals and voting on each. Tighter limit defends against this.

## Sequencing

Recommend a single follow-up PR with all of the above bundled. Roughly:

1. Add `adminWrite` + `costly` presets to `RATE_LIMITS`.
2. Extend `SENSITIVE_RATE_LIMIT_PREFIXES` and add `ADMIN_WRITE_*` / `COSTLY_*` matchers in middleware.
3. Add a `VOTE_RATE_LIMIT` matcher for `/api/proposals/{id}/vote` POST → sensitive.
4. Tests:
   - Existing `tests/security/api-auth-enforcement.test.ts` already exercises bucket selection; add cases for the new buckets.
   - New regression test that asserts admin POST routes map to `adminWrite`.
5. No DB migration required.

## Status

- Coverage reality: PASS (100% of /api/* routes already metered).
- Per-route appropriateness: 32 routes flagged for tightening, grouped into HIGH (19), MEDIUM (13), LOW (already covered).
- Estimated PR size: ~80 LoC in middleware/rate-limit + ~50 LoC tests. One self-contained PR.

## Files referenced

- `src/middleware.ts:61-99` — current policy selector.
- `src/lib/rate-limit.ts:407-436` — `RATE_LIMITS` presets.
- `docs/audits/2026-05-15-security-sweep.md:127-130` — original (misleading) finding.
