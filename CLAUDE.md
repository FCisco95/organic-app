# CLAUDE.md

Fast reference for working in this repo. Keep it short, accurate, and actionable.

## Project snapshot

Organic App is a DAO-style community app for $ORG built with Next.js 14 App Router, Supabase (Postgres + Auth), and Solana wallet linking.
Core domains: tasks, proposals, voting, sprints, notifications, profiles, Organic ID.

## Authority order

- Repo-wide agent rules: `AGENTS.md`
- Workspace goals/principles: `GEMINI.md`
- Agent-specific roles: `agents/claude.md`

## Definition of done (for changes)

- Feature works locally: `npm run dev`
- Lint passes: `npm run lint`
- Build passes for important changes: `npm run build`
- Formatting is clean: `npm run format`
- No obvious TypeScript issues
- Docs updated if behavior, flows, or assumptions changed

## Hard rules (never break)

Security and secrets

- Never print, log, paste, or expose secrets from `.env.local`.
- Never commit secrets, tokens, private keys, or Supabase service role keys.
- If env vars are missing, ask Cisco and explain what is required.

Supabase and Solana

- Do not modify Supabase RLS policies unless explicitly requested.
- Do not change token verification or wallet linking logic unless explicitly requested.
- Any wallet-related change must keep signature verification strict.

Change discipline

- Prefer small, focused diffs.
- Ask before large refactors, renames, moving folders, or changing public APIs.
- Keep domain logic out of UI components when possible.

## Architecture rules

Separation of concerns

- UI components: `src/components/`
- Domain logic and hooks: `src/features/`
- Cross-cutting utilities: `src/lib/` and `src/hooks/`
- Route handlers (`src/app/api`) orchestrate only, no heavy business logic

Data access

- React Query owns caching and invalidation for client data flows.
- Zod validates all external input (API requests, forms, query params).

## Working checklist (lightweight)

- Restate goal in 1 sentence.
- List assumptions (if any).
- Plan the smallest safe change with file paths.
- Keep diffs minimal and scoped to a single concern.
- Add or update docs when behavior changes.

## Quick navigation

Start

- App Router root: `src/app/`
- Localized routes: `src/app/[locale]/`
- Root layout: `src/app/[locale]/layout.tsx`
- Global styles: `src/app/[locale]/globals.css`

Domains

- Auth: `src/features/auth/`
- Profile: `src/features/profile/`
- Organic ID: `src/features/organic-id/`
- Tasks: `src/features/tasks/`
- Proposals: `src/features/proposals/`
- Voting: `src/features/voting/`
- Sprints: `src/features/sprints/`
- Activity: `src/features/activity/`
- Analytics: `src/features/analytics/`
- Treasury: `src/features/treasury/`
- Members: `src/features/members/`
- Settings: `src/features/settings/`
- Notifications: `src/features/notifications/`

UI

- Shared UI (shadcn): `src/components/ui/`
- Feature UI: `src/components/{analytics,auth,dashboard,members,notifications,proposals,settings,sprints,tasks,voting,wallet}/`
- App shell + navigation: `src/components/layout/`
- Locale switcher: `src/components/locale-switcher.tsx`
- Language selector: `src/components/language-selector.tsx`

i18n

- i18n config: `src/i18n/`
- Translations: `messages/` (en.json, pt-PT.json, zh-CN.json)

API and DB

- API routes: `src/app/api/`
- Migrations: `supabase/migrations/`
- Edge functions: `supabase/functions/`
- Generated types: `src/types/`

Shared libs and assets

- Supabase clients: `src/lib/supabase/`
- Shared utilities: `src/lib/utils.ts`
- Public assets: `public/assets/`

## Commands

`npm run dev`  
`npm run lint`  
`npm run build`  
`npm run format`

## UI Shell + Sidebar (added 2026-02-02)

### What was built

- App shell with desktop sidebar, mobile sheet navigation, and top bar
- Sidebar collapse state persisted in localStorage
- Page container helper for consistent page widths
- Updated global theme tokens for sidebar palette + accent colors
- Dashboard components restyled to match new layout

### Key files

- `src/components/layout/` — AppShell, Sidebar, MobileSidebar, TopBar, PageContainer, context
- `src/components/layout-client.tsx` — uses AppShell instead of legacy Navigation
- `src/app/[locale]/globals.css` — theme tokens incl. sidebar
- `tailwind.config.ts` — sidebar color mappings

## Activity Dashboard & Live Feed (added 2026-02-01)

### What was built

Live activity dashboard on the homepage with DAO stats and a real-time activity feed visible to all visitors.

**App code (done, lint+build pass):**

- `src/features/activity/` — types, Zod schemas, React Query hooks with Supabase Realtime subscription
- `src/app/api/stats/route.ts` — DAO stats (users, holders, tasks completed, active proposals, $ORG price via Jupiter). 60s server-side cache.
- `src/app/api/activity/route.ts` — Activity feed with cursor pagination, joins actor profile info.
- `src/components/dashboard/stats-bar.tsx` — Horizontal stat cards grid
- `src/components/dashboard/activity-feed.tsx` — Scrollable feed with loading/empty states
- `src/components/dashboard/activity-item.tsx` — Single feed entry with emoji icon, actor name, relative timestamp
- `src/app/[locale]/page.tsx` — StatsBar + ActivityFeed added below feature cards
- `messages/{en,pt-PT,zh-CN}.json` — `dashboard.stats.*` and `dashboard.activity.*` keys
- `src/types/database.ts` — `activity_log` table + `activity_event_type` enum added manually (needs regen after migration)

### What to do next

Plan next steps

### Risks

- Jupiter API may rate-limit or be slow — cached with 60s TTL, shows "—" on failure
- Realtime requires `activity_log` added to `supabase_realtime` publication (handled in migration)
- Delete triggers: `actor_id` uses the row's owner (assignee/creator/commenter) since the actual deleter isn't available in a trigger context

## Proposals System (added 2026-02-05)

### What was built

Full proposals feature domain with structured sections, multi-step wizard, and admin workflow.

**Feature domain** (`src/features/proposals/`):

- Types: `Proposal`, `ProposalListItem`, `ProposalWithRelations`, `ProposalComment`
- Schemas: Zod validation for creation (per-step wizard), comments, status updates
- Hooks: React Query hooks for CRUD, comments, status changes, with query key factory pattern
- Barrel export via `index.ts`

**UI components** (`src/components/proposals/`):

- `ProposalWizard` — 4-step wizard with per-step validation, edit mode via `?edit=ID`
- `ProposalSections` — structured sections in single container, legacy body fallback
- `ProposalCard` — list item with badges
- `CategoryBadge`, `StatusBadge` — reusable badge components

**API routes** (`src/app/api/proposals/`):

- CRUD: `route.ts` (list+create), `[id]/route.ts` (get+update+delete)
- Comments: `[id]/comments/route.ts`
- Status: `[id]/status/route.ts` (admin transitions)

**Database**: Migration `20260205000000_proposals_structured_sections.sql` adds `proposal_category` enum, structured columns (category, summary, motivation, solution, budget, timeline), composite indexes, and missing DELETE RLS policies.

**i18n**: `ProposalWizard` and `ProposalDetail` namespaces across all 3 languages.

### Key patterns

- 5 categories: feature, governance, treasury, community, development
- Permission gate: `profile.organic_id IS NOT NULL` (any verified member can create)
- Legacy compat: `body` column always populated from concatenated sections
- Edit flow: `/proposals/new?edit=ID` reuses ProposalWizard with fetched `initialData`
- Voting integration: existing `@/features/voting` hooks and `@/components/voting` components are wired in the detail page

### What to do next

- Wire up voting mechanism (off-chain) — the UI hooks and admin controls exist but need the full voting flow
- Anti-abuse rules (one live proposal per proposer, cooldown)
- Proposal templates

## Analytics Dashboard (added 2026-02-06)

### What was built

Public analytics page at `/[locale]/analytics` with KPI cards, time-series charts (Recharts), and governance metrics.

**Token config** (`src/config/token.ts`):

- SaaS-ready config with env var fallbacks (`NEXT_PUBLIC_TOKEN_SYMBOL`, `NEXT_PUBLIC_ORG_TOKEN_MINT`, etc.)
- `calculateMarketCap(price)` helper

**Feature domain** (`src/features/analytics/`):

- Types, Zod schemas, `useAnalytics()` React Query hook (60s stale/refetch), barrel export

**API route** (`src/app/api/analytics/route.ts`):

- Single GET endpoint with 60s in-memory cache, parallel fetching of KPIs + 5 RPC aggregations

**Database**: Migration `20260206000000_analytics_functions.sql` — 5 Postgres RPC functions for aggregations (activity trends, member growth, task completions, proposals by category, voting participation). Applied to Supabase.

**UI components** (`src/components/analytics/`):

- `chart-card.tsx`, `kpi-cards.tsx`, `activity-trend-chart.tsx`, `member-growth-chart.tsx`, `task-completion-chart.tsx`, `proposal-category-chart.tsx`, `voting-participation-list.tsx`

**Navigation**: Analytics link added to sidebar + mobile sidebar (public, position 2 after Home, BarChart3 icon).

**i18n**: `Analytics` namespace across all 3 languages.

## Treasury Dashboard (added 2026-02-06)

### What was built

Public treasury page at `/[locale]/treasury` with live on-chain balances, allocation chart, transaction history, and explainer hero.

**Token config** (`src/config/token.ts`):

- `treasuryWallet` hardcoded (`CuBV7VVq3zSrh1wf5SZCp36JqpFRCGJHvV7he6K8SDJ1`), swappable later
- `TREASURY_ALLOCATIONS` array with 4 categories (development 40%, community 25%, operations 20%, reserve 15%)

**Feature domain** (`src/features/treasury/`):

- Types, Zod schemas, `useTreasury()` React Query hook (60s stale/refetch), barrel export

**API route** (`src/app/api/treasury/route.ts`):

- Single GET endpoint with 60s in-memory cache
- Parallel fetches: SOL balance, $ORG balance, SOL price (Jupiter), $ORG price (Jupiter), recent transactions (Solana RPC)
- Transaction parsing: SOL transfers, token transfers, direction detection

**UI components** (`src/components/treasury/`):

- `treasury-hero.tsx` — Dark hero with principles (security, governance, transparency), wallet address with copy + Solscan link
- `balance-cards.tsx` — 3 cards: total USD, SOL balance, $ORG balance
- `allocation-chart.tsx` — Recharts donut chart with legend, reuses `ChartCard`
- `transaction-table.tsx` — Recent transactions with type icons, amounts, Solscan links

**Navigation**: Treasury link added to sidebar + mobile sidebar (public, Wallet icon, position 3 after Analytics).

**i18n**: `Treasury` namespace across all 3 languages + `treasury` navigation key.

### What to do next

- Multi-sig wallet integration (Squads or similar)
- Spending proposals tied to proposal system
- Spending analytics
- Replace hardcoded wallet address with env var when multi-sig is ready

## Member Management & Admin Settings (added 2026-02-07)

### What was built

Member directory with privacy controls, centralized admin settings with 6 configuration tabs, and DB-driven org config for SaaS readiness.

**Database**: Migration `20260207000000_org_config_and_member_privacy.sql`:

- Extended `orgs` table with token config (symbol, mint, decimals, total_supply), treasury config (wallet, allocations JSONB), sprint defaults (capacity, duration), organic_id_threshold
- Added `profile_visible BOOLEAN DEFAULT true` to `user_profiles`
- Seeded initial "Organic" org row with current hardcoded values
- Linked `voting_config` to org, added member directory indexes, admin RLS for profile updates

**Feature domains**:

- `src/features/members/` — types, schemas, hooks (`useMembers`, `useMember`, `useUpdatePrivacy`, `useUpdateMemberRole`), barrel export
- `src/features/settings/` — types, schemas (per-tab Zod validation with 100% allocation refinement), hooks (`useOrganization`, `useUpdateOrganization`), barrel export

**API routes**:

- `src/app/api/members/route.ts` — list with search/filter/pagination
- `src/app/api/members/[id]/route.ts` — single member detail, respects privacy
- `src/app/api/members/privacy/route.ts` — toggle own visibility
- `src/app/api/settings/route.ts` — GET org+voting config, PATCH admin-only
- `src/app/api/settings/members/[id]/role/route.ts` — role assignment, admin-only, prevents self-change

**UI components**:

- `src/components/members/` — `member-card.tsx`, `member-filters.tsx`, `member-grid.tsx`
- `src/components/settings/` — `settings-tabs.tsx`, `settings-field.tsx`, `general-tab.tsx`, `token-tab.tsx`, `treasury-tab.tsx`, `governance-tab.tsx`, `sprints-tab.tsx`, `members-tab.tsx`

**Pages**:

- `src/app/[locale]/members/page.tsx` — searchable/filterable member grid with pagination
- `src/app/[locale]/members/[id]/page.tsx` — member profile with privacy-aware rendering
- `src/app/[locale]/admin/settings/page.tsx` — admin settings with 6 tabs (General, Token, Treasury, Governance, Sprints, Members)

**Token config refactor**:

- `src/config/token.ts` — static config + `OrgConfig` interface + `calculateMarketCap()` (client-safe)
- `src/config/token.server.ts` — `getOrgConfig()` with 60s cache, reads from DB, falls back to static config (server-only)

**Navigation**: Members in main nav (Users icon, gated on auth), Settings in bottom nav (Settings icon, gated on admin/council).

**i18n**: `Members` and `Settings` namespaces across all 3 languages.

### Key patterns

- Privacy model: `profile_visible` boolean — private members appear in directory but profiles are not clickable
- Access control: Admin has full access, Council has read-only view with notice badge
- Settings tabs: General, Token, Treasury (dynamic allocation rows), Governance, Sprints, Members (role management)
- DB-driven config: `orgs` table stores all configurable values, `getOrgConfig()` reads with cache + static fallback
- Role management: Admin can assign roles (admin/council/member/guest), cannot change own role

### What to do next

- Multi-sig wallet integration for treasury settings
- Profile edit page for users to update their own bio/social links
- Spending proposals linked to treasury tab
- Anti-abuse: rate limiting on privacy toggles

## Notifications System (added 2026-02-08)

### What was built

In-app notification system with follow/subscribe model, auto-follow triggers, real-time push, per-category preference toggles, and full notifications page.

**Database**: Migration `20260208000000_notifications_system.sql`:

- `user_follows` table — tracks who follows what (task/proposal), unique constraint on (user_id, subject_type, subject_id)
- `notifications` table — per-user notification records with event_type, category, actor, metadata, read/unread state
- `notification_preferences` table — per-user, per-category channel toggles (in_app, email)
- `notification_category` enum: tasks, proposals, voting, comments, system
- Fan-out trigger on `activity_log` INSERT → creates notifications for all followers (respects preferences, skips actor)
- 5 auto-follow triggers: task creator, task assignee, proposal creator, voter, commenter
- RLS: users can only read/update their own notifications, follows, and preferences
- `notifications` added to `supabase_realtime` publication for live push

**Feature domain** (`src/features/notifications/`):

- Types: `Notification`, `NotificationPreference`, `UserFollow`, `NotificationCategory`, `EVENT_ICONS`
- Schemas: Zod validation for filters, preference updates, follow/unfollow
- Hooks: `useNotifications()` (with Realtime subscription), `useUnreadCount()`, `useMarkRead()`, `useMarkAllRead()`, `useNotificationPreferences()`, `useUpdatePreference()`, `useIsFollowing()`, `useFollow()`, `useUnfollow()`
- Query key factory pattern, barrel export via `index.ts`

**API routes** (`src/app/api/notifications/`):

- `route.ts` — GET (list with cursor/category/unread filters, enriched actor info) + PATCH (mark all read)
- `[id]/read/route.ts` — PATCH (mark single as read)
- `preferences/route.ts` — GET (with auto-seed defaults) + PATCH (upsert per-category)
- `follow/route.ts` — GET (check if following) + POST (follow) + DELETE (unfollow)

**UI components** (`src/components/notifications/`):

- `notification-bell.tsx` — Bell icon in TopBar with unread count badge, dropdown panel with notification list, mark all read, view all link
- `notification-item.tsx` — Single notification row with unread dot, actor avatar, action text, relative time, click to navigate
- `notification-preferences.tsx` — Grid of toggle switches: rows = categories, columns = channels (in-app, email)
- `follow-button.tsx` — Toggle button for task/proposal detail pages, shows Following/Follow state

**Pages**: `src/app/[locale]/notifications/page.tsx` — full notifications list with category filter tabs, inline preferences panel, mark read

**Navigation**: Bell icon in TopBar (all authenticated users), Notifications in sidebar + mobile sidebar (Bell icon, gated on auth)

**i18n**: `Notifications` namespace across all 3 languages (en, pt-PT, zh-CN) — events, preferences, tabs, empty states

### Key patterns

- Follow model: auto-follow on create/assign/vote/comment, manual follow/unfollow button
- Fan-out: Postgres trigger on `activity_log` INSERT → notifications for followers (server-side, no client involvement)
- Real-time: Supabase Realtime subscription on `notifications` table updates bell count + list instantly
- Preferences: 5 categories x 2 channels (in_app, email), seeded on first access, COALESCE defaults to true
- Category mapping: `get_notification_category()` PG function maps 15 event types → 5 categories
- Subject resolution: `resolve_follow_target()` maps activity subjects (comment, submission, vote) → parent entity (task, proposal)
- Smart batching: `comment_created` and `submission_created` aggregated into summary notifications within 15-min windows
- Voting reminders: Edge Function `send-voting-reminders` inserts deduplicated reminder notifications (24h + 1h before close)

### Key files (batching + reminders)

- `supabase/migrations/20260208050000_notifications_batching_and_reminders.sql` — batch tables, dedupe index, updated trigger + category function
- `supabase/functions/send-voting-reminders/index.ts` — Deno Edge Function for reminder delivery
- `tsconfig.json` — `supabase/functions` excluded from Next.js compilation

### What to do next

- Deploy Edge Function and schedule via cron (`crontab: */15 * * * *` or Supabase scheduled trigger)
- Apply migration `20260208050000_notifications_batching_and_reminders.sql` to Supabase
- Email digests via Resend (Phase 11.7)
- Integrate `FollowButton` into task detail and proposal detail pages
- Notification cleanup cron (delete > 90 days old)

## Workspace Health Summary (Last audit: 2026-02-08)

### What's Solid

- Lint passes with zero errors/warnings
- React Query properly centralized in `src/features/{tasks,proposals,analytics,treasury,members,settings,notifications}/hooks.ts`
- Zod schemas separated in `src/features/{tasks,proposals,analytics,treasury,members,settings,notifications}/schemas.ts`
- Barrel exports enable clean imports (`@/features/tasks`, `@/features/proposals`, `@/features/analytics`, `@/features/treasury`, `@/features/members`, `@/features/settings`, `@/features/notifications`)
- Proposals feature domain fully built: types, schemas, hooks, UI components, API routes
- Members + Settings feature domains fully built with admin/council access control
- Migration files well-organized and timestamped
- Notifications system fully built: follow model, auto-follow triggers, real-time push, preference toggles
- i18n implementation complete (en, pt-PT, zh-CN) — includes ProposalWizard, ProposalDetail, Members, Settings, and Notifications namespaces
- Wallet security: nonce validation with 5-minute TTL
- RPC caching prevents 429 rate limit errors

### Known Issues

**Empty scaffolding directories** (intentional placeholders for future work):

- `src/features/{organic-id,profile,sprints}/`
- `src/components/{auth,sprints}/`

**Pending migration**: `supabase/migrations/20260201000000_create_activity_log.sql` needs to be applied to Supabase before the activity dashboard works. See "Activity Dashboard & Live Feed" section above.

**Types**: Prefer importing shared task/sprint types from `@/features/tasks/types.ts`; avoid reintroducing page-local duplicates.

**Large page components** (maintainability concern):

- `src/app/[locale]/tasks/[id]/page.tsx` - 1500+ lines
- `src/app/[locale]/tasks/page.tsx` - 1000+ lines
- `src/app/[locale]/sprints/page.tsx` - 1000+ lines

**Console logging**: API routes contain debug console.log statements. Consider removing for production.

**Unsafe type casting**: Some API routes use `as any` to bypass TypeScript. Should be addressed with proper Supabase typing.

### What Agents Must NOT Do

- Do not remove empty feature/component directories - they are planned scaffolding
- Do not refactor large page components without explicit approval
- Do not move business logic from API routes without a migration plan
- Do not consolidate type definitions without testing all consumers
- Do not remove console.log statements without confirming logging strategy

### Current navigation note

- App shell navigation is in `src/components/layout/`. Avoid adding new features to `src/components/navigation.tsx` (legacy/unreferenced).

### Areas Needing Human Confirmation

- Voting system implementation (Phase 7 in BUILD_PLAN)
- API route refactoring to service layer pattern
- Type consolidation across page components
- Replace public Solana RPC with paid provider (infrastructure)
