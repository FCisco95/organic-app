# CI Pipeline: Supabase `organic-app-ci` Setup

**Date**: 2026-02-24
**Updated**: 2026-02-25
**Status**: All known failures addressed — awaiting CI confirmation
**Latest commit**: pending (fixes voting-config filter, profile link, rewards selector, task FK hints)

---

## Goal

Set up a dedicated Supabase project (`organic-app-ci`, ref: `rrsftfoxcujsacipujrr`) for CI E2E tests so the pipeline doesn't touch the production database.

---

## What was done

### 1. GitHub Secrets (done)

All 3 secrets set using **legacy JWT keys** (not publishable keys):

| Secret | Source |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rrsftfoxcujsacipujrr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon key from Settings > API > Legacy tab |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service_role key from same tab |

### 2. CSP fix (done, committed)

Added `https://*.ingest.sentry.io` to `connect-src` in `next.config.js` so Sentry browser reports aren't blocked.

**Commit**: `cc88aec`

### 3. Database migrations (done, 47/47 applied)

All migrations pushed to CI DB. Several required manual fixes:

| Migration | Issue | Fix applied |
|-----------|-------|-------------|
| `20250118` enhance_profiles | `CREATE POLICY IF NOT EXISTS` not supported on PG <15 | Used `DO $$ IF NOT EXISTS` pattern via API |
| `20260214` reputation_gamification | Backfill references `v_user.tasks_completed` not in SELECT | Replaced with `0` (no users in CI) |
| `20260215233000` dispute_achievement_counters | Trigger on `disputes` table that didn't exist yet | Applied after disputes table was created |
| `20260216003000` dispute_evidence_storage | ALTER on non-existent `disputes` table | Applied after disputes table was created |
| `20260219000001` rls_perf_fix_supplement | References `sprint_snapshots` table | Skipped that policy (table created later) |
| `20260220090000` proposal_stage_engine | Enum values used in same transaction | Split into 2 API calls |
| `20260220103000` sprint_phase_engine | Same enum issue | Split into 2 API calls |

### 4. Code fixes (committed)

| File | Fix | Commit |
|------|-----|--------|
| `next.config.js` | Sentry ingest domain in CSP | `cc88aec` |
| `supabase/migrations/20260220093000_voting_snapshot_integrity.sql` | Added `DROP TABLE IF EXISTS` for temp tables | `92d3b53` |
| `supabase/migrations/20260224000000_add_sprint_goal_column.sql` | New migration: `sprints.goal` column | `92d3b53` |
| `supabase/migrations/20260220113000_rewards_settlement_integrity.sql` | `%.9f` → `%s` in PG `format()` | `e40aef5` |
| `tests/voting-integrity.spec.ts` | Set `proposer_cooldown_days=0` in `beforeAll` | `24da2ba` |
| `src/app/[locale]/page.tsx` | Add `trust-updated-at` and `trust-refresh-cadence` test IDs | `24da2ba` |
| `src/app/[locale]/profile/progression/page.tsx` | Render `ProgressionShell` instead of redirecting to `/quests` | `24da2ba` |

### 5. CI DB manual fixes (applied via management API, not in migrations)

| Fix | Why |
|-----|-----|
| `uuid-ossp` extension moved to `public` schema | New Supabase projects install it in `extensions` schema |
| `check_achievements()` function redeployed | `$1` param placeholders were stripped during manual apply |
| `sprint_snapshots` table created | Referenced by `distribute_epoch_rewards()` but never in any migration |
| `sprints.goal` column added | API route inserts it but column didn't exist |
| `governance_policy.proposer_cooldown_days` set to `0` | Tests create multiple proposals with same user (wrong table — see root cause below) |
| `commit_sprint_reward_settlement` function redeployed | Fixed `%.9f` → `%s` |
| PostgREST schema cache reloaded | `NOTIFY pgrst, 'reload schema'` after column changes |

---

## Previous CI results (run 22374428838)

### e2e-integrity: 7 passed, 1 failed

| Test | Status |
|------|--------|
| admin-config-audit (2 tests) | PASS |
| dispute-sla (2 tests) | PASS |
| proposal-task-flow | PASS |
| proposals-lifecycle | PASS |
| rewards-settlement-integrity | PASS |
| sprint-phase-engine | PASS |
| **voting-integrity: freezes proposal when finalization fails twice** | **FAIL — 429** |
| voting-integrity: freezes snapshot voting power... | PASS (but serial, so first pass matters) |

### e2e-full-evidence: 61 passed, 5 failed

| Failing test | Error |
|-------------|-------|
| home-trust-surface | `toBeVisible` failed (UI element not found) |
| profile: progression hub | `toBeVisible` failed |
| rewards-surface-revamp: admin page | `toBeVisible` failed |
| tasks-surface-revamp: admin review queue | `toBeVisible` failed |
| voting-integrity: freezes proposal... | Same 429 as integrity suite |

---

## Fixes applied (commit `24da2ba`)

### Fix 1: voting-integrity 429 (integrity gate blocker)

**Root cause**: The proposals API reads `proposer_cooldown_days` from the `voting_config` table (default: 7 days). The earlier manual fix incorrectly set `governance_policy.proposer_cooldown_days = 0` on the `orgs` table JSONB field — a completely different storage location that the API never reads.

**Fix**: Test `beforeAll` now sets `voting_config.proposer_cooldown_days = 0` via admin client, making the test self-contained and independent of CI DB state.

### Fix 2: home-trust-surface (missing test IDs)

**Root cause**: Test expected `trust-updated-at` and `trust-refresh-cadence` data-testid attributes that were never added to the trust strip section.

**Fix**: Added freshness metadata footer to the trust strip with both test IDs.

### Fix 3: profile progression hub (redirect instead of render)

**Root cause**: `/profile/progression/page.tsx` was a redirect-only stub that forwarded to `/quests`. The `ProgressionShell` component (which has all expected test IDs) was never rendered.

**Fix**: Page now renders `ProgressionShell` with `sourceContext` from search params.

---

## Additional fixes (2026-02-25)

### Fix 4: voting-config update filter (voting-integrity 429)

**Root cause**: `beforeAll` used `.update({ proposer_cooldown_days: 0 }).limit(1)` — but PostgREST requires a filter condition on UPDATE; `.limit()` is not a filter. The update silently affected zero rows.

**Fix**: Changed to `.is('org_id', null)` to match the default single-tenant config row.

### Fix 5: profile progression link (profile test)

**Root cause**: Link href in profile page was changed to `/quests?from=profile` but the test expects `/profile/progression?from=profile`. The `/profile/progression` route still exists and renders `ProgressionShell`.

**Fix**: Reverted link href to `/profile/progression?from=profile`.

### Fix 6: rewards risk badge visibility (rewards-surface-revamp)

**Root cause**: Component renders `rewards-claim-risk-urgent` testId on both mobile (`md:hidden`) and desktop variants. At Playwright's 1280px viewport, `.first()` picks the hidden mobile element.

**Fix**: Changed test selector to `[data-testid="rewards-claim-risk-urgent"] >> visible=true` to filter for visible elements.

### Fix 7: task submissions FK hints (tasks-surface-revamp)

**Root cause**: `task_submissions.user_id` and `reviewer_id` FK constraints reference `auth.users(id)`, not `user_profiles(id)`. PostgREST cannot resolve computed relationships through the `auth` schema (not in `db-schemas`). The nested select `user:user_profiles!task_submissions_user_id_fkey(...)` returns a 400 error, causing the grouping logic to find zero submissions.

**Fix**:
1. Added direct FK constraints from `task_submissions` to `user_profiles` (`task_submissions_user_id_profile_fkey`, `task_submissions_reviewer_id_profile_fkey`)
2. Updated all PostgREST FK hints in codebase to use the new constraint names
3. Migration: `20260225000000_task_submissions_user_profiles_fks.sql`
4. Applied manually to CI DB and issued `NOTIFY pgrst, 'reload schema'`

### CI DB manual fixes (applied 2026-02-25)

| Fix | Reason |
|-----|--------|
| `task_submissions_user_id_profile_fkey` added | PostgREST FK hint resolution |
| `task_submissions_reviewer_id_profile_fkey` added | PostgREST FK hint resolution |
| `NOTIFY pgrst, 'reload schema'` | Schema cache refresh |

---

## Key references

- **CI Supabase project**: `rrsftfoxcujsacipujrr` (org: Organic, name: organic-app-ci, region: West EU)
- **Supabase dashboard**: https://supabase.com/dashboard/project/rrsftfoxcujsacipujrr
- **CI workflow**: `.github/workflows/ci.yml`
- **Test helpers**: `tests/helpers.ts`
- **Supabase access token**: Set via `SUPABASE_ACCESS_TOKEN` env var or `npx supabase login`

## How to query/fix the CI DB

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/rrsftfoxcujsacipujrr/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL"}'
```

## How to re-run CI

```bash
# Push empty commit (workflow doesn't have workflow_dispatch)
git commit --allow-empty -m "ci: re-trigger" && git push
```
