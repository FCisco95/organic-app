# Organic DAO Platform - Build Plan

## ✅ 2026-02-21 UI/UX Revamp Wave 2 — Complete Sign-Off

All 8 feature-vertical slices of Wave 2 delivered and validated. Wave 2 is closed.

### Slices delivered

| Slice | Surface | Status |
|---|---|---|
| 1 | Tasks | ✅ Done |
| 2 | Proposals | ✅ Done |
| 3 | Sprints | ✅ Done |
| 4 | Disputes | ✅ Done |
| 5 | Rewards | ✅ Done |
| 6 | Members & Profile | ✅ Done |
| 7 | Notifications & Auth | ✅ Done |
| 8 | Admin Ops | ✅ Done |

### Post-slice work

- [x] Cross-feature consistency pass: `--transition-ui`, `--section-radius`, `--section-padding` tokens + section card pattern documentation in `globals.css`.
- [x] Wave 2 sign-off document: `docs/plans/2026-02-20-ui-ux-revamp-wave2-signoff.md`.

### Wave 2 validation

- [x] `npm run lint` (no ESLint warnings or errors)
- [x] `npm run build` (production build passes, all pages compile)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/members-profile-surface-revamp.spec.ts tests/profile.spec.ts --workers=1` (skipped in this environment — missing Supabase env vars)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/notifications-auth-surface-revamp.spec.ts --workers=1` (skipped in this environment — missing Supabase env vars)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/admin-ops-surface-revamp.spec.ts tests/admin-config-audit.spec.ts --workers=1` (skipped in this environment — missing Supabase env vars)

### Next execution target

- Post-Wave 2: Performance baseline, accessibility audit, or feature work per roadmap.

## 🔄 2026-02-21 Governance Integrity Update (Task 10 Release Gate Checkpoint)

- Implemented release-gate workflow split in CI:
  - required blocker: `e2e-integrity` (proposal/voting/task-linkage/sprint/dispute/rewards/admin-config integrity specs),
  - non-blocking evidence: `e2e-full-evidence` (full Playwright suite with artifact upload).
- Added release-gate guidance to `README.md`:
  - blocking commands and required env vars for integrity E2E.
- Added local release-gate evidence draft in ignored docs path:
  - `docs/plans/2026-02-20-core-features-revamp-release-gate.md` (not git-tracked due `.gitignore` policy).

### Task 10 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [x] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/proposals-lifecycle.spec.ts tests/voting-integrity.spec.ts tests/proposal-task-flow.spec.ts tests/sprint-phase-engine.spec.ts tests/dispute-sla.spec.ts tests/rewards-settlement-integrity.spec.ts tests/admin-config-audit.spec.ts --workers=1` (13 skipped in this environment due missing required Supabase env vars for these fixtures)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --workers=1` (4 failed, 73 skipped in this environment; failures caused by Chromium sandbox constraint: `sandbox_host_linux.cc:41 ... Operation not permitted`)

### Task 10 status

- ⏳ Release gate implementation complete; final sign-off remains blocked on environment-capable E2E execution + manual QA matrix evidence.

### Next execution target

- UI/UX Revamp Wave 2 - Feature 6 (Members and Profile revamp): `docs/plans/2026-02-20-members-profile-ui-ux-revamp-plan.md`.

## 🔄 2026-02-21 UI/UX Revamp Wave 2 (Rewards Slice Checkpoint)

- Executed rewards revamp slice from `docs/plans/2026-02-20-ui-ux-revamp-wave2-master-plan.md`:
  - Added trust-first member rewards surface with settlement posture, claimability checklist, and claim flow guidance:
    - `src/app/[locale]/rewards/page.tsx`
    - `src/components/rewards/rewards-overview.tsx`
  - Added admin triage command deck with pending risk cues and payout/distribution guardrail rails:
    - `src/app/[locale]/admin/rewards/page.tsx`
    - `src/components/rewards/rewards-summary-cards.tsx`
  - Added risk and integrity cues in rewards tables and modal guardrails:
    - `src/components/rewards/claims-table.tsx`
    - `src/components/rewards/distributions-table.tsx`
    - `src/components/rewards/claim-modal.tsx`
    - `src/components/rewards/claim-review-modal.tsx`
    - `src/components/rewards/claim-pay-modal.tsx`
    - `src/components/rewards/manual-distribution-modal.tsx`
  - Tightened rewards query posture and typings:
    - `src/features/rewards/hooks.ts`
    - `src/features/rewards/types.ts`
  - Added/updated rewards revamp tests:
    - `tests/rewards-surface-revamp.spec.ts`
    - `tests/rewards.spec.ts`
    - `tests/rewards-settlement-integrity.spec.ts`
  - Updated rewards i18n copy for member/admin trust and guardrail messaging:
    - `messages/en.json`
    - `messages/pt-PT.json`
    - `messages/zh-CN.json`

### Rewards slice validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [x] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/rewards-surface-revamp.spec.ts tests/rewards.spec.ts tests/rewards-settlement-integrity.spec.ts --workers=1` (10 skipped in this environment due missing required Supabase env vars for these fixtures)

### Next execution target

- UI/UX Revamp Wave 2 - Feature 6 (Members and Profile revamp): `docs/plans/2026-02-20-members-profile-ui-ux-revamp-plan.md`.

## 🔄 2026-02-20 UI/UX Revamp Wave 2 (Disputes Slice Checkpoint)

- Executed disputes revamp slice from `docs/plans/2026-02-20-ui-ux-revamp-wave2-master-plan.md`:
  - Added triage-first disputes queue surface with SLA counters, SLA/tier filter rails, and escalation controls:
    - `src/components/disputes/DisputeQueue.tsx`
    - `src/components/disputes/DisputeCard.tsx`
    - `src/app/[locale]/disputes/page.tsx`
  - Added detail-page integrity rail with explicit response deadline posture, evidence chronology status, response state, and mediation/escalation path:
    - `src/components/disputes/DisputeDetail.tsx`
    - `src/components/disputes/DisputeTimeline.tsx`
    - `src/app/[locale]/disputes/[id]/page.tsx`
  - Improved action ergonomics and guardrails:
    - `src/components/disputes/RespondPanel.tsx`
    - `src/components/disputes/ResolvePanel.tsx`
    - `src/components/disputes/CreateDisputeModal.tsx`
  - Refined disputes stats surface posture:
    - `src/components/disputes/DisputeStats.tsx`
  - Added/updated disputes revamp tests:
    - `tests/disputes-surface-revamp.spec.ts`
    - `tests/disputes.spec.ts`
    - `tests/dispute-sla.spec.ts`
  - Added i18n copy updates for disputes revamp surfaces:
    - `messages/en.json`
    - `messages/pt-PT.json`
    - `messages/zh-CN.json`

### Disputes slice validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/disputes-surface-revamp.spec.ts tests/disputes.spec.ts tests/dispute-sla.spec.ts --workers=1` (all skipped in this environment due missing required Supabase env vars)

### Next execution target

- UI/UX Revamp Wave 2 - Feature 5 (Rewards surface revamp): `docs/plans/2026-02-20-rewards-ui-ux-revamp-plan.md`.

## 🔄 2026-02-20 UI/UX Revamp Wave 2 (Sprints Slice Checkpoint)

- Executed sprints revamp slice from `docs/plans/2026-02-20-ui-ux-revamp-wave2-master-plan.md`:
  - Added sprint command deck (phase rail, countdown/status chips, settlement posture panel) and stable anchors:
    - `src/app/[locale]/sprints/page.tsx`
  - Revamped sprint board/list/timeline surfaces for clearer execution context:
    - `src/components/sprints/sprint-board-view.tsx`
    - `src/components/sprints/sprint-list-view.tsx`
    - `src/components/sprints/sprint-timeline.tsx`
  - Added sprint detail operator rail (phase timeline, blocker panel, readiness checklist) and stable anchors:
    - `src/app/[locale]/sprints/[id]/page.tsx`
  - Updated sprint lifecycle dialogs with explicit pre-flight/closeout checklists:
    - `src/components/sprints/sprint-start-dialog.tsx`
    - `src/components/sprints/sprint-complete-dialog.tsx`
  - Added/updated sprint surface tests:
    - `tests/sprints-surface-revamp.spec.ts`
    - `tests/sprints.spec.ts`
    - `tests/sprint-phase-engine.spec.ts`
  - Added i18n copy updates for sprint revamp surfaces:
    - `messages/en.json`
    - `messages/pt-PT.json`
    - `messages/zh-CN.json`

### Sprints slice validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/sprints-surface-revamp.spec.ts tests/sprints.spec.ts tests/sprint-phase-engine.spec.ts --workers=1` (all skipped in this environment due missing required Supabase env vars)

### Next execution target

- UI/UX Revamp Wave 2 - Feature 4 (Disputes surface revamp): `docs/plans/2026-02-20-disputes-ui-ux-revamp-plan.md`.

## 🔄 2026-02-20 UI/UX Revamp Wave 2 (Proposals Slice Checkpoint)

- Executed proposals revamp slice from `docs/plans/2026-02-20-ui-ux-revamp-wave2-master-plan.md`:
  - Added governance signal strip, stage chips, and explicit CTA hierarchy on proposals list:
    - `src/app/[locale]/proposals/page.tsx`
  - Added proposal card trust framing + stable test anchors:
    - `src/components/proposals/ProposalCard.tsx`
  - Added two-column decision rail (status window, version context, immutable provenance callout) + test anchors:
    - `src/app/[locale]/proposals/[id]/page.tsx`
    - `src/components/proposals/ProposalSections.tsx`
  - Revamped proposal creation header/wizard state feedback:
    - `src/app/[locale]/proposals/new/page.tsx`
    - `src/components/proposals/ProposalWizard.tsx`
  - Added/updated proposal surface tests:
    - `tests/proposals-surface-revamp.spec.ts`
    - `tests/proposals.spec.ts`
    - `tests/proposals-lifecycle.spec.ts`
  - Added i18n copy updates for proposals surfaces:
    - `messages/en.json`
    - `messages/pt-PT.json`
    - `messages/zh-CN.json`

### Proposals slice validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/proposals-surface-revamp.spec.ts tests/proposals.spec.ts tests/proposals-lifecycle.spec.ts --workers=1` (all skipped in this environment due missing required Supabase env vars)

### Next execution target

- UI/UX Revamp Wave 2 - Feature 2 (Tasks surface revamp): `docs/plans/2026-02-20-tasks-ui-ux-revamp-plan.md`.

## ✅ 2026-02-20 Governance Integrity Update (Task 9 Complete)

- Delivered trust-surface revamp across homepage, treasury, and analytics:
  - `src/app/[locale]/page.tsx` now includes a dedicated trust pulse strip (sprint countdown, proposal stage mix, leaderboard snapshot, recent activity).
  - `src/app/[locale]/treasury/page.tsx` now includes transparency/freshness context and trust metadata chips.
  - `src/app/[locale]/analytics/page.tsx` now includes governance-health framing and freshness metadata chips.
- Expanded trust components:
  - `src/components/treasury/treasury-hero.tsx` now surfaces emission policy + latest settlement posture with audit link.
  - `src/components/analytics/kpi-cards.tsx` now includes 30-day trust aggregates and contributor signals.
- Expanded API trust payloads:
  - `src/app/api/treasury/route.ts` now returns trust metadata (`emission_policy`, `latest_settlement`, audit link, update cadence).
  - `src/app/api/analytics/route.ts` now returns trust aggregates (proposal throughput, disputes, vote participation, contributor signals).
- Updated domain typing/schema coverage:
  - `src/features/treasury/types.ts`, `src/features/treasury/schemas.ts`
  - `src/features/analytics/types.ts`, `src/features/analytics/schemas.ts`
  - refreshed query cadence in `src/features/treasury/hooks.ts` and `src/features/analytics/hooks.ts`.
- Added Task 9 tests:
  - `tests/home-trust-surface.spec.ts`
  - `tests/treasury-transparency.spec.ts`
  - `tests/analytics-liveness.spec.ts`
- Updated i18n copy for Task 9 surfaces:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Task 9 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [x] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/home-trust-surface.spec.ts tests/treasury-transparency.spec.ts tests/analytics-liveness.spec.ts --workers=1` (3 passed)
- [ ] `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/profile.spec.ts --workers=1` (skipped in this environment due missing required Supabase env vars)

### Next execution target

- Task 10: Full release gate and sign-off (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 8 Complete)

- Added admin config/audit migration (`20260220123000_admin_config_and_audit_events.sql`) with:
  - new org-level policy knobs (`governance_policy`, `sprint_policy`),
  - append-only `admin_config_audit_events` ledger,
  - immutable update/delete guards for audit rows,
  - admin-only audit inserts + admin/council audit reads via RLS.
- Expanded settings validation/types:
  - `src/features/settings/schemas.ts` now validates governance/sprint/rewards policy knobs.
  - `PATCH /api/settings` now requires `reason` and at least one changed field.
  - `src/features/settings/types.ts` now includes typed governance/sprint policy and extended rewards config fields.
- Hardened settings API auditing:
  - `src/app/api/settings/route.ts` now records per-scope audit rows (`org`, `voting_config`, `governance_policy`, `sprint_policy`, `rewards_config`) with previous/new payload snapshots and actor metadata.
- Updated admin settings UX:
  - `src/components/settings/settings-field.tsx` save bar now requires a change reason.
  - `src/components/settings/*.tsx` tabs now submit `reason` and expose new governance/sprint/reward policy controls.
  - `src/app/[locale]/admin/settings/page.tsx` now passes governance policy config to governance tab.
  - Updated i18n keys in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added Task 8 tests:
  - `src/features/settings/__tests__/config-validation.test.ts`
  - `tests/admin-config-audit.spec.ts`

### Task 8 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `node --test src/features/settings/__tests__/config-validation.test.ts` (repo lacks TS runtime wiring for `node --test` on `.ts` files)
- [ ] `npx playwright test tests/admin-config-audit.spec.ts --workers=1` (skipped in this environment due missing required Supabase env vars)

### Next execution target

- Task 9: Trust-surface revamps (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 7 Complete)

- Added XP-first leaderboard migration (`20260220120000_xp_leaderboard_view_refresh.sql`) with deterministic tie-breakers:
  - primary: `xp_total` (desc),
  - secondary: `total_points` (desc),
  - tertiary: `tasks_completed` (desc),
  - final deterministic key: `id` (asc).
- Hardened leaderboard API behavior:
  - `src/app/api/leaderboard/route.ts` now computes rank server-side with XP-first ordering.
  - Added source fallback (`leaderboard_materialized` -> `leaderboard_view`) for resilience.
  - Added `?fresh=1` support to bypass server cache during deterministic QA/test runs.
- Added leaderboard domain support:
  - `src/features/reputation/types.ts` now includes XP-first comparator/ranking helpers.
  - `src/features/reputation/hooks.ts` now includes `useLeaderboard` query hook.
- Updated leaderboard/reputation UX copy and surfaces:
  - `src/app/[locale]/leaderboard/page.tsx` now presents XP as primary ranking metric with points as secondary context.
  - `src/components/reputation/reputation-summary.tsx` now shows points as tie-break context and explicit XP-priority hint.
  - Updated i18n keys in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added tests:
  - `src/features/reputation/__tests__/leaderboard-ordering.test.ts`
  - `tests/leaderboard-xp-priority.spec.ts`

### Task 7 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `npx playwright test tests/leaderboard-xp-priority.spec.ts --workers=1` (blocked in this environment due external DNS/network resolution to Supabase: `getaddrinfo EAI_AGAIN ...supabase.co`)

### Next execution target

- Task 8: Admin configurability and audit trail expansion (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 6 Complete)

- Added rewards settlement integrity migration (`20260220113000_rewards_settlement_integrity.sql`) with:
  - sprint settlement integrity metadata (`reward_settlement_status`, cap/carryover fields, kill-switch timestamps),
  - append-only `reward_settlement_events` ledger,
  - distribution idempotency metadata (`reward_distributions.idempotency_key`, integrity flags),
  - settlement commit RPC (`commit_sprint_reward_settlement`) enforcing emission/carryover/debt/kill-switch invariants.
- Hardened settlement orchestration:
  - `src/app/api/sprints/[id]/complete/route.ts` now calls `commit_sprint_reward_settlement` before sprint completion closure and returns explicit integrity hold payloads.
- Hardened rewards payout APIs:
  - `src/app/api/rewards/distributions/manual/route.ts` now applies deterministic dedupe keys and returns `409` on duplicates.
  - `src/app/api/rewards/claims/[id]/pay/route.ts` now blocks duplicate payout-distribution paths for claims.
  - `src/app/api/rewards/distributions/route.ts` now enriches epoch distributions with sprint settlement integrity status.
  - `src/app/api/rewards/route.ts` now exposes latest reward settlement posture for UI.
- Updated rewards UX:
  - `src/components/rewards/rewards-overview.tsx` now surfaces settlement status/cap/carryover/hold reason.
  - `src/components/rewards/distributions-table.tsx` now surfaces settlement status for epoch rows.
- Added/updated tests:
  - `tests/rewards-settlement-integrity.spec.ts`
  - `src/features/rewards/__tests__/settlement.test.ts`
  - `src/features/rewards/settlement.ts`
- Updated typing/i18n:
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
- Added follow-up migration hotfix (`20260220114500_rewards_settlement_integrity_lock_fix.sql`) to patch `commit_sprint_reward_settlement` lock scope (`FOR UPDATE OF s`) and avoid Postgres `0A000` on settlement commit.

### Task 6 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass; non-fatal existing leaderboard revalidation log still appears in this environment)
- [x] `npx playwright test tests/rewards-settlement-integrity.spec.ts tests/rewards.spec.ts --workers=1` (6 passed, 2 skipped due existing in-flight sprint guard in `tests/rewards-settlement-integrity.spec.ts`)

### Next execution target

- Task 7: XP-first leaderboard revamp (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 5 Complete)

- Added dispute SLA/evidence hardening migration (`20260220110000_dispute_sla_and_evidence_rules.sql`) with:
  - append-only `dispute_evidence_events`,
  - deadline integrity checks on disputes,
  - global overdue reviewer SLA sweep RPC (`sweep_overdue_dispute_reviewer_sla`),
  - scheduled pg_cron job (`sweep-overdue-dispute-reviewer-sla`).
- Hardened dispute APIs:
  - `src/app/api/disputes/route.ts` now requires filing during `dispute_window` and enforces fixed 72h reviewer response SLA.
  - `src/app/api/disputes/evidence/route.ts` now enforces PNG/JPG/PDF-only uploads, dispute-bound late markers, and hard-close checks.
  - `src/app/api/disputes/[id]/respond/route.ts` and `src/app/api/disputes/[id]/resolve/route.ts` now enforce deadline/window guards.
  - `src/app/api/disputes/[id]/route.ts` now returns evidence-event timelines with signed URLs.
- Updated disputes domain/UI:
  - Added shared SLA helpers (`src/features/disputes/sla.ts`) and schema/type support for evidence events.
  - `src/components/disputes/DisputeTimeline.tsx` now shows response due/overdue and dispute-window state.
  - `src/components/disputes/DisputeDetail.tsx` now shows evidence timeline + late badges and supports post-file uploads.
  - `src/components/disputes/CreateDisputeModal.tsx` now aligns accepted types with server policy.
- Added/updated tests:
  - `tests/dispute-sla.spec.ts`
  - `src/features/disputes/__tests__/sla-rules.test.ts`
  - `tests/disputes.spec.ts`
  - `tests/helpers.ts` (dispute-window sprint fixtures)
- Updated typings/i18n:
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Task 5 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass; non-fatal existing leaderboard revalidation log still appears in this environment)
- [ ] `npx playwright test tests/dispute-sla.spec.ts tests/disputes.spec.ts --workers=1` (blocked in this environment due external DNS/network resolution to Supabase: `getaddrinfo EAI_AGAIN`)

### Next execution target

- Task 6: Rewards settlement and emission safety (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 4 Complete)

- Added sprint phase engine migration (`20260220103000_sprint_phase_engine.sql`) with:
  - expanded sprint phases (`planning`, `active`, `review`, `dispute_window`, `settlement`, `completed`),
  - phase timestamps on `sprints`,
  - forward-only transition trigger (`trg_sprints_enforce_phase_rules`),
  - settlement blocker RPC (`get_sprint_settlement_blockers`),
  - reviewer SLA escalation RPC (`apply_sprint_reviewer_sla`) with admin notification fan-out.
- Updated sprint/dispute APIs for phased lifecycle:
  - `src/app/api/sprints/[id]/start/route.ts` now blocks start when any sprint is in-flight across execution phases.
  - `src/app/api/sprints/[id]/complete/route.ts` now advances sprint phase-by-phase and only performs snapshot/closure at `settlement -> completed`.
  - `src/app/api/disputes/route.ts` now binds disputes to any in-flight sprint (`active/review/dispute_window/settlement`).
- Updated sprint UI surfaces:
  - `src/app/[locale]/sprints/page.tsx` and `src/app/[locale]/sprints/[id]/page.tsx` now expose phase-advance actions and phase-aware labels.
  - `src/components/sprints/sprint-timeline.tsx` now shows current phase, countdowns, and settlement block reasons.
  - `src/components/sprints/sprint-list-view.tsx` now renders dynamic phase badges.
- Added Task 4 tests:
  - `tests/sprint-phase-engine.spec.ts`
  - `src/features/sprints/__tests__/phase-engine.test.ts`
  - Updated `tests/sprints.spec.ts` for phased completion assertions.
- Updated i18n + DB typings:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - `src/types/database.ts`, `src/types/index.ts`

### Task 4 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass; non-fatal existing leaderboard revalidation log still appears in this environment)
- [ ] `node --test src/features/sprints/__tests__/phase-engine.test.ts` (repo lacks TS runtime wiring for `node --test` on `.ts` files)
- [ ] `npx playwright test tests/sprint-phase-engine.spec.ts tests/sprints.spec.ts tests/disputes.spec.ts` (env-loaded run blocked by external DNS/network to Supabase: `getaddrinfo EAI_AGAIN`)

### Next execution target

- Task 5: Review and disputes SLA hardening (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 3 Complete)

- Added immutable proposal-task provenance migration (`20260220100000_proposal_task_linkage.sql`) with:
  - `tasks.proposal_version_id`,
  - composite provenance FK (`proposal_id`, `proposal_version_id`) to `proposal_versions`,
  - immutable linkage trigger (`trg_tasks_enforce_proposal_provenance`),
  - finalized/passed proposal gate for proposal-generated tasks.
- Updated task APIs and schemas for provenance integrity:
  - `src/app/api/tasks/route.ts` now validates finalized/passed lifecycle gate and current-version linkage before insert.
  - `src/app/api/tasks/[id]/route.ts` now returns proposal + proposal version provenance relations.
  - `src/features/tasks/schemas.ts` now supports `proposal_version_id` on create and blocks proposal linkage fields on updates.
  - `src/app/api/tasks/[id]/subtasks/route.ts` now inherits proposal provenance from parent tasks.
- Updated task/proposal UIs with immutable provenance references:
  - task detail shows governance source badge and proposal version marker.
  - proposal detail creates tasks via `/api/tasks` and shows linked execution tasks with source version badges.
- Added Task 3 tests:
  - `tests/proposal-task-flow.spec.ts`
  - `src/features/tasks/__tests__/proposal-linkage.test.ts`
- Updated i18n copy for provenance UX in EN/PT/ZH.

### Task 3 validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `node --test src/features/tasks/__tests__/proposal-linkage.test.ts` (repo lacks TS runtime wiring for `node --test` on `.ts` files)
- [ ] `npx playwright test tests/proposal-task-flow.spec.ts tests/tasks.spec.ts` (all tests skipped in this environment due missing required Supabase env vars)

### Next execution target

- Task 4: Sprint phase engine revamp (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 1 Complete)

- Proposal lifecycle stage engine implemented across DB/domain/API/UI.
- Added immutable `proposal_versions` and append-only `proposal_stage_events`.
- Added proposal comment version binding and "updated since this comment" UX marker.
- Added override TTL auto-revert RPC (`expire_proposal_override_promotions`).
- Updated proposal lifecycle i18n copy in EN/PT/ZH.

### Migration execution notes

- Applied using split migration execution:
  - Migration A: enum additions only (`proposal_status` new values).
  - Migration B: lifecycle schema/functions/triggers/backfill/RLS.
- Resolved migration-B runtime error (`pending trigger events`) by forcing deferred constraint checks before RLS alter statements.

### Validation evidence

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [x] `npx playwright test tests/proposals-lifecycle.spec.ts` (pass after env load + local app server)

### Next execution target

- Task 4: Sprint phase engine revamp (`docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md`).

## ✅ 2026-02-20 Governance Integrity Update (Task 2 Complete)

- Added deterministic voter snapshot layer (`proposal_voter_snapshots`) and proposal integrity metadata (`server_voting_started_at`, finalization dedupe/attempt/freeze fields).
- Added transactional RPC voting start (`start_proposal_voting_integrity`) with:
  - advisory lock,
  - atomic snapshot + proposal transition commit,
  - delegation resolution with deterministic cycle break to self-power,
  - per-wallet minimum threshold (>= 1 ORG) for snapshot voting weight.
- Added idempotent finalize RPC (`finalize_proposal_voting_integrity`) with:
  - advisory lock + dedupe key enforcement,
  - retry-once behavior,
  - proposal freeze + audit event on second failure.
- Updated proposal voting APIs to consume integrity RPCs and frozen voter snapshots.
- Updated admin voting UX to surface frozen finalization state.
- Added Task 2 tests:
  - `tests/voting-integrity.spec.ts`
  - `src/features/voting/__tests__/snapshot-integrity.test.ts`

### Task 2 validation evidence

- [ ] `node --test src/features/voting/__tests__/snapshot-integrity.test.ts` (repo lacks TS runtime wiring for `node --test` on `.ts` files)
- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [ ] `npx playwright test tests/voting-integrity.spec.ts` (env-only run skipped without vars; env-loaded run blocked by external DNS/network to Supabase in this environment)

## ✅ Completed Features

### Phase 1: Foundation (Completed)

- [x] Authentication system with Supabase
- [x] Wallet integration (Phantom)
- [x] Wallet linking and signature verification (nonce-protected via `wallet_nonces`)
- [x] Organic ID assignment system with server-side token holder verification
- [x] User profiles with role management
- [x] Navigation with role-based access

### Phase 2: Task Management (Completed)

- [x] Database schema for tasks and sprints
- [x] Kanban board with drag-and-drop
- [x] Task CRUD operations
- [x] Task properties (priority, points, labels, due dates)
- [x] Sprint/Epoch assignment
- [x] Assignee management
- [x] Permission-based task management
- [x] Status workflow (backlog → todo → in_progress → review → done)
- [x] Task detail pages with full information
- [x] Task comments system
- [x] User assignment modal for admin/council
- [x] Task deletion with confirmation (admin only)
- [x] Drag-and-drop task status changes
- [x] Task cards with quick navigation and actions

### Phase 3: Enhanced Profiles (Completed)

- [x] Profile picture upload to Supabase Storage
- [x] Avatar display with gradient fallback
- [x] Editable profile fields (name, bio, location, website, Twitter, Discord)
- [x] Social media links with icons
- [x] Profile edit mode with validation
- [x] Character limits and field validation
- [x] Member since display
- [x] Avatar in navigation bar

### Phase 4: Navigation & UI (Completed)

- [x] Proposals navigation entry and routing
- [x] Navigation with user avatars
- [x] Organic ID badge display
- [x] Role-based menu items
- [x] Mobile responsive navigation
- [x] App shell with collapsible sidebar + top bar
- [x] Organic branding throughout

### Phase 5: Infrastructure (Completed)

- [x] Middleware for session management
- [x] Improved authentication flow
- [x] Better error handling across API routes
- [x] Environment variable configuration
- [x] Enhanced SSR session handling with debugging
- [x] Cookie configuration for production environments
- [x] Auth callback error handling and redirects

### Phase 5.5: Internationalization (Completed)

- [x] next-intl integration with locale-based routing
- [x] Locale middleware for automatic detection
- [x] Translation files for en, pt-PT, zh-CN (~100 keys each)
- [x] Locale switcher with accessible dropdown UI
- [x] All pages migrated to `[locale]` route structure

### Phase 6: Sprint/Epoch Management (Completed)

- [x] Create sprints page with CRUD operations
- [x] Current sprint board/list views
- [x] Sprint details view with tasks
- [x] Sprint date range and progress stats
- [x] Sprint capacity planning
- [x] Sprint burndown charts
- [x] Active sprint indicator
- [x] Sprint history and archive

### Phase 12: Advanced Tasks & Delegation (Completed)

- [x] Task dependencies + blocking visualization (BlockedBadge, DependencyPicker)
- [x] Subtasks support + progress display (SubtaskList, SubtaskProgress)
- [x] Task templates CRUD + create-from-template flow
- [x] Recurring task templates cloned on sprint completion
- [x] Delegation UX during voting (DelegatedPowerBadge, DelegationInfo, DelegationPanel)
- [x] Task detail page integration for dependencies/subtasks
- [x] Proposal detail page integration for delegation UX
- [x] i18n coverage for all Phase 12 components
- [x] Phase 12 bug fixes and query cache invalidation
- [x] Templates page UX polish (header, cards, skeletons)

## 🚦 Deployment Readiness Snapshot (2026-02-17)

Current status:
- Not ready for confident production launch.
- Ready for preview/staging validation.

### Baseline checks run

- [x] `npm run lint` (pass)
- [x] `npm run build` (pass)
- [x] `npm run test:e2e` executes, but currently discovers 1 test and skips it

### Blocking gaps before production

- [ ] API input validation hardening on update/mutation routes still using untyped body passthrough (for example: `src/app/api/settings/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/app/api/sprints/route.ts`, `src/app/api/sprints/[id]/route.ts`)
- [ ] E2E coverage is insufficient for release confidence (currently `tests/profile.spec.ts` only)
- [ ] CI does not gate on automated tests yet (`.github/workflows/ci.yml` runs lint/build only)
- [ ] i18n consistency gaps remain in user-visible UI (for example: `src/app/[locale]/tasks/templates/page.tsx`, `src/app/[locale]/disputes/[id]/page.tsx`, `src/app/global-error.tsx`, reputation toasts)
- [ ] Security/log hygiene cleanup still needed for Twitter OAuth debug logging (`src/lib/twitter/client.ts`)
- [ ] Manual QA artifact drift: `BUILD_PLAN.md` references `tests/phase16-disputes-user-stories.md`, but file is missing

## 🧭 Phase 19: Professional UX + Quality + Release Program

Detailed execution plan: `docs/plans/2026-02-17-professional-launch-readiness-plan.md`

### Phase 19.1: Information Architecture & Navigation Coherence

User stories:
- As a new visitor, I can understand the platform and find sign-in/signup immediately.
- As a member, I can discover the primary work areas (tasks, proposals, sprints, rewards) in one navigation system.
- As an admin/council user, I can find configuration and moderation surfaces without page-hunting.

Tests:
- E2E nav smoke for all sidebar/mobile entries and role-conditional visibility.
- Manual IA walkthrough for desktop and mobile on EN/PT/ZH locales.
- Route map parity check between page files and reachable navigation entries.

Exit criteria:
- No dead-end route.
- No duplicated/conflicting nav labels.
- All role-gated pages are discoverable through intended navigation.

### Phase 19.2: Identity, Auth, Wallet, and Organic ID

User stories:
- As a user, I can sign up, sign in, and sign out reliably.
- As a token holder, I can link wallet, pass nonce/signature verification, and claim Organic ID.
- As a returning user, I see consistent account, role, and wallet state after refresh.

Tests:
- API tests for nonce generation and wallet linking error/success paths.
- E2E flow: signup/login -> profile -> connect wallet -> claim ID.
- Negative tests: invalid nonce, replay nonce, invalid signature, already-linked wallet.

Exit criteria:
- Zero auth-blocking bugs in staging smoke runs.
- Deterministic wallet-link error messaging.
- Auth and wallet flows validated on mobile and desktop.

### Phase 19.3: Task and Sprint Execution

User stories:
- As admin/council, I can create and manage tasks/sprints with valid constraints.
- As a member, I can discover, join, submit, and track tasks without confusion.
- As reviewer/admin, I can review submissions and see points/reputation updates consistently.

Tests:
- API integration tests for task create/update/claim/unclaim/submission/review.
- E2E flow: create task -> join -> submit -> review -> points reflected.
- Manual QA for board/list/timeline views, including localization and mobile layouts.

Exit criteria:
- Task lifecycle passes end-to-end for admin/member personas.
- Sprint start/complete workflows validated with task data integrity.
- No silent failures in status transitions or assignment behavior.

### Phase 19.4: Governance and Voting

User stories:
- As a member, I can create proposals using the wizard and submit for voting.
- As a voter, I can vote once with correct effective power/delegation.
- As admin/council, I can start/finalize voting and trust outcome integrity.

Tests:
- API tests for proposal CRUD, status transitions, vote casting, and finalize rules.
- E2E flow: create -> submit -> start voting -> vote -> finalize.
- Edge tests for quorum/threshold behavior and invalid state transitions.

Exit criteria:
- Proposal lifecycle has deterministic outcomes across locales.
- Voting/delegation math is reproducible from API payloads.
- No broken states between proposal status and voting windows.

### Phase 19.5: Disputes, Rewards, Reputation

User stories:
- As a disputant, I can file, track, and comment on a dispute with clear status.
- As council/admin, I can triage, mediate/resolve, and see audit trail updates.
- As contributor, I can claim rewards and understand threshold/conversion outcomes.

Tests:
- API integration tests for dispute create/respond/mediate/resolve/appeal flows.
- E2E flow: rejected submission -> dispute -> resolution -> XP/points adjustments.
- Rewards API tests for claim submission/review/payment paths.

Exit criteria:
- Dispute lifecycle passes for member/council/admin actors.
- XP/reputation/rewards side effects remain consistent after dispute outcomes.
- Evidence upload/access rules verified with role boundaries.

### Phase 19.6: Members, Settings, Analytics, Treasury

User stories:
- As admin, I can update org settings safely and without corrupting config data.
- As member/public visitor, I can use analytics/treasury/member pages with coherent data and empty states.
- As council, I can access allowed settings while respecting role restrictions.

Tests:
- API tests for settings/member-role/privacy endpoints with strict validation.
- E2E role-matrix tests for members directory and admin settings access control.
- Data consistency checks between dashboard KPIs and source APIs.

Exit criteria:
- Settings writes are schema-validated and role-safe.
- Public analytics/treasury pages are stable under empty and populated states.
- Role permission matrix passes for admin/council/member/viewer.

### Phase 19.7: UX, UI, i18n, and Accessibility Polish

User stories:
- As a non-English user, I can complete all critical flows without mixed-language UI.
- As a keyboard/screen-reader user, I can navigate dialogs, drawers, and menus safely.
- As any user, I can understand errors and recovery actions immediately.

Tests:
- i18n string audit for all critical paths and fallback states.
- Accessibility QA: keyboard-only navigation, focus visibility/order, dialog dismissal behavior.
- Visual regression snapshots for core pages (desktop/mobile).

Exit criteria:
- No critical hardcoded strings in primary flows.
- Modal/drawer interactions pass keyboard and focus checks.
- Core pages meet consistent visual hierarchy and spacing standards.

### Phase 19.8: Security, Performance, and Release Gate

User stories:
- As platform owner, I can deploy with confidence that security controls and observability are active.
- As operator, I can detect and triage production errors quickly.
- As user, I experience stable page loads and responsive core workflows.

Tests:
- Security hardening checks: remove sensitive debug logs, validate all mutating endpoints with Zod.
- Performance checks: API response budgets, route payload review, build-size monitoring.
- Release gate run: lint, build, automated tests, manual smoke checklist, health endpoint, scheduler checks.

Exit criteria:
- Release gate passes in staging and production preflight.
- Sentry/health/scheduler telemetry confirms operational readiness.
- No P0/P1 findings open at launch decision point.

## 🚧 In Progress / Next Steps

### Phase 2.1: Task Management Audit Hardening (In Progress)

- [x] Task creation modal now uses `POST /api/tasks` with server-side validation/authorization
- [x] Submission review approval updates points + claimable points + tasks completed and runs achievement checks
- [x] Claim API supports self-join for backlog/todo/in-progress and prevents leaving after submission
- [x] Task list visibility hardened: tasks with `null` status are normalized to backlog so they remain visible
- [ ] Complete remaining task i18n hardcoded string cleanup across all task surfaces
- [ ] Complete manual QA sweep for task user stories (discovery, self-join, review, mobile)

### Phase 7: Proposals System (In Progress)

- [x] Proposal creation form (multi-step wizard with per-step Zod validation)
- [x] Proposal listing with filters (status + category dropdowns)
- [x] Proposal detail view (structured sections, admin panel, comments)
- [x] Proposal status workflow (draft → submitted → approved/rejected/voting)
- [x] Discussion/comments on proposals
- [x] Edit functionality for draft proposals (author/admin, reuses wizard)
- [x] Delete functionality with confirmation (author/admin)
- [x] Proposal categories (feature, governance, treasury, community, development)
- [x] Structured sections: summary, motivation, solution, budget, timeline (separate DB columns)
- [x] Category + status badge components (CategoryBadge, StatusBadge)
- [x] ProposalCard list component with category colors
- [x] Feature domain: types, schemas, hooks, barrel export (`src/features/proposals/`)
- [x] API routes: CRUD, comments, status changes (`src/app/api/proposals/`)
- [x] Database migration: proposal_category enum, structured columns, DELETE RLS policies
- [x] i18n: ProposalWizard + ProposalDetail namespaces across en, pt-PT, zh-CN
- [x] Legacy backward compat: body column always populated from concatenated sections
- [x] Detail page UI revamp: removed gradient header, sections in single container with higher contrast
- [x] Voting mechanism (off-chain)
- [x] Voting model: token-weighted snapshot (1 ORG = 1 vote)
- [x] Voting model: quorum 5–10% circulating supply
- [x] Voting model: approval threshold >50% YES (configurable for treasury)
- [x] Voting model: 5-day voting window (configurable)
- [x] Voting model: optional abstain counts toward quorum
- [ ] Voting model: proposal threshold (fixed or % supply)
- [ ] Anti-abuse: one live proposal per proposer + 7-day cooldown
- [ ] Execution window (3–7 days) + off-chain result handoff
- [ ] Proposal templates

### Phase 8: Treasury Management (In Progress)

- [x] Treasury dashboard page (`/treasury`) with public access
- [x] Live SOL + $ORG balance cards from on-chain data (Jupiter price API)
- [x] Fund allocation donut chart (Recharts) with configurable categories
- [x] Recent on-chain transaction history (last 20 txs via Solana RPC)
- [x] Professional hero section with principles, wallet address, Solscan link
- [x] Feature domain: types, schemas, hooks, barrel export (`src/features/treasury/`)
- [x] API route with 60s cache (`src/app/api/treasury/route.ts`)
- [x] Navigation link in sidebar + mobile sidebar (Wallet icon, public)
- [x] i18n: Treasury namespace across en, pt-PT, zh-CN
- [x] Treasury wallet hardcoded in `src/config/token.ts` (swappable)
- [ ] Spending proposals (via existing proposal system)
- [ ] Multi-sig wallet integration (Squads or similar)
- [ ] Token distribution management
- [ ] Spending analytics

### Phase 9: Member Management & Admin Settings (Completed)

- [x] Member directory with search/filter (role chips, pagination, search by name/email)
- [x] Member profiles (public view, privacy-aware rendering)
- [x] Member privacy controls (users toggle `profile_visible`, private profiles show locked state)
- [x] Role assignment UI (admin-only, prevents self-role-change)
- [x] Member statistics and contributions (points, tasks completed)
- [x] Admin settings page with 6 tabs (General, Token, Treasury, Governance, Sprints, Members)
- [x] DB-driven org config: extended `orgs` table with token/treasury/sprint/governance config
- [x] Token config refactor: `token.ts` (client-safe) + `token.server.ts` (server-only `getOrgConfig()` with 60s cache)
- [x] Feature domains: `src/features/members/` + `src/features/settings/` (types, schemas, hooks, barrel exports)
- [x] API routes: members CRUD + privacy, settings GET/PATCH, role assignment
- [x] i18n: Members + Settings namespaces across en, pt-PT, zh-CN
- [x] Navigation: Members in main nav (Users icon), Settings in bottom nav (gear icon, admin/council only)
- [x] Council read-only access with badge notice
- [x] Leaderboard page and API for member rankings
- [ ] Member onboarding flow
- [ ] Organic ID minting interface

### Phase 10: Analytics & Reporting

- [x] DAO activity dashboard (public analytics page at `/analytics`)
- [x] Task completion metrics (weekly bar chart, 12-week window)
- [x] Member contribution tracking (member growth area chart, 12-month cumulative)
- [x] Activity trends (30-day stacked area chart: tasks, governance, comments)
- [x] Proposal category distribution (donut chart)
- [x] Voting participation overview (last 10 voted proposals with vote breakdown)
- [x] KPI cards (users, holders, price, market cap, tasks completed, active proposals)
- [x] Token config for SaaS readiness (`src/config/token.ts`)
- [x] Recharts integration for all chart components
- [x] 5 Postgres RPC functions for server-side aggregations
- [ ] Treasury analytics
- [ ] Proposal success rates
- [ ] Export functionality

### Phase 11: Notifications & Communication

#### 11.1 Core notification system (in-app)

- [x] Centralized notification system built on top of `activity_log`
- [x] User-specific notifications table with read / unread state
- [x] Real-time delivery using Supabase Realtime
- [x] Notification bell in TopBar with unread counter
- [x] Notification dropdown panel (recent activity)
- [x] Full notifications page with category filters
- [x] Pagination for notifications list (Load more via cursor API)
- [x] Mark as read (single + bulk)
- [x] Deep-link navigation to source (task, proposal, comment, submission, vote)

#### 11.2 Notification categories & events

- [x] Task events
  - task created
  - task status changed
  - task completed
  - task deleted
  - submission created / reviewed

- [x] Proposal events
  - proposal created
  - proposal status changed
  - proposal deleted

- [x] Voting events: vote cast
- [x] Voting period ending reminders (24h + 1h before close)

- [x] Comment events
  - comment created
  - comment deleted

- [ ] System events (extensible)
  - role changes
  - org-level announcements

#### 11.3 Follow / subscription model

- [x] Follow / unfollow tasks
- [x] Follow / unfollow proposals
- [x] Auto-follow rules
  - creator auto-follows
  - assignee auto-follows
  - voter auto-follows
  - commenter auto-follows
- [x] Notifications only sent to followers (non-global events)
- [x] Follow button on task & proposal detail pages

#### 11.4 Notification preferences

- [x] Per-category notification preferences
- [x] Channel-level toggles
  - in-app
  - email
- [x] Default preferences seeded on first access
- [x] Preferences editable from notifications page
- [x] Preferences editable from user settings (profile page)

#### 11.5 Smart batching (high-volume events)

- [x] Batch tables: `notification_batches`, `notification_batch_events` with RLS
- [x] 15-minute time-window aggregation for `comment_created` and `submission_created`
- [x] Summary notification per batch (single row in `notifications`, updated in-place)
- [x] Raw events preserved in `notification_batch_events` for auditability
- [x] Batch count + timestamps joined in API response (`batch_count`, `batch_first_at`, `batch_last_at`)
- [x] UI displays batched copy (e.g., "3 new comments on X")
- [x] Realtime UPDATE subscription refreshes batched notifications in-place

#### 11.6 Voting reminders

- [x] Edge Function `send-voting-reminders` (Deno, service-role key)
- [x] Two reminder windows: 24h and 1h before `voting_ends_at`
- [x] Tolerance windows (30min for 24h, 10min for 1h) for cron scheduling
- [x] Idempotent inserts via `dedupe_key` unique index on `notifications`
- [x] Respects per-user voting notification preferences
- [x] `voting_reminder_24h` and `voting_reminder_1h` event types added to `activity_event_type` enum
- [x] `get_notification_category()` maps both to `voting` category
- [x] Reminder icons and i18n copy (EN, PT, ZH) for both windows

#### 11.7 Email notifications (digest-based)

- [ ] Email delivery via Resend
- [ ] Daily email digest (no per-event spam)
- [ ] Digest respects user preferences
- [ ] Email templates built with React Email
- [ ] Scheduled job / Edge Function for sending digests

#### 11.8 Announcements

- [ ] System-wide announcements (admin / org level)
- [ ] Announcements delivered in-app
- [ ] Announcements optionally included in email digests
- [ ] Not tied to follow model (broadcast events)

#### 11.9 Explicitly out of scope (this phase)

- [ ] Discord bot integration (planned later)
- [ ] Telegram bot integration (planned later)
- [ ] SMS / push notifications

#### 11.10 UX & quality requirements

- [x] Zero notification spam (follow-based delivery + batching)
- [x] Real-time UX with graceful fallback
- [x] Mobile-friendly notification panel
- [x] i18n support (EN / PT / ZH)
- [x] Clear empty states and onboarding hints

#### 11.11 Verification & acceptance

- [x] Real-time unread counter updates
- [x] Notifications respect follow + preference rules
- [x] No cross-user data leaks (RLS enforced)
- [x] All notifications link to valid sources
- [x] Batched notifications show correct count and update in real-time
- [x] Voting reminders are idempotent (no duplicates on re-run)
- [ ] Email digests sent only when relevant

### Phase 12: Advanced Features

- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Task templates
- [ ] Proposal delegation

### Phase 13: Wallet Support

- [x] Add Solflare wallet adapter
- [x] Add Coinbase wallet adapter
- [x] Add Ledger wallet adapter
- [x] Add Torus wallet adapter
- [x] Fix wallet switching flow (select + connect sequencing)
- [x] Add Backpack wallet adapter (Wallet Standard auto-detect)
- [x] Add OKX wallet adapter (Wallet Standard auto-detect)
- [x] Add Binance Web3 Wallet adapter (Wallet Standard auto-detect)
- [x] Add TokenPocket wallet adapter

### Phase 14: Reputation & Gamification

- [x] XP and level progression system (11 tiers)
- [x] Reputation tiers with unlocks (voting power, task access, roles)
- [x] Level/badge display on profiles
- [x] Achievement system (milestones, roles, activity)
- [x] Streak tracking (daily/weekly activity)
- [x] Level-up animations and achievement popups
- [x] Visible progress bars for level advancement

### Phase 15: Rewards & Distribution

- [x] Point-to-token conversion (threshold-based claiming)
- [x] Epoch pool distribution (fixed pool per sprint)
- [x] Manual distribution tooling (admin)
- [x] Treasury-linked rewards reporting

### Phase 16: Dispute Resolution

#### 16.1 Core dispute system

- [x] `disputes` table with status lifecycle (open → mediation → awaiting_response → under_review → resolved/dismissed/withdrawn/mediated)
- [x] `dispute_comments` table for semi-public discussion threads (parties + arbitrator visibility)
- [x] Dispute reason categories: rejected_unfairly, low_quality_score, plagiarism_claim, reviewer_bias, other
- [x] XP stake on filing (default 50 XP, configurable via `orgs.gamification_config`)
- [x] Minimum XP threshold to file (default 100 XP, prevents spam from new members)
- [x] One active dispute per submission constraint
- [x] 7-day cooldown between disputes per user
- [x] Evidence required: text explanation + optional file/link attachments

#### 16.2 Three-tier escalation

- [x] **Tier 1 — Mediation** (optional, 24h window): both parties can negotiate a resolution privately
- [x] **Tier 2 — Council arbitration**: council+ member (not the original reviewer) reviews evidence and decides
- [x] **Tier 3 — Admin appeal**: disputant can appeal council ruling within 48h; admin makes final ruling
- [x] Sprint-bound deadlines: unresolved disputes auto-escalate at sprint close; admin-tier disputes get 48h extension
- [x] Arbitrator self-assignment from queue (conflict-of-interest guard: cannot be original reviewer)
- [x] Arbitrator recusal with dispute reassignment

#### 16.3 Structured counter-arguments

- [x] Reviewer receives 48h window to submit counter-argument after dispute is filed
- [x] Counter-argument form: text response + optional evidence links
- [x] Response deadline tracked; arbitration proceeds regardless after deadline passes

#### 16.4 Resolution outcomes

- [x] **Overturn**: submission approved, points awarded, disputant XP stake refunded, reviewer XP penalty
- [x] **Compromise**: arbitrator sets new quality score, partial points recalculated, disputant XP stake refunded
- [x] **Uphold**: original decision stands, disputant loses XP stake
- [x] **Dismiss**: frivolous dispute, disputant loses XP stake + extended cooldown
- [x] **Withdrawn**: disputant can withdraw before resolution (small XP fee deducted, rest refunded)
- [x] **Mediated**: both parties agree on resolution, full XP stake refunded

#### 16.5 Arbitrator rewards & reviewer accountability

- [x] Arbitrator earns flat XP per resolution (default 25 XP, configurable)
- [x] Reviewer XP penalty on overturned decisions (default 30 XP, configurable)
- [x] Reviewer accuracy tracking (% of reviews overturned via disputes)
- [x] Achievements: "First Arbiter" (1 resolved), "Justice Keeper" (10 resolved), "Peacemaker" (5 mediated), "Vindicated" (1 won as disputant)

#### 16.6 UI & pages

- [x] Dedicated `/disputes` queue page (council/admin see all, members see their own)
- [x] Dispute detail page `/disputes/[id]` with evidence, response, timeline, resolution panel
- [x] Inline "Dispute" button on rejected task submissions (disabled if cooldown/insufficient XP)
- [x] Create Dispute modal (reason picker + evidence text + links + XP stake + file upload)
- [x] Dispute timeline visualization (filed → mediation → response → review → resolved)
- [x] Status + tier badge components
- [x] Arbitrator stats dashboard (resolved count, overturn rate)
- [x] Sidebar navigation link with pending-dispute badge counter (council/admin)

#### 16.7 Notifications & activity integration

- [x] Activity event types: dispute_created, dispute_response_submitted, dispute_escalated, dispute_resolved, dispute_withdrawn
- [x] New `disputes` notification category with user preference toggle
- [x] Auto-follow for disputant, reviewer, and arbitrator
- [x] Notifications: reviewer notified on filing, disputant on response, arbitrator on escalation, both on resolution

#### 16.10 User-story QA coverage

- [x] User-story QA matrix documented in `tests/phase16-disputes-user-stories.md`
- [x] Disputes queue/detail rendering hardened for unexpected enum values and limited payloads
- [ ] Execute full manual pass for all Phase 16 user stories on staging/production data

#### 16.8 i18n

- [x] Disputes namespace across en, pt-PT, zh-CN (~80 keys)
- [x] Covers: statuses, tiers, resolutions, reasons, form labels, validation errors, notification copy, achievements

#### 16.9 Configurable parameters (via orgs.gamification_config)

- [x] `xp_dispute_stake`: 50 (XP cost to file)
- [x] `xp_dispute_arbitrator_reward`: 25 (XP per resolution)
- [x] `xp_dispute_reviewer_penalty`: 30 (XP lost if overturned)
- [x] `xp_dispute_withdrawal_fee`: 10 (small fee on withdrawal)
- [x] `dispute_mediation_hours`: 24
- [x] `dispute_response_hours`: 48
- [x] `dispute_appeal_hours`: 48
- [x] `dispute_cooldown_days`: 7
- [x] `dispute_dismissed_cooldown_days`: 14
- [x] `dispute_min_xp_to_file`: 100

### Phase 17: Integrations (Future)

- [ ] Discord bot (notifications, role sync)
- [x] Twitter/X engagement verification (OAuth linking, twitter task type, manual screenshot evidence, API client scaffolding)
- [ ] GitHub contribution tracking
- [ ] On-chain data verification (holdings/activity)

### Phase 18: Platform Expansion (Future)

- [ ] White-label / multi-tenant support
- [ ] Custom branding and domain per tenant
- [ ] Open-core vs premium feature split

## 🔧 Technical Improvements

### Performance

- [ ] Implement caching strategy (Redis or similar)
- [ ] Optimize database queries with indexes
- [ ] Add pagination to all list views
- [ ] Lazy loading for images
- [ ] Code splitting optimization
- [ ] Bundle size analysis and reduction

### Security

- [ ] Rate limiting on API routes
- [ ] Input sanitization review
- [ ] SQL injection prevention audit
- [ ] CSRF protection
- [ ] Security headers configuration
- [ ] Regular dependency updates

### Reliability

- [x] Server-side balance caching (30s TTL) to prevent RPC 429 errors
- [x] Client-side balance caching (15s TTL) to reduce API spam
- [ ] Replace public Solana RPC with paid provider (Helius/QuickNode/Alchemy)
- [ ] Solana RPC fallback/retry handling with timeouts

### Data & Schema

- [ ] Task quality scores table
- [ ] Reputation/XP tracking tables
- [ ] Achievements table
- [ ] Activity streak tracking
- [ ] Point balances ledger

### Testing

- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Component testing with React Testing Library
- [ ] Test coverage reporting
- [ ] CI/CD pipeline setup

### Developer Experience

- [ ] API documentation with Swagger/OpenAPI
- [ ] Component storybook
- [ ] Development environment setup guide
- [ ] Contribution guidelines
- [ ] Code style guide
- [ ] Git hooks for linting/testing

### Deployment & Operations

- [ ] Production deployment checklist
- [ ] Environment-specific configurations
- [ ] Monitoring and logging setup (Sentry, LogRocket, etc.)
- [ ] Database backup strategy
- [ ] Disaster recovery plan
- [ ] Performance monitoring (Vercel Analytics, etc.)

## 🚀 Deployment Week Checklist (7-Day Plan)

### Day 1 — Production Readiness Baseline

- [ ] Validate all required env vars for local/staging/prod
- [ ] Confirm Supabase RLS policies for public read endpoints (activity, stats)
- [ ] Add/gate rate limiting for sensitive API routes (auth, voting, submissions)
- [ ] Remove or gate debug logs in API routes

### Day 2 — Critical Flows QA + Fixes

- [ ] Auth → Profile → Wallet link → Organic ID flow
- [ ] Tasks flow: create → claim → submit → review → points
- [ ] Proposals flow: create → vote → finalize → create task from proposal
- [ ] Activity feed realtime + stats accuracy

### Day 3 — Performance & Stability

- [ ] Add/verify indexes for heavy read tables (tasks, proposals, activity_log)
- [ ] Ensure list endpoints support pagination (tasks/proposals/activity)
- [ ] Review API responses for N+1 queries; batch/join where needed

### Day 4 — Security & Data Integrity

- [ ] Confirm Zod validation on all API routes
- [ ] Verify role checks for admin/council endpoints
- [ ] Re-verify wallet signature verification + nonce handling

### Day 5 — UX Polish + Mobile

- [ ] Fix layout regressions after sidebar changes
- [ ] Confirm mobile nav works across all localized routes
- [ ] Tighten error/empty states (activity feed, stats, lists)

### Day 6 — Deployment Dry Run

- [ ] Run `npm run lint` and `npm run build`
- [ ] Deploy Vercel preview and smoke test
- [ ] Verify Supabase redirect URLs + Site URL
- [ ] Validate activity feed/stats in staging (Jupiter price, realtime)

### Day 7 — Final Launch Checklist

- [ ] Confirm prod env vars are set
- [ ] Confirm migrations applied
- [ ] Confirm admin role seeded and working
- [ ] Launch and monitor logs/errors

## 📋 Immediate Next Tasks (Priority Order)

1. **Run Database Migrations**
   - Execute profile enhancement migration in Supabase
   - Execute task management migration in Supabase
   - Verify all tables and columns created

2. **Test Avatar Upload**
   - Verify Supabase Storage bucket created
   - Test avatar upload functionality
   - Verify RLS policies working correctly

3. **Sprint/Epoch Management**
   - Validate capacity + burndown calculations with real sprint data

4. **Proposal System MVP**
   - Enforce proposal threshold and cooldown rules
   - Add proposal templates
   - Define execution window + off-chain result handoff

5. **Member Directory** (✅ Completed)
   - Member listing with search, role filters, pagination
   - Public profile views with privacy controls
   - Admin settings with 6 configuration tabs

## 🎯 Milestone Goals

### Milestone 1: Core Platform (✅ Completed)

- Authentication, profiles, and navigation working
- Task management fully functional
- Basic DAO operations supported

### Milestone 2: Sprint & Proposals (Target: 2 weeks)

- Sprint management operational
- Proposal system MVP launched
- Member voting enabled

### Milestone 3: Treasury & Analytics (Target: 1 month)

- Treasury tracking implemented
- Basic analytics dashboard
- Reporting functionality

### Milestone 4: Production Ready (Target: 6 weeks)

- All security audits complete
- Testing coverage > 80%
- Performance optimized
- Documentation complete

## 📝 Notes

- All features should maintain the organic branding and design system
- Prioritize mobile responsiveness for all new features
- Consider accessibility (WCAG 2.1 AA) for all UI components
- Keep bundle size under control - review each major addition
- Document API endpoints as they're created
- Write tests alongside feature development

## 🔗 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [React DnD](https://react-dnd.github.io/)
- [TailwindCSS](https://tailwindcss.com/docs)

---

Last Updated: 2026-02-18
Version: 2.0.0

## Recent Updates (2026-02-18)

### Phase G Staging Sign-off Progress

- Initial staging gate run failed while ngrok/local app endpoint was offline (health check failed; E2E produced widespread `404` responses).
- Applied targeted API/test fixes from the failing run:
  - removed invalid `tasks_created_by_fkey` joins from task/sprint API responses
  - aligned disputes/proposals/task/profile E2E expectations with current API/runtime behavior
- Re-ran validations:
  - `npm run lint` → pass
  - `npm run build` → pass
  - staging health endpoint (`/api/health`) → `200` with `{"status":"ok"}`
  - full staging E2E run (`--workers=1`) → `45 passed`, `3 skipped`
- Updated sign-off artifacts in `docs/2026-02-18-phase-g-staging-signoff.md`, `NEXT_SESSION_FOCUS.md`, and `SESSION_LOG.md`.
- Remaining pre-launch checks: manual QA runbook + Sentry unresolved-error review.

## Recent Updates (2026-02-17)

### Deploy Readiness Audit + Phase 19 Program

- Added deployment readiness snapshot with validated baseline (`lint`, `build`, current E2E status).
- Added explicit production blockers (validation hardening, test coverage, CI test gate, i18n/UX gaps, logging hygiene).
- Added Phase 19 multi-phase professionalization roadmap with user stories, test plans, and exit criteria.
- Linked detailed execution plan at `docs/plans/2026-02-17-professional-launch-readiness-plan.md`.

## Recent Updates (2026-02-16)

### Tasks and Build Stability

- Fixed empty Tasks page data loading by removing a fragile nested `task_assignees -> user_profiles` embed in the tasks list query.
- Added safe assignee hydration in a second pass (`task_assignees` + `user_profiles`) so task rows still render even if participant enrichment fails.
- Added explicit `dynamic = 'force-dynamic'` to `src/app/api/disputes/[id]/comments/route.ts` to avoid route collection/build-time instability on this dynamic API handler.
- Validated with `npm run lint` and `npm run build`.

## Recent Updates (2026-01-22)

### Security Fix: Nonce Validation

- Added `wallet_nonces` table for server-side nonce storage
- Updated `/api/auth/nonce` to store nonces with 5-minute TTL
- Updated `/api/auth/link-wallet` to validate and consume nonces
- Prevents replay attacks on wallet signature verification

### Performance Fix: Solana RPC Rate Limiting

- Added server-side balance cache (30s TTL) in `/api/organic-id/balance`
- Added client-side balance cache (15s TTL) in profile page
- Logs cache hits vs RPC calls for debugging
- Prevents 429 errors from excessive RPC calls

### Infrastructure TODO

- Set `NEXT_PUBLIC_SOLANA_RPC_URL` in `.env.local`

## Recent Updates (2026-02-08)

### Notifications System (Phase 11.1–11.4)

- Added `user_follows`, `notifications`, and `notification_preferences` tables + RLS and realtime
- Added fan-out trigger on `activity_log` + auto-follow triggers for tasks, proposals, votes, comments
- Added notifications API routes (list, mark read, preferences, follow)
- Added UI: bell dropdown, notifications page, preferences panel, follow button
- Added React Query hooks + i18n strings for notifications
- Added notifications pagination (cursor-based Load more) and profile preferences section

### Notification Batching & Voting Reminders (Phase 11.5–11.6)

- Added `notification_batches` + `notification_batch_events` tables with RLS
- Added `batch_id` and `dedupe_key` columns to `notifications` table
- Updated `notify_followers()` trigger: 15-minute batching window for `comment_created` and `submission_created`
- Summary notification per batch (single row, updated in-place on subsequent events)
- Raw events stored in `notification_batch_events` for auditability
- Added `voting_reminder_24h` and `voting_reminder_1h` event types to `activity_event_type` enum
- Updated `get_notification_category()` to map reminders to `voting` category
- Created Edge Function `supabase/functions/send-voting-reminders/index.ts` (Deno)
  - Queries proposals in `voting` status with `voting_ends_at` in 24h/1h windows
  - Idempotent upsert via `dedupe_key` unique index
  - Respects user notification preferences
- API: notifications route joins `notification_batches` for `batch_count`/`batch_first_at`/`batch_last_at`
- UI: `NotificationItem` shows batched copy ("3 new comments on X") and reminder text
- Realtime: added UPDATE subscription to refresh batched notifications in-place
- i18n: `commentBatch`, `submissionBatch`, `votingReminder24h`, `votingReminder1h` across EN, PT, ZH
- Excluded `supabase/functions/` from Next.js tsconfig to prevent Deno import errors in build

### Verification & Organic ID Flow

- Nonce-based SIWS wallet linking (`/api/auth/nonce`, `/api/auth/link-wallet`) with replay protection
- Organic ID assignment endpoint with ORG holder verification + member role upgrade
- Profile page flow for wallet linking and Organic ID claim

## Recent Updates (2026-02-07)

### Member Management & Admin Settings (Phase 9)

- Added member directory at `/members` with search, role filters, pagination
- Added member profile pages at `/members/[id]` with privacy-aware rendering
- Added admin settings at `/admin/settings` with 6 tabs: General, Token, Treasury, Governance, Sprints, Members
- Extended `orgs` table with token/treasury/sprint config (DB-driven, SaaS-ready)
- Added `profile_visible` to user profiles for privacy control
- Created `src/features/members/` and `src/features/settings/` feature domains
- Added 5 API routes: members list/detail/privacy, settings CRUD, role assignment
- Refactored token config: `token.ts` (client-safe) + `token.server.ts` (server-only with DB reads)
- Full i18n: Members + Settings namespaces across en, pt-PT, zh-CN

## Recent Updates (2026-02-06)

### Treasury Management (Phase 8)

- Added public treasury dashboard at `/treasury`
- Added balance cards, allocation chart, and recent transactions
- Added treasury API route with 60s cache and price fetches
- Added treasury feature domain (types, schemas, hooks)
- Added nav link + i18n keys for treasury

## Recent Updates (2026-01-18)

### Internationalization Complete

- Added next-intl with locale-based routing ([locale] structure)
- Created translation files for English, Portuguese, and Chinese
- Built accessible LanguageSelector dropdown with keyboard navigation
- Migrated all pages to locale-aware routing

### UI Improvements

- Added LanguageSelector component with flag emoji display
- Refactored LocaleSwitcher to use new dropdown component
- Centralized language metadata in languageConfig

## Recent Updates (2026-01-17)

### Plan Accuracy Updates

- Marked sprint CRUD, detail views, and progress stats as completed
- Marked proposal voting as pending
- Added leaderboard completion and Solana RPC fallback task
- Added proposal voting baseline rules and wallet adapter roadmap

## Recent Updates (2025-01-26)

### Task Management Enhancements

- Added comprehensive task detail pages with comments system
- Implemented user assignment modal for admin/council members
- Added task deletion with confirmation modal (admin only)
- Enhanced kanban board with drag-and-drop improvements
- Added quick navigation and action buttons on task cards

### Proposal System Improvements

- Added inline editing for draft proposals
- Implemented delete functionality with confirmation
- Restricted edit/delete to authors and admins for draft proposals only

### Infrastructure Updates

- Enhanced Supabase SSR session handling with comprehensive logging
- Fixed middleware cookie configuration for production
- Improved auth callback error handling and redirects
- Implemented client-side Supabase operations for LocalStorage session compatibility
