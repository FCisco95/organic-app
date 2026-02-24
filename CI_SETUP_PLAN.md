# CI Pipeline: Supabase `organic-app-ci` Setup

**Date**: 2026-02-24
**Status**: 1 test remaining
**CI Run**: https://github.com/FCisco95/organic-app/actions/runs/22374428838

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

### 5. CI DB manual fixes (applied via management API, not in migrations)

| Fix | Why |
|-----|-----|
| `uuid-ossp` extension moved to `public` schema | New Supabase projects install it in `extensions` schema |
| `check_achievements()` function redeployed | `$1` param placeholders were stripped during manual apply |
| `sprint_snapshots` table created | Referenced by `distribute_epoch_rewards()` but never in any migration |
| `sprints.goal` column added | API route inserts it but column didn't exist |
| `governance_policy.proposer_cooldown_days` set to `0` | Tests create multiple proposals with same user |
| `commit_sprint_reward_settlement` function redeployed | Fixed `%.9f` → `%s` |
| PostgREST schema cache reloaded | `NOTIFY pgrst, 'reload schema'` after column changes |

---

## Current CI results (run 22374428838)

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

## What's left to fix

### Priority 1: voting-integrity 429 (last integrity failure)

**Problem**: Test `freezes proposal when finalization fails twice` (line 241) creates a second proposal with the same user who already created one in the earlier test. The API enforces a `proposer_cooldown_days` rate limit.

**Already tried**: Set `governance_policy.proposer_cooldown_days = 0` in CI org config. The 429 persists — which means either:
- The config change didn't take effect for that CI run (it was applied mid-run)
- There's a different cooldown (dispute cooldown?) being triggered
- The governance_policy read path caches the config

**Next step**: Re-run CI now that the cooldown is set to 0. If still 429, check:
1. `src/app/api/proposals/route.ts` lines 133-159 for exact cooldown logic
2. Whether the test's `beforeAll` needs to explicitly set the org config
3. Whether `proposal_threshold_org` config field also gates creation

### Priority 2: e2e-full-evidence UI failures (4 tests)

These are `toBeVisible` failures on UI elements — likely missing seed data or feature flags in the CI org, not DB schema issues. Lower priority since the integrity suite is the gate.

**Likely causes**:
- Missing org config values that enable certain UI sections
- Missing seed data (reward distributions, trust metrics, etc.)
- Pages that require specific feature flags

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
