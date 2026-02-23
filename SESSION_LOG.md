# Session Log

Add newest entries at the top.

## 2026-02-23 (Session: quests + referrals rollout, admin gamification controls, and QA runbook update)

### Summary

Finalized and packaged the full quests/referrals revamp session into a single delivery, including DB-backed quests, referral program, burn-to-level mechanics, admin gamification controls, new `/quests` experience, navigation rewiring, and documentation updates.

### Implementation highlights

- Quests and referrals platform foundation:
  - `supabase/migrations/20260223100000_quests_referrals_burns.sql`
  - Added `quests`, `referral_codes`, `referrals`, `referral_rewards`, `point_burns`.
  - Extended `orgs.gamification_config` and updated `award_xp` trigger for `manual_burn` mode.
- Gamification engines and contracts:
  - `src/features/gamification/quest-engine.ts`
  - `src/features/gamification/referral-engine.ts`
  - `src/features/gamification/burn-engine.ts`
  - `src/features/gamification/types.ts`
  - `src/features/gamification/schemas.ts`
  - `src/features/gamification/hooks.ts`
  - Refactored quest loading to DB-driven objectives and added referral/burn query + mutation hooks.
- API surfaces:
  - `src/app/api/referrals/route.ts`
  - `src/app/api/referrals/validate/route.ts`
  - `src/app/api/referrals/complete/route.ts`
  - `src/app/api/gamification/burn-cost/route.ts`
  - `src/app/api/gamification/burn/route.ts`
  - `src/app/api/admin/quests/route.ts`
  - `src/app/api/admin/quests/[id]/route.ts`
  - `src/app/api/admin/gamification/config/route.ts`
- Quests + referral UX delivery:
  - `src/app/[locale]/quests/page.tsx`
  - `src/components/gamification/quests-page.tsx`
  - `src/components/gamification/referral-section.tsx`
  - `src/components/gamification/quest-level-sidebar.tsx`
  - `src/components/gamification/quest-grid.tsx`
  - `src/components/gamification/quest-card.tsx`
  - `src/components/gamification/burn-confirm-dialog.tsx`
- Route and navigation rewiring:
  - `src/app/[locale]/join/page.tsx`
  - `src/app/[locale]/signup/page.tsx`
  - `src/app/[locale]/profile/progression/page.tsx` (legacy redirect to `/quests`)
  - `src/components/layout/nav-config.ts`
  - `src/components/layout/sidebar.tsx`
  - `src/components/layout/mobile-sidebar.tsx`
  - `src/components/layout/top-bar.tsx`
  - `src/components/settings/settings-tabs.tsx`
  - `src/app/[locale]/admin/settings/page.tsx`
  - `src/components/settings/gamification-tab.tsx`
- i18n and docs:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
  - `docs/qa-runbook.md` updated with a dedicated manual test section for referrals/quests/admin-gamification (`4.15`).

### Post-implementation hardening (same session)

- Referral completion authorization guard added to prevent unauthorized completion calls.
- Referral link origin generation aligned to request origin / app URL fallback instead of hardcoded domain.
- Referral code generation race-condition handling added for parallel requests.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/gamification-quests-api.spec.ts`: blocked in this environment due Supabase DNS resolution error (`EAI_AGAIN`).
- Local dev runtime smoke from this environment was also constrained by sandbox port binding (`EPERM` on `0.0.0.0` bind), so live HTTP route checks were limited.

## 2026-02-21 (Session: gamification revamp checkpoint - progression source context + navigation wiring)

### Summary

Completed the follow-up implementation pass for progression usability by wiring source-aware navigation, source-context messaging, and quest CTA fallback coverage across the app shell.

### Implementation highlights

- Progression source context + routing:
  - `src/app/[locale]/profile/progression/page.tsx`
  - Parses `from` query param (`tasks | proposals | profile`) and passes source context into progression UI.
- Progression shell enhancements:
  - `src/components/gamification/progression-shell.tsx`
  - Added source-context banner + return CTA.
  - Added default quest CTA fallback for unmapped quest IDs.
- Navigation wiring:
  - `src/components/layout/sidebar.tsx`
  - `src/components/layout/mobile-sidebar.tsx`
  - `src/components/layout/top-bar.tsx`
  - `src/components/navigation.tsx`
  - Progression links now append `?from=` based on current section and preserve active-state matching by normalizing query-bearing hrefs.
- Profile quick action:
  - `src/app/[locale]/profile/page.tsx`
  - Progression shortcut now deep links with `?from=profile`.
- Quest data freshness:
  - `src/features/gamification/hooks.ts`
  - Added optional live refetch interval to `useQuestProgress`.
- Localization + tests:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - Added source-context/fallback CTA translation keys.
  - `tests/profile.spec.ts` now asserts progression deep link query and source-context banner visibility.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/profile.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - grouped quest objectives in progression UI)

### Summary

Wired grouped quest objectives into the progression shell with cadence buckets, reset timers, and context-aware CTA hints, using the new quests API payload.

### Implementation highlights

- Progression quest UI revamp:
  - `src/components/gamification/progression-shell.tsx`
  - Added grouped quest columns (`daily`, `weekly`, `long_term`) with:
    - cadence completion counters,
    - per-objective progress bars and remaining counts,
    - relative reset timers (`Intl.RelativeTimeFormat`),
    - quest-level CTA links to relevant flows (`tasks`, `proposals`, `profile`),
    - fallback rendering from overview summary if detailed quest endpoint data is unavailable.
- Localization coverage for new quest UI:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
  - Added cadence labels, status labels, fallback notice, CTA labels, and per-quest localized title/description copy.
- Quest summary i18n hygiene:
  - `src/features/gamification/quest-engine.ts`
  - Removed hard-coded English summary note (`note` now `null`) so UI remains locale-controlled.
- Test updates:
  - `tests/profile.spec.ts`
  - Added progression assertions for cadence quest sections.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/profile.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - quest model + quest progress API)

### Summary

Implemented the quest model and authenticated quest progress API for daily, weekly, and long-term objectives, using existing activity/reputation data sources.

### Implementation highlights

- Quest model and evaluator:
  - `src/features/gamification/quest-engine.ts`
  - Added static objective catalog (`daily | weekly | long_term`) and server evaluator to compute progress, completion, remaining, progress percent, and reset timestamps.
  - Progress data derives from `activity_log`, `xp_events`, `user_activity_counts`, `user_profiles`, and `user_achievements`.
- Gamification contracts:
  - `src/features/gamification/types.ts`
  - `src/features/gamification/schemas.ts`
  - Added typed/schematized quest cadence, quest progress item payload, grouped objective response, and summary shape.
- New API endpoint:
  - `src/app/api/gamification/quests/route.ts`
  - Authenticated `GET` route returning quest progress payload with private cache headers.
- Overview integration:
  - `src/app/api/gamification/overview/route.ts`
  - Replaced static quest summary placeholder with quest-engine summary (graceful fallback if quest computation fails).
- Client hook:
  - `src/features/gamification/hooks.ts`
  - Added `useQuestProgress` and query key for `/api/gamification/quests`.
- Tests:
  - `tests/gamification-quests-api.spec.ts`
  - Added authenticated payload-shape and unauthenticated `401` checks.
- Plan artifact:
  - `docs/plans/2026-02-21-gamification-quest-model-api.md`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/gamification-quests-api.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - members/profile readability + privacy)

### Summary

Completed the next gamification revamp checkpoint focused on making member/profile progression surfaces easier to read and safer for private profiles.

### Implementation highlights

- Member detail readability and navigation:
  - `src/app/[locale]/members/[id]/page.tsx`
  - Added section jump nav (`overview`, `reputation`, `achievements`) and stable test anchor.
  - Improved private-profile state copy and added a direct link to profile privacy settings for the owner.
  - Achievements section now renders an explicit empty state when no unlocks exist.
- Member card privacy clarity:
  - `src/components/members/member-card.tsx`
  - Added explanatory private-profile copy and retained high-signal stats preview.
- Profile privacy controls:
  - `src/app/[locale]/profile/page.tsx`
  - Integrated `useUpdatePrivacy` mutation to let users toggle profile visibility directly from profile.
  - Added dedicated privacy panel with status, hints, action CTA, and success/error toasts.
- API privacy hardening:
  - `src/app/api/achievements/route.ts`
  - Added unlock-status gating for `?userId=` requests so private profiles do not leak achievement unlock status.
- i18n coverage:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - Added copy for profile visibility controls, private-profile explanations, and member section navigation labels.
- Tests:
  - `tests/members-profile-surface-revamp.spec.ts`
  - Added assertions for member section navigation and profile privacy panel/toggle.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/members-profile-surface-revamp.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: UI/UX revamp wave 2 - slices 6–8 + sign-off)

### Summary

Completed the remaining three feature-vertical UI/UX revamp slices (Members & Profile, Notifications & Auth, Admin Ops) plus the cross-feature consistency pass, closing Wave 2.

### Slice 6 — Members and Profile

- Task 1 (failing tests):
  - Created `tests/members-profile-surface-revamp.spec.ts` with three serial tests: members directory filters/trust-cues, member profile header/stats/reputation, profile page identity/activity/preferences sections.
  - Extended `tests/profile.spec.ts` with new `Profile section layout` describe block asserting section test IDs.
- Task 2 (members directory and member profile revamp):
  - `src/components/members/member-filters.tsx`: added `data-testid="members-filter-search"` and `data-testid="members-filter-role"`.
  - `src/components/members/member-grid.tsx`: added `data-testid="members-grid"` and `data-testid="members-pagination"`.
  - `src/components/members/member-card.tsx`: added `data-testid="member-card-${id}"`, `data-testid="member-role-badge"`, `data-testid="member-level-badge"`.
  - `src/app/[locale]/members/page.tsx`: added `data-testid="members-page"` wrapper.
  - `src/app/[locale]/members/[id]/page.tsx`: added `data-testid="member-profile-page"`, `member-profile-header`, `member-stats-grid`, `member-reputation-section`, `member-achievements-grid`.
- Task 3 (profile page structure and preferences flows):
  - `src/app/[locale]/profile/page.tsx`: imported `ReputationSummary`; added `data-testid="profile-page"`, `profile-identity-section`, `profile-reputation-section` (new section using `ReputationSummary`), `profile-activity-section`, `profile-preferences-section`.
  - `src/components/reputation/reputation-summary.tsx`: added `data-testid="reputation-summary"`.
  - `src/components/notifications/notification-preferences.tsx`: added `data-testid="notification-preferences"`.

### Slice 7 — Notifications and Auth

- Task 1 (failing tests):
  - Created `tests/notifications-auth-surface-revamp.spec.ts` with four serial tests: notifications filter tabs/preferences toggle, login page form, signup page form, auth error page recovery actions.
  - Extended `tests/proposals.spec.ts` with `Auth page structure` describe block.
- Task 2 (notifications page revamp):
  - `src/app/[locale]/notifications/page.tsx`: added `data-testid="notifications-page"`, `notifications-preferences-toggle`, `notifications-filter-tabs`, `notifications-list`.
- Task 3 (auth pages revamp):
  - `src/app/[locale]/login/page.tsx`: added `data-testid="login-page"` and `login-form`.
  - `src/app/[locale]/signup/page.tsx`: added `data-testid="signup-page"` and `signup-form`.
  - `src/app/[locale]/auth/error/page.tsx`: added `data-testid="auth-error-page"`.

### Slice 8 — Admin Ops

- Task 1 (failing tests):
  - Created `tests/admin-ops-surface-revamp.spec.ts` with two serial tests: admin settings page tabs/content panel, admin submissions page.
  - Extended `tests/admin-config-audit.spec.ts` with `Admin settings page structure` describe block.
  - Extended `tests/tasks.spec.ts` with `Admin submission review page structure` describe block.
- Task 2 (admin revamp):
  - `src/app/[locale]/admin/settings/page.tsx`: added `data-testid="admin-settings-page"`, `admin-settings-tabs` wrapper, `admin-settings-content`.
  - `src/app/[locale]/admin/submissions/page.tsx`: added `data-testid="admin-submissions-page"` wrapper.
  - `src/components/tasks/task-review-panel.tsx`: added `data-testid="task-review-panel"`.

### Cross-feature consistency pass

- `src/app/[locale]/globals.css`: added Wave 2 consistency token block (`--transition-ui`, `--section-radius`, `--section-padding`) and documenting comment for section card pattern and type scale conventions.

### Validation

- `npm run lint`: passed (no ESLint warnings or errors).
- `npm run build`: passed (production build clean, all pages compiled successfully).

### Sign-off document

- `docs/plans/2026-02-20-ui-ux-revamp-wave2-signoff.md`

## 2026-02-20 (Session: UI/UX revamp wave 2 - disputes slice)

### Summary

Executed the disputes vertical slice for Wave 2, shipping a triage-first queue and a detail-page integrity rail focused on SLA urgency, evidence chronology, and explicit escalation posture.

### Implementation highlights

- Queue and command posture revamp:
  - `src/app/[locale]/disputes/page.tsx`: command deck framing, queue/mine control anchors.
  - `src/components/disputes/DisputeQueue.tsx`: triage deck counters, SLA/tier filters, escalation controls.
  - `src/components/disputes/DisputeCard.tsx`: SLA urgency chip + escalation cue per dispute row.
  - `src/components/disputes/DisputeStats.tsx`: operational snapshot framing + stats anchors.
- Detail integrity rail revamp:
  - `src/app/[locale]/disputes/[id]/page.tsx`: detail page anchors and comments panel anchoring.
  - `src/components/disputes/DisputeDetail.tsx`: two-column casefile + integrity rail with explicit deadline/evidence/response/mediation panels.
  - `src/components/disputes/DisputeTimeline.tsx`: timeline + deadline chip anchors.
- Action ergonomics:
  - `src/components/disputes/RespondPanel.tsx`: response guardrail copy and submission i18n.
  - `src/components/disputes/ResolvePanel.tsx`: neutralized resolution panel theme and resolution guardrail copy.
  - `src/components/disputes/CreateDisputeModal.tsx`: filing guardrail, localized eligibility/cancel copy, and modal anchors.
- Shared SLA helpers:
  - `src/features/disputes/sla.ts`: added urgency and escalation-candidate helpers used across queue/detail UI.
- Tests:
  - Added `tests/disputes-surface-revamp.spec.ts`.
  - Updated `tests/disputes.spec.ts` and `tests/dispute-sla.spec.ts` with additional transparency assertions.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/disputes-surface-revamp.spec.ts tests/disputes.spec.ts tests/dispute-sla.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: UI/UX revamp wave 2 - sprints slice)

### Summary

Executed the sprints vertical slice for Wave 2, adding phase-first command context on the list surface and an operator-focused detail rail for sprint execution/readiness.

### Implementation highlights

- Sprints command deck revamp (`src/app/[locale]/sprints/page.tsx`):
  - Added phase rail with explicit stage posture, countdown chip, settlement status panel, and stable test anchors.
  - Added view-tab and page-level anchors for resilient UI checks.
- Sprint board/list/timeline surface updates:
  - `src/components/sprints/sprint-board-view.tsx`: stronger sprint selection context, status chips, settlement state panel, and backlog anchor surfaces.
  - `src/components/sprints/sprint-list-view.tsx`: phase rail section + per-card anchors for active/planning/completed rows.
  - `src/components/sprints/sprint-timeline.tsx`: timeline-level anchors for UI integrity checks.
- Sprint detail operator layout (`src/app/[locale]/sprints/[id]/page.tsx`):
  - Added two-column operator grid with explicit phase timeline, settlement blocker panel, and readiness checklist.
  - Added stable anchors for all operator zones.
- Lifecycle dialog clarity:
  - `src/components/sprints/sprint-start-dialog.tsx`: start checklist context.
  - `src/components/sprints/sprint-complete-dialog.tsx`: completion checklist context.
- Tests:
  - Added `tests/sprints-surface-revamp.spec.ts`.
  - Extended `tests/sprints.spec.ts` and `tests/sprint-phase-engine.spec.ts` with sprint surface anchors.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/sprints-surface-revamp.spec.ts tests/sprints.spec.ts tests/sprint-phase-engine.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: UI/UX revamp wave 2 - proposals slice)

### Summary

Executed the first vertical slice of the wave-2 UI/UX revamp plan for proposals, covering list trust framing, detail decision rail architecture, creation wizard feedback improvements, and test-anchor hardening.

### Implementation highlights

- Proposals list trust framing (`src/app/[locale]/proposals/page.tsx`):
  - Added governance signal strip with stage chips and action hierarchy.
  - Added lifecycle/category filter test anchors and result anchors.
- Proposal card hierarchy (`src/components/proposals/ProposalCard.tsx`):
  - Added explicit decision-context row and stable `data-testid` per card.
- Proposal detail decision rail (`src/app/[locale]/proposals/[id]/page.tsx`):
  - Introduced two-column layout with right-side decision rail.
  - Added vote window panel, version context panel, immutable provenance callout.
  - Added stable anchors: `proposal-showcase`, `proposal-decision-rail`, `proposal-vote-window`, `proposal-version-context`, `proposal-provenance-callout`, `proposal-comments`, `proposal-task-list`.
- Proposal sections and creation flow updates:
  - Added structured/legacy section anchors in `src/components/proposals/ProposalSections.tsx`.
  - Updated creation header and lifecycle hint in `src/app/[locale]/proposals/new/page.tsx`.
  - Added wizard workflow context + validation summary + action anchors in `src/components/proposals/ProposalWizard.tsx`.
- Tests:
  - Added `tests/proposals-surface-revamp.spec.ts`.
  - Extended `tests/proposals.spec.ts` and `tests/proposals-lifecycle.spec.ts` with revamp anchors.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/proposals-surface-revamp.spec.ts tests/proposals.spec.ts tests/proposals-lifecycle.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 9 implementation)

### Summary

Implemented Task 9 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (trust-surface revamps for homepage, treasury, analytics), including UX trust widgets, treasury/analytics trust metadata payloads, i18n coverage, and new Playwright checks.

### Implementation highlights

- Homepage trust pulse revamp:
  - `src/app/[locale]/page.tsx` now shows sprint countdown, proposal stage mix, leaderboard snapshot, and recent activity with freshness metadata.
- Treasury trust transparency revamp:
  - `src/app/api/treasury/route.ts` now returns trust metadata (`emission_policy`, `latest_settlement`, audit link, refresh cadence).
  - `src/components/treasury/treasury-hero.tsx` and `src/app/[locale]/treasury/page.tsx` now surface policy/settlement posture and update cadence.
- Analytics liveness revamp:
  - `src/app/api/analytics/route.ts` now returns 30-day trust aggregates (proposal throughput, dispute aggregate, vote participation, active contributor signals).
  - `src/components/analytics/kpi-cards.tsx` and `src/app/[locale]/analytics/page.tsx` now render governance health + trust panel/freshness metadata.
- Domain/schema updates:
  - Added trust typings/schemas in `src/features/treasury/{types,schemas}.ts` and `src/features/analytics/{types,schemas}.ts`.
  - Tightened freshness cadence in `src/features/treasury/hooks.ts` and `src/features/analytics/hooks.ts`.
- Tests added:
  - `tests/home-trust-surface.spec.ts`
  - `tests/treasury-transparency.spec.ts`
  - `tests/analytics-liveness.spec.ts`
- i18n updates:
  - Added Task 9 copy in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Follow-up runtime fix:
  - `src/components/analytics/kpi-cards.tsx` now passes `{ symbol }` to `kpi.orgHolders` translation to avoid `FORMATTING_ERROR`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/home-trust-surface.spec.ts tests/treasury-transparency.spec.ts tests/analytics-liveness.spec.ts --workers=1`: pass (3/3).
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/profile.spec.ts --workers=1`: skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 8 implementation)

### Summary

Implemented Task 8 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Admin Configurability and Audit Trail Expansion), including required-change-reason enforcement, new admin policy knobs, append-only settings audit events, and admin settings UI updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220123000_admin_config_and_audit_events.sql`
  - new org policy config fields: `governance_policy`, `sprint_policy`,
  - append-only `admin_config_audit_events` table with immutable update/delete guards,
  - RLS policies for admin insert and admin/council read access.
- Expanded settings domain validation/types:
  - `src/features/settings/schemas.ts` now validates governance/sprint policy knobs and extended rewards settlement knobs.
  - `PATCH /api/settings` payload now requires `reason` and at least one mutable field.
  - `src/features/settings/types.ts` now includes `GovernancePolicyConfig`, `SprintPolicyConfig`, and extended `RewardsConfig`.
- Updated settings API orchestration:
  - `src/app/api/settings/route.ts` now:
    - enforces required `reason`,
    - applies org/voting config updates,
    - writes per-scope append-only audit rows (`org`, `voting_config`, `governance_policy`, `sprint_policy`, `rewards_config`) with previous/new payload snapshots.
- Updated settings UI:
  - `src/components/settings/settings-field.tsx` save bar now requires reason input before save.
  - `src/components/settings/{general,token,treasury,governance,sprints,rewards}-tab.tsx` now submit `reason`; governance/sprints/rewards include new policy controls.
  - `src/app/[locale]/admin/settings/page.tsx` passes governance policy to governance tab.
  - i18n updates in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added tests:
  - `src/features/settings/__tests__/config-validation.test.ts`
  - `tests/admin-config-audit.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/settings/__tests__/config-validation.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/admin-config-audit.spec.ts --workers=1`: skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 7 implementation)

### Summary

Implemented Task 7 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (XP-first leaderboard revamp), including DB ranking semantics, API-level deterministic ranking fallback, leaderboard hook/type additions, and XP-priority UX copy updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220120000_xp_leaderboard_view_refresh.sql`
  - refreshed `leaderboard_view` ranking to XP-first ordering with deterministic tie-breakers (`xp_total`, `total_points`, `tasks_completed`, `id`)
  - refreshes `leaderboard_materialized` when present.
- Updated leaderboard API:
  - `src/app/api/leaderboard/route.ts` now:
    - orders leaderboard rows by XP-first posture,
    - computes rank deterministically in server code,
    - falls back from `leaderboard_materialized` to `leaderboard_view` on query failure,
    - supports `?fresh=1` to bypass `unstable_cache` for deterministic test runs.
- Updated reputation domain layer:
  - `src/features/reputation/types.ts` now includes `LeaderboardEntry` types and XP-first ranking helpers.
  - `src/features/reputation/hooks.ts` now includes `useLeaderboard`.
- Updated leaderboard/reputation UI:
  - `src/app/[locale]/leaderboard/page.tsx` now consumes `useLeaderboard` and presents XP as primary metric, points as secondary context.
  - `src/components/reputation/reputation-summary.tsx` now includes points-as-tie-break context and XP-priority hint.
  - i18n updates in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added tests:
  - `src/features/reputation/__tests__/leaderboard-ordering.test.ts`
  - `tests/leaderboard-xp-priority.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/leaderboard-xp-priority.spec.ts --workers=1`: blocked in this environment due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 6 implementation)

### Summary

Implemented Task 6 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Rewards Settlement and Emission Safety), including DB-level settlement integrity controls, append-only reward settlement ledger events, payout idempotency hardening, sprint settlement orchestration updates, and rewards UX integrity visibility.

### Implementation highlights

- Added migration: `supabase/migrations/20260220113000_rewards_settlement_integrity.sql`
  - new settlement integrity metadata fields on `sprints`,
  - append-only `reward_settlement_events` with immutable update/delete guards,
  - distribution idempotency fields on `reward_distributions`,
  - settlement commit RPC: `commit_sprint_reward_settlement` (emission cap, carryover policy, debt prohibition, integrity hold, kill-switch).
- Updated sprint completion orchestration:
  - `src/app/api/sprints/[id]/complete/route.ts` now commits reward settlement integrity before closure and returns explicit settlement hold payloads.
- Updated reward APIs:
  - `src/app/api/rewards/route.ts` now returns latest settlement posture fields for UI.
  - `src/app/api/rewards/distributions/route.ts` now enriches epoch rows with settlement integrity status/reason.
  - `src/app/api/rewards/distributions/manual/route.ts` now applies deterministic dedupe keys and returns `409` for duplicate inserts.
  - `src/app/api/rewards/claims/[id]/pay/route.ts` now blocks duplicate payout distributions per claim.
- Updated rewards domain and UI:
  - Added settlement policy helpers: `src/features/rewards/settlement.ts`.
  - Added unit coverage: `src/features/rewards/__tests__/settlement.test.ts`.
  - Added e2e coverage scaffold: `tests/rewards-settlement-integrity.spec.ts`.
  - `src/components/rewards/rewards-overview.tsx` now surfaces settlement status/cap/carryover/hold reason.
  - `src/components/rewards/distributions-table.tsx` now displays settlement posture for epoch payouts.
- Updated supporting surfaces:
  - `src/features/rewards/schemas.ts`, `src/features/rewards/types.ts`, `src/features/rewards/index.ts`
  - `src/features/sprints/hooks.ts`, `src/app/api/sprints/route.ts`, `src/app/api/sprints/[id]/route.ts`, `src/app/api/sprints/[id]/start/route.ts`
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `npx playwright test tests/rewards-settlement-integrity.spec.ts tests/rewards.spec.ts --workers=1`: pass with partial execution (6 passed, 2 skipped due in-flight sprint guard in the Task 6 integrity spec).

### Follow-up fix (same day)

- Added migration `supabase/migrations/20260220114500_rewards_settlement_integrity_lock_fix.sql` to update `commit_sprint_reward_settlement` from `FOR UPDATE` to `FOR UPDATE OF s`, resolving Postgres error `0A000: FOR UPDATE cannot be applied to the nullable side of an outer join`.

## 2026-02-20 (Session: Governance integrity Task 5 implementation)

### Summary

Implemented Task 5 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Review and Disputes SLA Hardening), including DB SLA sweep automation, dispute-window filing gates, late-evidence lifecycle tracking, and disputes timeline transparency updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220110000_dispute_sla_and_evidence_rules.sql`
  - new append-only `dispute_evidence_events` table with late markers (`is_late`, `late_reason`)
  - deadline integrity constraints on `disputes`
  - overdue reviewer sweep RPC: `sweep_overdue_dispute_reviewer_sla`
  - pg_cron schedule: `sweep-overdue-dispute-reviewer-sla` (every 15 minutes)
- Updated dispute APIs:
  - `src/app/api/disputes/route.ts` now enforces dispute filing only during sprint `dispute_window` and uses fixed 72h reviewer response SLA.
  - `src/app/api/disputes/evidence/route.ts` now enforces PNG/JPG/PDF uploads, per-dispute max files, hard-close checks, and dispute-bound late-evidence events.
  - `src/app/api/disputes/[id]/respond/route.ts` now rejects responses after response deadline or window close.
  - `src/app/api/disputes/[id]/resolve/route.ts` now enforces window-close guard (admin override retained).
  - `src/app/api/disputes/[id]/route.ts` now returns signed evidence event timeline data.
- Added domain/test helpers:
  - `src/features/disputes/sla.ts` and `src/features/disputes/__tests__/sla-rules.test.ts`
  - `tests/dispute-sla.spec.ts`
  - `tests/helpers.ts` now supports dispute-window sprint fixture provisioning.
- Updated disputes UI:
  - `src/components/disputes/DisputeTimeline.tsx` now surfaces response due/overdue and dispute-window open/closed state.
  - `src/components/disputes/DisputeDetail.tsx` now shows evidence timeline + late badges and supports post-file evidence uploads.
  - `src/components/disputes/CreateDisputeModal.tsx` upload accept list aligned with API policy.
- Updated supporting surfaces:
  - `src/features/disputes/schemas.ts`, `src/features/disputes/types.ts`, `src/features/disputes/hooks.ts`
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - `tests/disputes.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `npx playwright test tests/dispute-sla.spec.ts tests/disputes.spec.ts --workers=1`: blocked by external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 4 implementation)

### Summary

Implemented Task 4 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Sprint Phase Engine Revamp), including DB phase transitions, settlement safety gates, reviewer-SLA automation, phased sprint APIs, and phase-aware sprint UI.

### Implementation highlights

- Added migration: `supabase/migrations/20260220103000_sprint_phase_engine.sql`
  - extended sprint phases: `planning`, `active`, `review`, `dispute_window`, `settlement`, `completed`
  - new sprint phase timestamps + settlement integrity metadata
  - forward-only DB trigger: `trg_sprints_enforce_phase_rules`
  - settlement blocker RPC: `get_sprint_settlement_blockers`
  - reviewer SLA RPC: `apply_sprint_reviewer_sla` (+24h extension + admin notifications)
- Updated sprint APIs:
  - `src/app/api/sprints/[id]/start/route.ts` now blocks starts when any sprint is in an execution phase.
  - `src/app/api/sprints/[id]/complete/route.ts` now advances phase-by-phase and only snapshots/closes during `settlement -> completed`.
  - `src/app/api/sprints/[id]/route.ts` and `src/app/api/sprints/route.ts` now return phase metadata fields.
- Updated dispute linkage:
  - `src/app/api/disputes/route.ts` now attaches new disputes to current in-flight sprint phases, not only `active`.
- Updated sprint UI:
  - `src/app/[locale]/sprints/page.tsx` and `src/app/[locale]/sprints/[id]/page.tsx` now support phase advance actions and phase feedback.
  - `src/components/sprints/sprint-timeline.tsx` now shows phase badges, countdowns, and settlement blocked reasons.
  - `src/components/sprints/sprint-list-view.tsx` now renders dynamic phase badges.
- Added/updated tests:
  - `tests/sprint-phase-engine.spec.ts`
  - `src/features/sprints/__tests__/phase-engine.test.ts`
  - `tests/sprints.spec.ts` updated for phased completion flow
  - `tests/helpers.ts` updated to resolve current in-flight sprint across new phases
- Updated typing/i18n surfaces:
  - `src/features/sprints/types.ts`, `src/features/sprints/schemas.ts`, `src/features/sprints/hooks.ts`
  - `src/types/database.ts`, `src/types/index.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `node --test src/features/sprints/__tests__/phase-engine.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/sprint-phase-engine.spec.ts tests/sprints.spec.ts tests/disputes.spec.ts`: failed due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`), not due local phase-engine assertions.

## 2026-02-20 (Session: Governance integrity Task 3 implementation)

### Summary

Implemented Task 3 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Proposal-Task Linkage Revamp), including immutable DB provenance constraints, API creation gating, provenance UI surfaces, and new linkage tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220100000_proposal_task_linkage.sql`
  - new `tasks.proposal_version_id` column
  - composite provenance constraints from `tasks(proposal_id, proposal_version_id)` to `proposal_versions(proposal_id, id)`
  - immutable proposal-link trigger: `trg_tasks_enforce_proposal_provenance`
  - creation gate in trigger: proposal-linked tasks require finalized/passed proposal state (legacy `approved` handled as finalized/passed compatibility)
- Updated task APIs and schemas:
  - `src/app/api/tasks/route.ts` validates proposal lifecycle gate and current-version binding before insert.
  - `src/app/api/tasks/[id]/route.ts` includes proposal/proposal-version provenance in response payloads.
  - `src/app/api/tasks/[id]/subtasks/route.ts` inherits proposal provenance from parent tasks.
  - `src/features/tasks/schemas.ts` adds `proposal_version_id` to create schema and removes proposal-link fields from update schema.
  - `src/features/tasks/types.ts` and `src/types/database.ts` updated for new provenance types/relationships.
- Updated UI surfaces:
  - `src/components/tasks/task-detail-summary.tsx` now shows governance source + immutable version badge.
  - `src/app/[locale]/tasks/[id]/page.tsx` fetch/update queries now include provenance relations.
  - `src/app/[locale]/proposals/[id]/page.tsx` now creates tasks via `/api/tasks`, enforces finalized/passed creation path, and shows linked execution tasks with source version badges.
- Added tests:
  - `tests/proposal-task-flow.spec.ts`
  - `src/features/tasks/__tests__/proposal-linkage.test.ts`
- Added provenance i18n keys in:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/tasks/__tests__/proposal-linkage.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/proposal-task-flow.spec.ts tests/tasks.spec.ts`: skipped in this environment because required Supabase env vars are not loaded.

## 2026-02-20 (Session: Governance integrity Task 2 implementation)

### Summary

Implemented Task 2 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Voting Snapshot and Finalization Integrity), including DB migration, API hardening, voting UI updates, and new integrity-focused tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220093000_voting_snapshot_integrity.sql`
  - new proposal integrity metadata:
    - `server_voting_started_at`
    - `finalization_dedupe_key`
    - `finalization_attempts`
    - `finalization_last_attempt_at`
    - `finalization_failure_reason`
    - `finalization_frozen_at`
  - new immutable effective-power snapshot table:
    - `proposal_voter_snapshots`
  - new RPCs:
    - `resolve_proposal_snapshot_delegate` (deterministic cycle break to self-power)
    - `start_proposal_voting_integrity` (atomic snapshot + transition to `voting`)
    - `finalize_proposal_voting_integrity` (idempotent lock + dedupe + retry + freeze)
- Updated voting APIs:
  - `src/app/api/proposals/[id]/start-voting/route.ts` now uses transactional snapshot RPC.
  - `src/app/api/proposals/[id]/finalize/route.ts` now uses idempotent finalize RPC and returns idempotency/freeze metadata.
  - `src/app/api/proposals/[id]/vote/route.ts` now reads weight from `proposal_voter_snapshots` first (legacy fallback to `holder_snapshots`).
  - `src/app/api/proposals/[id]/effective-power/route.ts` now uses snapshot power once voting starts/finalizes.
- Updated voting domain/UI:
  - `src/features/voting/schemas.ts` and `src/features/voting/types.ts` expanded for dedupe/freeze/snapshot payloads.
  - `src/features/voting/hooks.ts` now propagates API error codes.
  - `src/components/voting/AdminVotingControls.tsx` now surfaces frozen-finalization state.
  - `src/components/voting/VotingPanel.tsx` now fetches user voting weight from `/api/proposals/[id]/vote`.
- Added tests:
  - `tests/voting-integrity.spec.ts`
  - `src/features/voting/__tests__/snapshot-integrity.test.ts`
- Updated i18n keys for frozen finalization messaging:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/voting/__tests__/snapshot-integrity.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/voting-integrity.spec.ts`:
  - first run skipped (missing env vars).
  - env-loaded run attempted, but failed in this environment due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 1 implementation + migration execution)

### Summary

Completed Task 1 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Proposal Lifecycle Stage Engine), including DB schema/RPC/trigger work, proposal domain/API/UI updates, lifecycle i18n additions, and dedicated lifecycle tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220090000_proposal_stage_engine.sql`
  - lifecycle status extensions for `proposal_status`
  - proposal versioning model (`proposal_versions`)
  - append-only transition ledger (`proposal_stage_events`)
  - override TTL expiry RPC (`expire_proposal_override_promotions`)
  - comment-to-version linkage via `comments.proposal_version_id`
- Added tests:
  - `src/features/proposals/__tests__/lifecycle.test.ts`
  - `tests/proposals-lifecycle.spec.ts`
- Updated proposal surfaces:
  - domain schemas/types/hooks
  - proposal API routes (`/api/proposals`, `/api/proposals/[id]`, `/api/proposals/[id]/status`, comments + start-voting compatibility)
  - proposal detail/list UI and status badge
  - voting admin controls start condition (`discussion` compatibility)
- Added/updated proposal lifecycle copy in:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
- Updated generated DB types in `src/types/database.ts`.

### Migration execution chronology

- Migration A (enum-only step) applied successfully.
- Migration B initially failed in SQL editor with:
  - `cannot ALTER TABLE "proposal_versions" because it has pending trigger events`
- Resolution:
  - run enum additions in separate committed step (A)
  - in B, flush deferred constraints before RLS table alteration (`SET CONSTRAINTS ALL IMMEDIATE;`)
- Result: Migration B applied successfully after fix.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/proposals-lifecycle.spec.ts`:
  - initially skipped (missing env vars)
  - then failed with `ECONNREFUSED` until app server was running
  - final run passed with env loaded and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`.

### Environment/setup note

- `.env.local` sourcing error (`tweet.read: command not found`) traced to unquoted `TWITTER_OAUTH_SCOPE`.
- Local fix used: quote scope value so shell `source` works.

### Related non-governance adjustment

- Build validation surfaced an unrelated strict-cast issue in `src/app/[locale]/admin/submissions/page.tsx`; applied minimal type-cast compatibility fix to unblock production build validation during this workstream.

## 2026-02-19 (Session: DB Performance & Optimization — Sessions 2–5 wrap-up)

### Summary

Completed the DB Performance & Optimization plan. Verified that Sessions 1–5 DB migrations were already applied to the live database in a prior session via Supabase MCP. Completed the remaining app-level code changes (Session 5c) and documented all migration drift.

### DB state (verified 2026-02-19)

All planned DB migrations are applied. Advisor results post-completion:

- **Security errors**: Cleared — `market_snapshots` has RLS, `leaderboard_view` is no longer SECURITY DEFINER.
- **Duplicate permissive policies**: Cleared — consolidated to 1 policy per table+cmd+role.
- **RLS auth.uid() per-row**: Cleared — all 76 policies now use `(SELECT auth.uid())` initplan form.
- **Missing FK indexes**: Added for `comments`, `dispute_comments`, `holder_snapshots`, `notification_batch_events`, `notifications`, `recurring_task_instances`, `reward_claims`.
- **Remaining performance lints**: Only INFO-level unused-index warnings remain — these are expected in a dev/low-traffic environment and do not affect correctness.
- **Remaining security warnings**: `leaderboard_materialized` accessible by anon (intentional — public leaderboard) and `auth_leaked_password_protection` disabled (Supabase dashboard setting, not code).

### Code changes

**`src/features/proposals/hooks.ts`** — `useProposals` (Session 5c)
- Replaced sequential 2-query pattern (proposals → `get_comment_counts(ids)`) with parallel execution.
- New DB function `get_comment_counts_for_type(p_subject_type)` fetches all counts for a subject type without needing IDs, eliminating the sequential dependency.
- Both queries now run concurrently via `Promise.all`.

**`src/features/tasks/hooks.ts`** — `usePendingReviewSubmissions` (Session 5b — completed in prior session)
- Already uses a single nested select with submitter and task joined inline.

**`src/lib/supabase/server.ts`** — Connection pooling (Session 5d)
- Verified: this app uses `@supabase/ssr` with PostgREST (REST API), not direct Postgres. The pooler URL is only needed for direct psql/ORM connections. No change required.

### Migration files added

- `supabase/migrations/20260219222832_proposals_comment_counts_parallel_rpc.sql` — `get_comment_counts_for_type` function

### Known migration file gap

Sessions 1–5 DB migrations were applied via Supabase MCP in a prior session with auto-generated timestamps. The local repo has:
- `20260219000000_rls_perf_fix_initplan.sql` and `20260219000001_rls_perf_fix_initplan_supplement.sql` — local files with different version numbers than what was applied to DB (`20260219215118`, `20260219215231`). All SQL is idempotent (DROP IF EXISTS + CREATE).
- Sessions 2–5 DB migrations (`20260219215935` through `20260219221700`) have **no local SQL files** — they were applied directly via MCP.

Impact: running `supabase db push` would re-apply the two Session 1 local files (idempotent, safe) and would not know about Sessions 2–5 (already applied, no conflict). This is a tracking/documentation gap, not a functional issue.

### Validation

- `npm run lint`: pass.

## 2026-02-18 (Session: Phase G re-test + E2E stabilization)

### Summary

Continued Phase G after staging/ngrok recovery, fixed API/test mismatches uncovered in the first sign-off attempt, and reran the full E2E suite successfully against the staging URL.

### Code and test updates

- Fixed task detail/update API query shape to remove invalid `tasks_created_by_fkey` profile join:
  - `src/app/api/tasks/[id]/route.ts`
- Removed the same invalid created-by join from sprint detail task select:
  - `src/app/api/sprints/[id]/route.ts`
- Updated E2E tests for current API behavior and stability:
  - `tests/disputes.spec.ts` (`config` shape assertion + allow `429` in re-file guard path)
  - `tests/proposals.spec.ts` (proposal `solution` text now satisfies min length validation)
  - `tests/tasks.spec.ts` (set Task CRUD describe to serial mode)
  - `tests/profile.spec.ts` (set ngrok warning-skip header for browser flow)

### Validation and evidence

- `npm run lint`: pass.
- `npm run build`: pass (after clearing stale `.next` artifacts from mixed dev/build state).
- Staging health check: `GET /api/health` returned `{"status":"ok"}` (HTTP `200`).
- Full staging E2E run (`npm run test:e2e -- --workers=1`): `45 passed`, `3 skipped`.

### Remaining for final launch decision

- Manual QA runbook still pending: `docs/qa-runbook.md` (desktop + mobile).
- Sentry unresolved-error review still pending (local env still missing `SENTRY_AUTH_TOKEN`).

## 2026-02-18 (Session: Phase G staging sign-off)

### Summary

Executed the launch sign-off gate from `NEXT_SESSION_FOCUS.md` and recorded a formal no-go decision because staging is not currently healthy.

### Validation and evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run test:e2e` against staging target: fail (`10 failed`, `3 skipped`, `35 did not run`), with widespread unexpected `404` responses on critical API routes.
- Direct health check to staging `/api/health`: returned ngrok offline page (`ERR_NGROK_3200`), HTTP `404`, not `{"status":"ok"}`.

### Outcome

- Launch decision: **No-go**.
- Manual QA runbook blocked until staging is reachable/healthy.
- Sentry unresolved-error review blocked in this environment (`SENTRY_AUTH_TOKEN` not configured and no successful staging smoke baseline).
- Added sign-off report: `docs/2026-02-18-phase-g-staging-signoff.md`.
- Updated `NEXT_SESSION_FOCUS.md` with gate status and blockers.

## 2026-02-18 (Session: Launch readiness execution — Phases B, D, E, F)

### Summary

Resumed the professional launch readiness plan (`docs/plans/2026-02-17-professional-launch-readiness-plan.md`) from a frozen session that had completed Phases A and B and partially completed Phase D.

### Phase D: UX/UI, i18n, and Accessibility (completed)

**i18n hardened:**
- Added `Templates.signInRequired` + `Templates.signInRequiredHint` to all 3 locales (en, pt-PT, zh-CN).
- Added `Disputes.notFound`, `backToDisputes`, `loadFailed`, `noCommentsYet` to all 3 locales.
- Added `GlobalError` namespace (`title`, `description`, `tryAgain`) to all 3 locales.
- Added `Navigation.submissions` to all 3 locales.

**Component fixes:**
- `src/app/[locale]/tasks/templates/page.tsx`: replaced 2 hardcoded strings with `t()` calls.
- `src/app/[locale]/disputes/[id]/page.tsx`: replaced 4 hardcoded strings (`loadFailed`, `backToDisputes` ×2, `notFound`, `noCommentsYet`).
- `src/app/global-error.tsx`: replaced 3 hardcoded strings with a minimal locale map keyed from `document.documentElement.lang` (avoids next-intl dependency outside the `[locale]` layout).
- `src/components/layout/sidebar.tsx` + `mobile-sidebar.tsx`: added `/admin/submissions` nav entry (ClipboardCheck icon, admin/council only).

**Type cast cleanup:**
- `src/components/layout/top-bar.tsx`: removed `(profile as any)` — `profile.name` is `string | null` in the generated DB types.
- `src/components/navigation.tsx`: same removal in 2 places.

### Phase E: Security and Logging Hygiene (completed)

- `src/lib/twitter/client.ts`: removed 4 debug `console.log` lines from `exchangeCodeForToken` that logged `redirectUri`, clientSecret length, HTTP status, and Location header. Also fixed inconsistent indentation of the `fetch` call. Retained `console.error` on failure paths (appropriate for incident response).
- Confirmed zero remaining `console.log` calls in `src/app/api/` and `src/lib/`.

### Phase F: Performance and Reliability Gate (partial)

- `.github/workflows/ci.yml`: added `e2e` job (depends on `lint-and-build`) that installs Playwright Chromium and runs `npm run test:e2e`. Passes secrets as env vars; tests self-skip when Supabase creds are absent.
- Health endpoint (`/api/health`) already exists and checks Supabase + market cache.

### Validation

- `npm run lint`: ✔ No ESLint warnings or errors
- `npm run build`: ✔ Passes cleanly

### Phase C: Core Flow Verification (completed)

**New files:**
- `tests/helpers.ts` — shared fixtures: `createQaUser`, `buildSessionCookie`, `deleteQaUser`, `insertActiveSprint`, `getActiveSprintId`, `getFirstOrgId`, etc. Extracted so all spec files share one pattern.
- `tests/tasks.spec.ts` — Task CRUD (auth + role), full submit → review lifecycle (member submits, admin approves, task goes to `done`).
- `tests/sprints.spec.ts` — Sprint lifecycle: create, list, get, update, start (+ 409 conflict guard), complete with snapshot.
- `tests/proposals.spec.ts` — Proposal lifecycle: create as member, public GET, submit, vote endpoint, delete.
- `tests/disputes.spec.ts` — Dispute lifecycle: file against rejected submission (service-role fixture), add comment, list comments, withdraw.
- `tests/rewards.spec.ts` — Rewards summary, claims list, claim validation (below threshold → 400), successful claim path.
- `docs/qa-runbook.md` — Manual fallback QA checklist for auth, nav, tasks, sprints, proposals, disputes, rewards, error states, accessibility, mobile, and post-deploy smoke.

All tests self-skip when Supabase env vars are absent (graceful CI skip pattern with `test.beforeEach → test.skip`).

### Remaining

- Phase G: Staging Sign-off — final go/no-go checklist against all completed phases.

## 2026-02-17 (Session: Deploy readiness audit + Phase 19 planning)

### Validation baseline

- Ran `npm run lint` (pass).
- Ran `npm run build` (pass).
- Ran `npm run test:e2e`:
  - initial sandbox run failed due browser launch permissions
  - elevated run completed but discovered 1 test and skipped it

### Readiness findings documented

- Added a new deployment readiness snapshot section to `BUILD_PLAN.md` with current status and launch blockers.
- Recorded key blockers:
  - incomplete API validation hardening on several mutation routes
  - very limited automated test coverage and no CI test gate
  - i18n/UX consistency gaps on key pages and fallback states
  - logging hygiene issue in Twitter OAuth client
  - missing QA artifact referenced in build plan

### Planning deliverables

- Added Phase 19 launch-readiness program to `BUILD_PLAN.md` with user stories and test expectations by phase.
- Added a detailed execution plan with user-story and test tracks:
  - `docs/plans/2026-02-17-professional-launch-readiness-plan.md`
- Added a persistent next-session priority list in `NEXT_SESSION_FOCUS.md` with top 3 execution targets (API hardening, test gate expansion, UX/i18n/accessibility polish).

## 2026-02-16 (Session: Twitter/X engagement verification foundation)

### Database and security

- Added migration `20260216180000_twitter_engagement_verification.sql`:
  - Extended `task_type` enum with `twitter`
  - Added `user_profiles.twitter_verified`
  - Added tables: `twitter_accounts`, `twitter_oauth_sessions`, `twitter_engagement_tasks`, `twitter_engagement_submissions`
  - Added enums: `twitter_engagement_type`, `twitter_verification_method`
  - Added indexes, RLS policies, and updated-at triggers
  - Added column-level token protection for encrypted token fields

### Backend APIs and libs

- Added token encryption helper: `src/lib/encryption.ts` (AES-256-GCM).
- Added Twitter OAuth + API client utilities:
  - `src/lib/twitter/client.ts`
  - `src/lib/twitter/pkce.ts`
  - `src/lib/twitter/utils.ts`
- Added Twitter account/OAuth routes:
  - `src/app/api/twitter/link/start/route.ts`
  - `src/app/api/twitter/link/callback/route.ts`
  - `src/app/api/twitter/account/route.ts`
- Extended task and review APIs for Twitter flows:
  - task creation now supports `twitter_task` metadata (`src/app/api/tasks/route.ts`)
  - task submission route now supports `submission_type: twitter` and writes evidence rows (`src/app/api/tasks/[id]/submissions/route.ts`)
  - submission review route now updates twitter verification state (`src/app/api/submissions/[id]/review/route.ts`)
  - task detail API enriches with twitter task/submission metadata (`src/app/api/tasks/[id]/route.ts`)

### Frontend and schemas

- Added `twitter` task type across task schemas/types/utils:
  - `src/features/tasks/schemas.ts`
  - `src/features/tasks/types.ts`
  - `src/features/tasks/utils.ts`
- Added Twitter task creation fields in admin task modal (`src/components/tasks/task-new-modal.tsx`).
- Added Twitter submission form with account linking/unlinking and evidence fields (`src/components/tasks/task-submission-form.tsx`).
- Added Twitter rendering in review panel and task-type badge updates:
  - `src/components/tasks/task-review-panel.tsx`
  - `src/components/tasks/task-type-badge.tsx`
- Prevented twitter template instantiation until template metadata support exists (`src/app/api/tasks/templates/[id]/instantiate/route.ts`).

### Types, i18n, docs

- Updated generated DB typing surface for new tables/enums/column:
  - `src/types/database.ts`
  - `src/features/auth/context.tsx` profile select now includes `twitter_verified`
- Added i18n keys for new Twitter UI in all locales:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
- Updated env and setup docs:
  - `.env.local.example`
  - `README.md`
  - `BUILD_PLAN.md` (Twitter/X integration item marked complete)

### Validation

- `npm run lint` passes.
- `npm run build` passes.

## 2026-02-16 (Session: Tasks visibility + dispute comments route stability)

### Task board visibility

- Fixed Tasks page showing `0 tasks` by replacing a fragile nested relation query in `src/app/[locale]/tasks/page.tsx`.
- Removed nested `assignees:task_assignees(... user:user_profiles ...)` embed from the base `tasks` query.
- Added two-step assignee hydration (`task_assignees` rows + `user_profiles` lookup) and made enrichment non-fatal so tasks still render when participant lookup fails.

### Disputes route build stability

- Added `export const dynamic = 'force-dynamic'` to `src/app/api/disputes/[id]/comments/route.ts` to force runtime handling and avoid route collection instability during build.

### Validation

- `npm run lint` passes.
- `npm run build` passes.

## 2026-02-15 (Session: Disputes Completion — Phase 16)

### Disputes stability and flow

- Fixed client dynamic route handling for dispute/member detail pages by using `useParams()` instead of `use(params)`:
  - `src/app/[locale]/disputes/[id]/page.tsx`
  - `src/app/[locale]/members/[id]/page.tsx`
- Hardened dispute queue/detail rendering against invalid timestamps and partial payloads:
  - `src/components/disputes/DisputeCard.tsx`
  - `src/components/disputes/DisputeDetail.tsx`
  - `src/app/[locale]/disputes/[id]/page.tsx`

### Points and escalation correctness

- Removed duplicate API-side point increments to keep DB trigger as source of truth:
  - `src/app/api/submissions/[id]/review/route.ts`
  - `src/app/api/disputes/[id]/resolve/route.ts`
- Added migration `20260215222000_submission_points_claimable_sync.sql` for consistent `total_points`, `claimable_points`, and `tasks_completed` transitions.
- Added sprint close dispute automation migration `20260215230000_dispute_sprint_auto_escalation.sql` and wired API integration:
  - `src/app/api/sprints/[id]/complete/route.ts`

### Accountability and achievements

- Added reviewer accuracy endpoint/hook/dashboard surfacing:
  - `src/app/api/disputes/route.ts` (`reviewer_accuracy=true`)
  - `src/features/disputes/hooks.ts`
  - `src/components/disputes/DisputeStats.tsx`
- Added dispute achievement counters migration `20260215233000_dispute_achievement_counters.sql`.

### Evidence upload completion

- Added private dispute evidence storage migration:
  - `supabase/migrations/20260216003000_dispute_evidence_storage.sql`
- Added authenticated upload API:
  - `src/app/api/disputes/evidence/route.ts`
- Extended dispute create schema/types + persistence for `evidence_files`:
  - `src/features/disputes/schemas.ts`
  - `src/features/disputes/types.ts`
  - `src/app/api/disputes/route.ts`
  - `src/types/database.ts`
- Added signed evidence download links on dispute detail responses:
  - `src/app/api/disputes/[id]/route.ts`
- Updated dispute UI for file upload and detail rendering:
  - `src/components/disputes/CreateDisputeModal.tsx`
  - `src/components/disputes/DisputeDetail.tsx`
- Added i18n keys in all locales (`en`, `pt-PT`, `zh-CN`) for evidence upload labels/messages.

### Validation

- `npm run lint` passes
- `npm run build` passes
- Applied Supabase migrations for:
  - `20260216003000_dispute_evidence_storage.sql`
  - `20260215230000_dispute_sprint_auto_escalation.sql`
- Stabilized dispute specs:
  - made escalation fixture compatible with pre-existing active sprint (temporary suspend/restore)
  - made UI fixture login deterministic via session-cookie injection and robust dispute-link polling
  - switched QA fixture `organic_id` generation to collision-safe randomized values
- Fixed notifications category validation gaps for disputes:
  - added `disputes` to `src/features/notifications/schemas.ts`
  - included `disputes` in notification preference seeding in `src/app/api/notifications/preferences/route.ts`
- Phase 16 dispute suite passes serially:
  - `tests/phase16-disputes-api.spec.ts`
  - `tests/phase16-disputes-ui.spec.ts`
  - `tests/phase16-disputes-escalation.spec.ts`
  - `tests/phase16-disputes-reviewer-accuracy.spec.ts`
  - `tests/phase16-disputes-evidence-upload.spec.ts`
- Added dedicated achievements regression:
  - `tests/phase16-disputes-achievements.spec.ts` validates `first_arbiter` and `vindicated` unlock paths and `/api/achievements` visibility.

## 2026-02-15 (Session: Rewards & Distribution — Phase 15)

### Database

- Added migration `20260216000000_rewards_distribution.sql`
  - New columns: `user_profiles.claimable_points`, `sprints.reward_pool`, `orgs.rewards_config`
  - New enums: `reward_claim_status`, `distribution_type`
  - New tables: `reward_claims`, `reward_distributions` with indexes + RLS
  - Updated `update_user_points_on_task_completion()` trigger to maintain `claimable_points`
  - Added RPCs: `distribute_epoch_rewards(UUID)`, `get_rewards_summary()`
  - Added claimable points backfill and rebuilt `leaderboard_view` with `claimable_points`
  - Added defensive `DROP FUNCTION IF EXISTS` before RPC creation for compatibility

### Feature domain

- Created `src/features/rewards/`:
  - `types.ts` (claims/distributions/config/summary interfaces + constants)
  - `schemas.ts` (claim/review/pay/manual distribution/filter schemas)
  - `hooks.ts` (query key factory + rewards API hooks)
  - `index.ts` barrel export

### API routes

- Added rewards endpoints:
  - `src/app/api/rewards/route.ts`
  - `src/app/api/rewards/claims/route.ts`
  - `src/app/api/rewards/claims/[id]/route.ts`
  - `src/app/api/rewards/claims/[id]/pay/route.ts`
  - `src/app/api/rewards/distributions/route.ts`
  - `src/app/api/rewards/distributions/manual/route.ts`
  - `src/app/api/rewards/summary/route.ts`
- Added 60s cache header on rewards summary response
- Implemented safe JSON parsing for `rewards_config`
- Replaced unsupported relation joins with explicit profile/sprint enrichment queries

### UI / pages

- Added user rewards page: `src/app/[locale]/rewards/page.tsx`
- Added admin rewards page: `src/app/[locale]/admin/rewards/page.tsx`
- Added rewards component set in `src/components/rewards/`
  - overview, claim modal, claims/distributions tables, status badge
  - admin summary cards, review/pay modals, manual distribution modal

### Integrations

- Sprint completion integration:
  - `src/app/api/sprints/[id]/complete/route.ts` now includes `reward_pool` and calls `distribute_epoch_rewards`
  - returns `epoch_distributions` count without blocking sprint completion on distribution errors
- Settings integration:
  - Added rewards tab to settings types and tabs UI
  - Added `src/components/settings/rewards-tab.tsx`
  - `src/app/api/settings/route.ts` now reads/writes `rewards_config`
- Navigation:
  - Added `/rewards` and `/admin/rewards` nav entries (desktop + mobile)
- i18n:
  - Added Rewards namespace and new nav keys in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Compatibility fixes

- Restored convenience type aliases in `src/types/database.ts` after generated types overwrite:
  - `UserRole`, `SprintStatus`, `VoteValue`, `ProposalStatus`, `ProposalCategory`,
    `TaskType`, `TaskStatus`, `TaskPriority`, `ReviewStatus`, `ProposalResult`
- Updated profile and sprint select constants for new fields:
  - `claimable_points` in auth profile context
  - `reward_pool` in sprint hooks

### Verification

- `npm run lint` passes
- `npm run build` passes
- Verified unauthenticated guards on rewards endpoints return `401`

### Environment limitation

- Browser smoke could not be executed in this environment due missing Playwright runtime dependency (`libnspr4.so`)
- Authenticated member/admin rewards smoke remains required in CI or host machine with browser deps

## 2026-02-08 (Session: Notifications & Communication — Phase 11a)

### Database

- Migration `20260208000000_notifications_system.sql` — applied to Supabase
  - `notification_category` enum (tasks, proposals, voting, comments, system)
  - `user_follows` table — user subscribes to tasks/proposals
  - `notifications` table — per-user notification records with event type, category, actor, metadata
  - `notification_preferences` table — per-category in_app/email toggles
  - RLS policies: users manage their own data, SECURITY DEFINER triggers for inserts
  - Realtime publication enabled on `notifications` table
  - Helper functions: `get_notification_category()`, `resolve_follow_target()`
  - Fan-out trigger: `notify_followers()` on `activity_log` INSERT creates notifications for each follower
  - 5 auto-follow triggers: task creator, task assignee, proposal creator, voter, task commenter
- Migration `20260208_proposal_comment_notifications` — applied to Supabase
  - Activity log trigger for generic `comments` table (proposal comments)
  - Auto-follow trigger for proposal commenters
  - Updated `resolve_follow_target()` to handle both task and proposal comments
- Backfilled historical notifications from activity_log for existing follows
- Regenerated + manually extended `src/types/database.ts` with 3 new tables, enum, and 2 functions

### Feature domain

- Created `src/features/notifications/` — types, schemas, hooks, barrel export
  - Types: `Notification`, `NotificationPreference`, `UserFollow`, `NotificationCategory`, `FollowSubjectType`, `NotificationsResponse`, `EVENT_ICONS`, `NOTIFICATION_CATEGORIES`
  - Schemas: `notificationFiltersSchema`, `updatePreferenceSchema`, `followSchema`
  - Hooks: `useNotifications` (with Realtime subscription filtered by user_id), `useUnreadCount`, `useMarkRead`, `useMarkAllRead`, `useNotificationPreferences`, `useUpdatePreference`, `useIsFollowing`, `useFollow`, `useUnfollow`

### API routes

- `src/app/api/notifications/route.ts` — GET (list with cursor/category/unread filters + actor enrichment) + PATCH (mark all read)
- `src/app/api/notifications/[id]/read/route.ts` — PATCH (mark single read)
- `src/app/api/notifications/preferences/route.ts` — GET (with auto-seed defaults) + PATCH (upsert per-category)
- `src/app/api/notifications/follow/route.ts` — GET (check status) + POST (follow) + DELETE (unfollow)

### UI components

- `src/components/notifications/notification-bell.tsx` — bell icon button with unread count badge, dropdown panel, mark all read, view all link
- `src/components/notifications/notification-item.tsx` — notification row with unread dot, actor avatar, i18n action text, relative time, navigation resolution
- `src/components/notifications/notification-preferences.tsx` — toggle grid (categories × channels) with custom ToggleSwitch
- `src/components/notifications/follow-button.tsx` — follow/unfollow toggle with Bell/BellOff icons

### Pages & navigation

- Created `src/app/[locale]/notifications/page.tsx` — full page with category filter tabs, collapsible preferences panel, mark all read
- Added NotificationBell to top-bar (between wallet button and avatar)
- Added Notifications link to sidebar + mobile sidebar (Bell icon, gated on auth)
- Wired FollowButton into task detail page (`src/app/[locale]/tasks/[id]/page.tsx`) — visible to all authenticated users
- Wired FollowButton into proposal detail page (`src/app/[locale]/proposals/[id]/page.tsx`) — visible to all authenticated users, outside draft-only conditional

### Bug fixes

- Fixed Realtime subscription leak: filtered by `user_id=eq.${userId}` so users only receive their own notifications
- Added safety check in Realtime callback to prevent cross-user notification display

### i18n

- Added `Notifications` namespace (~40 keys) across en.json, pt-PT.json, zh-CN.json (events, preferences, follow, tabs, empty states)
- Added `notifications` key to `Navigation` namespace in all 3 locales
- Fixed 6 missing i18n keys across the broader app:
  - `Profile.unknown` — en/pt-PT/zh-CN
  - `Sprints.activeSprint` — en/pt-PT/zh-CN
  - `TaskDetail.noContributors` — en/pt-PT/zh-CN
  - `TaskDetail.labelLabels` — en/pt-PT/zh-CN
  - `TaskDetail.labelPlaceholder` — en/pt-PT/zh-CN
  - `TaskDetail.addLabel` — en/pt-PT/zh-CN

### Verification

- Lint: zero errors/warnings
- Build: compiles successfully

## 2026-02-07 (Session: Member Management & Admin Settings — Phase 9)

### Database

- Migration `20260207000000_org_config_and_member_privacy.sql` — applied to Supabase
  - Extended `orgs` table with token config (symbol, mint, decimals, total_supply), treasury config (wallet, allocations JSONB), sprint defaults, organic_id_threshold
  - Added `profile_visible BOOLEAN DEFAULT true` to `user_profiles`
  - Seeded initial "Organic" org row with current hardcoded values
  - Linked `voting_config` to org, added indexes, admin RLS for profile updates
- Regenerated `src/types/database.ts` from Supabase

### Feature domains

- Created `src/features/members/` — types, schemas, hooks (`useMembers`, `useMember`, `useUpdatePrivacy`, `useUpdateMemberRole`), barrel export
- Created `src/features/settings/` — types, schemas (per-tab Zod validation), hooks (`useOrganization`, `useUpdateOrganization`), barrel export

### API routes

- `src/app/api/members/route.ts` — list with search/filter/pagination
- `src/app/api/members/[id]/route.ts` — single member detail, respects privacy
- `src/app/api/members/privacy/route.ts` — toggle own visibility
- `src/app/api/settings/route.ts` — GET org+voting config, PATCH admin-only
- `src/app/api/settings/members/[id]/role/route.ts` — role assignment, admin-only

### UI components

- Created `src/components/members/` — member-card, member-filters, member-grid
- Created `src/components/settings/` — settings-tabs, settings-field, general-tab, token-tab, treasury-tab, governance-tab, sprints-tab, members-tab

### Pages

- `src/app/[locale]/members/page.tsx` — searchable/filterable member directory with pagination
- `src/app/[locale]/members/[id]/page.tsx` — member profile with privacy-aware rendering
- `src/app/[locale]/admin/settings/page.tsx` — admin settings with 6 tabs (General, Token, Treasury, Governance, Sprints, Members)

### Token config refactor

- `src/config/token.ts` — kept client-safe (static config + `OrgConfig` interface + `calculateMarketCap`)
- `src/config/token.server.ts` — new server-only file with `getOrgConfig()` (DB reads with 60s cache, static fallback)

### Navigation

- Updated sidebar + mobile sidebar: Members in main nav (Users icon), Settings in bottom section (gear icon, admin/council only)

### i18n

- Added Members + Settings namespaces across en.json, pt-PT.json, zh-CN.json
- Added `members` and `settings` navigation keys

### Documentation

- Updated CLAUDE.md with Phase 9 section and health summary
- Updated BUILD_PLAN.md: Phase 9 marked completed, version 1.6, recent updates added

### Verification

- Lint: zero errors/warnings
- Build: passes successfully

## 2026-02-06 (Session: Analytics Dashboard — Phase 10)

### New dependency

- Installed `recharts` for chart components

### Token config (SaaS prep)

- Created `src/config/token.ts` — `TOKEN_CONFIG` object with env var fallbacks, `calculateMarketCap()` helper

### Analytics feature domain

- Created `src/features/analytics/` — types, Zod schemas, React Query hook (`useAnalytics`), barrel export
- Follows same pattern as `src/features/activity/`

### Analytics API route

- Created `src/app/api/analytics/route.ts` — single GET endpoint with 60s in-memory cache
- Fetches KPIs (users, holders, tasks, proposals, price, market cap) + 5 RPC aggregations in parallel

### Database

- Migration `20260206000000_analytics_functions.sql` — 5 Postgres RPC functions:
  - `get_activity_trends(days)` — daily event counts by category (task/governance/comment)
  - `get_member_growth(months)` — monthly new + cumulative member counts
  - `get_task_completions(weeks)` — weekly completed tasks + points
  - `get_proposals_by_category()` — proposal count per category
  - `get_voting_participation(result_limit)` — last N voted proposals with vote breakdowns
- Migration applied to Supabase
- Updated `src/types/database.ts` with 5 new RPC function type signatures

### Analytics UI components

- Created `src/components/analytics/` with 7 components:
  - `chart-card.tsx` — reusable card wrapper with title, description, loading skeleton
  - `kpi-cards.tsx` — 6 stat cards in responsive grid (2→3→6 cols)
  - `activity-trend-chart.tsx` — stacked area chart (30-day daily totals)
  - `member-growth-chart.tsx` — area chart with gradient fill (12-month cumulative)
  - `task-completion-chart.tsx` — bar chart (12-week completions)
  - `proposal-category-chart.tsx` — donut chart with legend (category distribution)
  - `voting-participation-list.tsx` — card list with vote bars (last 10 voted proposals)

### Analytics page

- Created `src/app/[locale]/analytics/page.tsx` — public page, no auth required
- Layout: KPI cards → activity trends → community grid (member growth + task completions) → governance grid (proposals by category + voting participation)

### Navigation

- Added Analytics link to sidebar and mobile sidebar (position 2, after Home)
- Icon: `BarChart3` from lucide-react, `show: true` (public)

### i18n

- Added `Analytics` namespace (~30 keys) across en.json, pt-PT.json, zh-CN.json
- Added `analytics` key to `Navigation` namespace in all 3 locales

### Verification

- `npm run lint` — zero errors/warnings
- `npm run build` — compiles cleanly

## 2026-02-05 (Session: Proposals System Revamp)

### Proposals Feature Domain

- Created `src/features/proposals/` — types, Zod schemas, React Query hooks, barrel export
- Types: `Proposal`, `ProposalListItem`, `ProposalWithRelations`, `ProposalComment`, category/status metadata maps
- Schemas: `createProposalSchema` with per-step wizard validation, `commentSchema`, `statusUpdateSchema`
- Hooks: `useProposals` (with status + category filters), `useProposal`, `useProposalComments`, `useCreateProposal`, `useUpdateProposal`, `useDeleteProposal`, `useUpdateProposalStatus`, `useAddComment`

### Proposals UI Components

- Created `src/components/proposals/` — CategoryBadge, StatusBadge, ProposalCard, ProposalSections, ProposalWizard
- ProposalWizard: 4-step wizard (category+title → problem+solution → budget+timeline → review), per-step Zod validation, edit mode via `?edit=ID`
- ProposalSections: renders structured sections (summary, motivation, solution, budget, timeline) inside a single container with dividers; legacy body fallback for old proposals
- ProposalCard: list item with category badge, status badge, author, timestamp, comment count

### Proposals API Routes

- `src/app/api/proposals/route.ts` — GET (list with status/category filters) + POST (create, Zod validated)
- `src/app/api/proposals/[id]/route.ts` — GET (detail with author profile) + PATCH (update draft) + DELETE
- `src/app/api/proposals/[id]/comments/route.ts` — GET + POST
- `src/app/api/proposals/[id]/status/route.ts` — PATCH (admin/council status transitions)

### Database

- Migration: `20260205000000_proposals_structured_sections.sql`
  - Added `proposal_category` enum (feature, governance, treasury, community, development)
  - Added structured columns: category, summary, motivation, solution, budget, timeline
  - Added composite indexes for filtering
  - Added missing DELETE RLS policies (authors for drafts, admins for any)
- Updated `src/types/database.ts` with new columns, enum, and constants

### Pages Revamped

- `proposals/page.tsx` — refactored to use ProposalCard component + React Query hooks, added category filter dropdown
- `proposals/new/page.tsx` — refactored to use ProposalWizard component, supports edit mode
- `proposals/[id]/page.tsx` — refactored to use ProposalSections component, removed gradient header and outer card ring, sections in single container with higher contrast labels

### i18n

- Added `ProposalWizard` namespace (~45 keys) across en, pt-PT, zh-CN
- Added `ProposalDetail` section keys (sectionSummary, sectionMotivation, etc.)
- Added `Proposals` category filter keys (filterCategory, categoryAll, etc.)

### Detail Page UI Iteration

- Removed category gradient fade from header
- Removed outer card ring/shadow border
- Sections consolidated into single bordered container with `divide-y` dividers
- Section headings upgraded to `text-base font-semibold text-gray-900` for stronger contrast
- Section content set to `text-gray-500 text-sm` for visual hierarchy

## 2026-02-02 (Session: UI Improvements + Sidebar)

- Added app shell with desktop sidebar, mobile sidebar sheet, and top bar for global navigation
- Added sidebar state provider with persisted collapse state
- Introduced `PageContainer` layout helper and applied consistent page widths across core routes
- Refreshed home page hero, feature cards, and dashboard section layout
- Restyled stats/activity dashboard components for the updated UI language
- Updated global theme tokens (sidebar palette, accent, background) and Tailwind color mapping
- Added shadcn/ui primitives (avatar, badge, dropdown-menu, sheet, scroll-area, tooltip, etc.)
- Wired layout client to use the new app shell instead of legacy navigation
- Docs: consolidated PRD ideas into `BUILD_PLAN.md` and removed `prd.md`

## 2026-01-24 (Session 1: Workspace Audit + Type Consolidation)

- Repository health check: completed full workspace scan and audit
- Repository health check: lint passed with zero errors
- Repository health check: build passed (dynamic routes render as expected)
- Cleanup: removed orphaned backup file `src/app/[locale]/login/page-backup.tsx`
- Type consolidation: centralized task-related types in `src/features/tasks/types.ts`
- Type consolidation: added `Sprint`, `SprintStatus`, `UserProfile`, `TaskTab`, `Assignee`, `TaskListItem`, `TaskSubmissionSummary`, `TaskComment`, `Member`
- Type consolidation: updated `src/app/[locale]/tasks/page.tsx` to import from `@/features/tasks`
- Type consolidation: updated `src/app/[locale]/tasks/[id]/page.tsx` to import from `@/features/tasks`
- Type consolidation: removed duplicate type definitions from both tasks pages
- Type consolidation: fixed null-coalescing for `task.points` in UI displays
- Sprint type consolidation: added `SprintFormData`, `SprintStats`, `SprintTask` to `src/features/tasks/types.ts`
- Sprint type consolidation: updated `src/app/[locale]/sprints/page.tsx` to import from `@/features/tasks`
- Sprint type consolidation: updated `src/app/[locale]/sprints/[id]/page.tsx` to import from `@/features/tasks`
- Sprint type consolidation: removed ~60 lines of duplicate type definitions from sprint pages
- Docs: added Workspace Health Summary section to `CLAUDE.md` (known issues, do-not-do list, human confirmations)
- Docs: updated `README.md` project structure (feature scaffolding)
- Docs: updated `BUILD_PLAN.md` version to 1.4
- Findings: confirmed 6 empty feature directories as intentional scaffolding
- Findings: confirmed 6 empty component directories as intentional scaffolding
- Findings: documented large page components (1000+ lines) needing product approval to refactor
- Findings: documented API routes containing business logic (larger refactor needed)
- Tests: confirmed no automated tests; future work documented in `BUILD_PLAN.md`

## 2026-01-24 (Session 2: Voting + Profile Stats + E2E)

- Added voting system migration, API routes, feature/types, and UI components
- Highlighted live voting proposals on the proposals list
- Fixed token holder snapshot dedupe for Solana snapshots
- Added profile activity stats (total/approved submissions, contributions, points earned) with tooltips
- Widened profile page container slightly for layout breathing room
- Added Playwright E2E scaffolding and a profile stats test

## 2026-01-24/2026-01-25 (Session 3: Leaderboard + Sprint Planning)

- Leaderboard: traced missing ranks to absent `leaderboard_view` in Supabase
- Leaderboard: added API fallback ranking and ordered by `total_points`
- Leaderboard: created migration to recreate `leaderboard_view` with rank fields and grants
- Review: flagged build/runtime risks in local changes
- Sprints: added sprint capacity column + types and API support
- Sprints: added sprint planning dropdown with active/upcoming/past sections and capacity summaries
- Sprints: added burndown chart on sprint detail with points-based remaining work
- Sprints: set task `completed_at` when moving tasks to done across UI and APIs
- Sprints: updated sprint-related copy across en, pt-PT, zh-CN

## 2026-01-23 (Session 4)

- Applied Supabase submission schema in prod and recorded migration
- Added admin submission review queue page and Tasks header link
- Adjusted pending submissions fetch to avoid failing joins
- Fixed submission counts on Tasks page
- Updated review panel to display custom submission links
- Removed manual points updates from review API to rely on DB triggers

## 2026-01-23 (Session 3)

- Restored stashed working changes after undo/redo on Task Detail steps
- Audited pending diffs across Tasks, Sprints, i18n, and task likes/migration files
- Fixed comment fetching to avoid broken relationship join and ensure newest-first ordering

## 2026-01-23 (Session 2)

### Task Submission System

- Enhanced task detail page with claim/submit workflow
- Added `ClaimButton` component for users to claim available tasks
- Added `TaskSubmissionForm` component with type-specific fields (development, content, design, custom)
- Added submission history display with review status badges
- Added `TaskReviewPanel` and `QualityRating` components for reviewers

### API Routes

- Created `/api/tasks/[id]/claim` - claim/unclaim tasks (solo and team)
- Created `/api/tasks/[id]/submissions` - submit work for review
- Created `/api/submissions/[id]/review` - approve/reject submissions with quality scoring
- Updated `/api/tasks/[id]` - now returns assignees and submissions

### React Query Integration

- Added `@tanstack/react-query` for client-side data fetching
- Created `QueryProvider` component wrapping app in layout
- Added `react-hook-form` + `@hookform/resolvers` for form handling
- Created task hooks: `useTasks`, `useTask`, `useClaimTask`, `useSubmitTask`, etc.

### Supporting Changes

- Added task feature module: `src/features/tasks/` (hooks, types, schemas, utils)
- Added 18 new i18n keys for task submissions (en, pt-PT, zh-CN)
- Extended database types with `task_submissions`, `task_assignees` tables
- Fixed Zod discriminatedUnion issue with content submission schema
- Fixed Supabase TypeScript type casting for foreign key relationships

### Migration

- Database migration ready: `supabase/migrations/20250122000001_enhance_task_system.sql`

## 2026-01-23

- Aligned documentation paths with locale-based App Router structure
- Added localized auth error page and translations (en, pt-PT, zh-CN)
- Localized remaining hardcoded UI strings and accessibility labels
- Updated shadcn components config to point at localized globals
- Ran lint to verify changes (`npm run lint`)

## 2026-01-22

### Security: Server-side Nonce Validation

- Created `wallet_nonces` migration with 5-minute TTL and RLS policy
- Updated `/api/auth/nonce` to store nonces in database
- Updated `/api/auth/link-wallet` to validate, verify expiry, and consume nonces
- Added TypeScript types for `wallet_nonces` table
- Prevents replay attacks on wallet signature verification

### Performance: Solana RPC Caching

- Added server-side balance cache (30s TTL) in `/api/organic-id/balance`
- Added client-side balance cache (15s TTL) in profile page
- Logs cache hits vs RPC calls for debugging
- Prevents 429 rate limit errors from excessive RPC calls

### Wallet Flow

- Fixed wallet switch flow by sequencing select -> connect through wallet context
- Guarded against concurrent connect attempts and cleared walletName on disconnect

### Documentation

- Updated BUILD_PLAN.md with reliability tasks and recent updates
- Added infrastructure TODO: replace public Solana RPC with paid provider

## 2026-01-21 (Session 4)

- Performed code review of auth and wallet system
- Identified critical issues: nonce not validated server-side, state desync on wallet switch
- Identified high priority issues: no wallet update flow, race condition in Organic ID assignment
- Ran pre-commit review on pending documentation changes
- Added agent configuration files (agents/claude.md, docs/agents-prompts.md)
- Updated CLAUDE.md with agents section reference

## 2026-01-21 (Session 3)

- Removed React Hook dependency warnings by memoizing async loaders
- Replaced profile avatar `<img>` with `next/image` to clear lint warning
- Updated wallet UI translations and aligned Phase 13 wallet adapter status in build plan

## 2026-01-21 (Session 2)

- Localized wallet drawer/connect UI strings across en, pt-PT, and zh-CN
- Routed wallet UI labels through the Wallet translation namespace
- Updated BUILD_PLAN Phase 13 wallet adapter status (Solflare/Coinbase/Ledger/Torus)

## 2026-01-21

- Replaced wallet connect UX with a side drawer and nav-only entry point
- Added wallet change/connect fixes (first-click connect, no blink on change)
- Added auto-reconnect on locale change and improved wallet mismatch handling
- Added balance fetching guards, caching, and request cancellation for linked wallets
- Updated wallet-related translations (en, pt-PT, zh-CN)

## 2026-01-18 (Session 3)

- Performed folder structure audit
- Updated CLAUDE.md "This week" section: improving app features and new wallet integrations
- Updated CLAUDE.md Quick navigation with new i18n and utility paths
- Added accessible LanguageSelector dropdown component with keyboard navigation
- Added languageConfig to centralize locale metadata (code, name, flag)
- Refactored LocaleSwitcher to use new LanguageSelector component
- Updated BUILD_PLAN.md with Phase 5.5: Internationalization (Completed)
- Committed changes with granular commits and pushed to main

## 2026-01-18 (Session 2)

- Fixed i18n locale switching not updating translations
- Updated `src/app/[locale]/layout.tsx` to use `getMessages()` from `next-intl/server`
- Added `setRequestLocale()` for proper server-side locale handling
- Added complete translations for Home and Profile pages (en, pt-PT, zh-CN)
- Expanded message files with ~100 keys per language
- Committed and pushed all i18n changes

## 2026-01-18 (Session 1)

- Session opened and closed (no code changes)
- Verified working tree clean after i18n implementation
- All previous work committed

## 2026-01-17

- Added internationalization (i18n) support with next-intl
- Created `src/app/[locale]/` route structure for localized pages
- Added locale switcher component (`src/components/locale-switcher.tsx`)
- Set up i18n configuration in `src/i18n/`
- Migrated pages to locale-aware routing (auth, tasks, proposals, sprints, profile, leaderboard)
- Updated navigation component for i18n support
- Updated middleware for locale detection
- Modified next.config.js for i18n plugin
- Updated package.json with next-intl dependency
## 2026-02-09
- Implemented DB performance improvements: search vectors, indexes, batching RPCs, and query updates.
- Switched to self-hosted fonts (removed `next/font/google`) and added local font loading in globals.
- Updated Supabase types and rebuilt to address missing RPC/type exports.
- Restored deleted `supabase/` migrations and noted remaining build issue (`/_document` not found).

## 2026-02-17
- Implemented launch-readiness baseline rate limiting in `src/middleware.ts` for all `/api/*` routes with auth/read/write/sensitive categories.
- Extended `src/lib/rate-limit.ts` with IP helpers, bypass rules for unknown/loopback IPs, and standardized limits.
- Added auth endpoint throttling to `/api/auth/nonce` and `/api/auth/link-wallet`.
- Added nonce cleanup scheduler migration: `supabase/migrations/20260217121000_schedule_wallet_nonce_cleanup.sql`.
- Added deployment artifacts: `vercel.json`, `.github/workflows/ci.yml`, and `/api/health`.
- Restricted `next.config.js` remote image hosts to explicit domains.
- Added production deployment checklist to `README.md`.
- Added shared `src/lib/logger.ts` and replaced API route `console.error` usage with `logger.error` across API handlers.
- Added execution breakdown doc: `docs/plans/2026-02-17-launch-readiness-execution.md`.
- Added Sentry baseline integration via `src/lib/sentry.ts` using `@sentry/node` + `@sentry/profiling-node`.
- Updated logger to send captured exceptions/messages to Sentry when DSN env vars are configured.
- Added Sentry and rate-limit env keys to `.env.local.example` and README deployment checklist.
- Added optional Upstash Redis REST rate-limiting backend with automatic in-memory fallback.
- Upgraded Sentry to full Next.js SDK wiring (`@sentry/nextjs`) with:
  - `src/instrumentation.ts` + `src/instrumentation-client.ts`
  - `src/sentry.server.config.ts` + `src/sentry.edge.config.ts`
  - root error boundary `src/app/global-error.tsx`
  - `withSentryConfig` integration in `next.config.js`
- Migrated `src/lib/sentry.ts` to use `@sentry/nextjs` capture APIs and added shared settings helper (`src/lib/sentry-settings.ts`).
- Ran launch QA checks:
  - `tests/phase16-disputes-api.spec.ts` passed
  - `tests/phase16-disputes-ui.spec.ts` passed (includes notifications endpoint check)
  - hardened `tests/profile.spec.ts` (fixture user + Supabase session-cookie auth) and rerun passed
  - proposal lifecycle API smoke passed (create -> vote -> finalize)
  - stabilized `tests/phase2-tasks-ui.spec.ts` by replacing UI form login with Supabase session-cookie auth bootstrap; rerun passed in ~45s
