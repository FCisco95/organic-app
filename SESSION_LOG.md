# Session Log

Add newest entries at the top.

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
