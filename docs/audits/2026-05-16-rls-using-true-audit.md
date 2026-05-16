# RLS USING(true) Audit — 2026-05-16

Follow-up to the 2026-05-15 security sweep (`docs/audits/2026-05-15-security-sweep.md`), which flagged 8 `USING(true)` policies in `supabase/migrations/20250101000000_initial_schema.sql` (lines 202, 211, 239, 254, 277, 291, 308, 322) for human review.

## Goal

Confirm each `USING(true)` policy is **FOR SELECT on a public-schema table**, and check whether wide-open read remains appropriate given columns added since 2025-01-01.

## Method

1. Read each policy at the cited line in the initial migration.
2. Grep all later migrations for `DROP POLICY` / re-creation by name to identify the **currently effective** policy on each table.
3. Enumerate columns added to each affected table via `ALTER TABLE ... ADD COLUMN` to spot post-2025-01 fields that may not be appropriate for anon read.

## Findings — structural check

All 8 policies are structurally correct (`FOR SELECT` on public tables). 1 of 8 has already been superseded by a later migration.

| # | Initial-schema line | Policy name | Table | Operation | Currently effective? |
|---|---|---|---|---|---|
| 1 | 202 | "Public profiles are viewable by everyone" | `public.user_profiles` | SELECT | **No** — replaced 2026-03-28 by two role-scoped policies (`Authenticated users can view profiles` and `Anon can view public profiles` with `profile_visible=true`) in `20260328300000_security_hardening.sql:29`. Email/wallet no longer exposed to anon. |
| 2 | 211 | "Proposals are viewable by everyone" | `public.proposals` | SELECT | Yes |
| 3 | 239 | "Vote tallies are viewable by everyone" | `public.votes` | SELECT | Yes |
| 4 | 254 | "Tasks are viewable by everyone" | `public.tasks` | SELECT | Yes |
| 5 | 277 | "Sprints are viewable by everyone" | `public.sprints` | SELECT | Yes |
| 6 | 291 | "Comments are viewable by everyone" | `public.comments` | SELECT | Yes |
| 7 | 308 | "Snapshots are viewable by everyone" | `public.holder_snapshots` | SELECT | Yes |
| 8 | 322 | "Orgs are viewable by everyone" | `public.orgs` | SELECT | Yes |

**Structural verdict: PASS.** None of the `USING(true)` policies grants write access; all are SELECT-only on public-schema tables.

## Findings — design / column-level review

The seven still-effective `USING(true)` SELECT policies are *broadly* consistent with the DAO transparency model (proposals, votes, tasks, sprints, comments, holder snapshots, and org metadata are intentionally public so external observers can audit governance). But columns added after 2025-01-01 require a fresh look. Findings ranked by impact.

### HIGH — `proposals.execution_notes` is world-readable

Added 2026-02-23 in `20260223000000_proposal_execution_window_and_templates.sql:13` as a `TEXT` field paired with `execution_status`, `execution_deadline`, `executed_at`. The column is unconstrained and is the natural place for an admin/council member to record execution context ("paid out 250 ORG to wallet X, see receipt Y", "delayed pending KYC on recipient", etc.).

- **Risk:** any text written here is readable by unauthenticated users.
- **Remediation options:**
  1. Tighten the SELECT policy to exclude `execution_notes` for anon (split into a view or use a column-level grant).
  2. Move execution notes to a separate `proposal_execution_events` table with admin-only RLS.
  3. Add a CHECK constraint forbidding the column from being populated until the team consciously decides on a visibility model.
- **Recommendation:** option 2. Cleanest separation. Execution-note history is an admin/audit concern, not a governance artefact every proposal viewer needs.

### MEDIUM — `proposals.finalization_failure_reason` is world-readable

Added 2026-02-20 in `20260220093000_voting_snapshot_integrity.sql:10`. Internal operational telemetry: why proposal finalization failed (rate-limit, RPC error, integrity check fail, etc.). Today this likely contains short error codes, but it's the kind of column that drifts toward verbose stack-flavored strings over time.

- **Risk:** information disclosure of internal errors and possibly external dependency state (RPC, Solana, etc.).
- **Remediation:** same options as above. Probably acceptable in the short term if values are constrained to coarse error codes (`'rpc_consensus_failed'`, etc.), but add an explicit invariant in code that this column never contains free-form strings.

### LOW — `orgs.governance_policy` / `orgs.sprint_policy` JSONB blobs

Added 2026-02-20 in `20260220123000_admin_config_and_audit_events.sql:10-11` with `DEFAULT '{}'::JSONB`. These are intended as community-tunable governance dials and are appropriate to publish (transparency over quorum thresholds, voting windows, etc.).

- **Risk:** if a future code path writes an admin-only key (API endpoint URL, internal feature flag, etc.) into one of these JSONB columns, it would leak. Currently nothing observed.
- **Remediation:** add a convention/comment forbidding non-public keys, and consider documenting the allowed schema as a Zod parser on the writer side.

### LOW — `orgs.token_analytics_config`

Added 2026-03-25 in `20260325100001_token_analytics_config.sql`. Contains `lp_vault_exclusions` and `dexscreener_pair`. Both are public references to on-chain addresses or external public IDs. Wide-open read is appropriate.

### Acceptable — intentionally-public columns

- `proposals` (title, body, summary, motivation, solution, budget, timeline, status, execution_deadline, execution_status, executed_at, voting timestamps) — DAO transparency.
- `votes` (proposal_id, voter_id, value, weight) — votes are publicly attributable by design.
- `tasks` (title, description, status, points, assignee_id) — public DAO work.
- `sprints`, `comments`, `holder_snapshots`, `orgs` (branding/social/treasury wallet) — all public-safe.

## Recommendations

1. **Open one targeted PR** addressing the HIGH item: split execution notes into `proposal_execution_events` with admin-only RLS, or write a migration that revokes `execution_notes` from the wide SELECT and grants it to authenticated council/admin only.
2. **Defer** the MEDIUM item (`finalization_failure_reason`) until we know whether it's still populated with free-form strings.
3. **Add a convention note** to `CLAUDE.md` or `.claude/rules/database.md` requiring that any column added to `proposals` / `orgs` (or any table with a wide SELECT policy) be reviewed for visibility before merge.

## Status

- Structural audit: PASS (all 8 are `FOR SELECT` on public tables; 1 already remediated).
- One HIGH finding (`proposals.execution_notes`) to address with a follow-up PR.
- One MEDIUM finding (`proposals.finalization_failure_reason`) flagged for monitoring.

## Files referenced

- `supabase/migrations/20250101000000_initial_schema.sql` — original policies.
- `supabase/migrations/20260219000000_rls_perf_fix_initplan.sql` and `_supplement.sql` — restated INSERT/UPDATE/DELETE policies; did not touch any of the 8 SELECT `USING(true)` policies.
- `supabase/migrations/20260328300000_security_hardening.sql:29` — remediated `user_profiles` (line 202).
- `supabase/migrations/20260223000000_proposal_execution_window_and_templates.sql:13` — added `execution_notes` (HIGH finding).
- `supabase/migrations/20260220093000_voting_snapshot_integrity.sql:10` — added `finalization_failure_reason` (MEDIUM finding).
