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
- Notifications: `src/features/notifications/`

UI

- Shared UI (shadcn): `src/components/ui/`
- Feature UI: `src/components/{analytics,auth,dashboard,notifications,proposals,sprints,tasks,voting,wallet}/`
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

## Workspace Health Summary (Last audit: 2026-02-06)

### What's Solid

- Lint passes with zero errors/warnings
- React Query properly centralized in `src/features/tasks/hooks.ts`, `src/features/proposals/hooks.ts`, and `src/features/analytics/hooks.ts`
- Zod schemas separated in `src/features/tasks/schemas.ts`, `src/features/proposals/schemas.ts`, and `src/features/analytics/schemas.ts`
- Barrel exports enable clean imports (`@/features/tasks`, `@/features/proposals`, `@/features/analytics`)
- Proposals feature domain fully built: types, schemas, hooks, UI components, API routes
- Migration files well-organized and timestamped
- i18n implementation complete (en, pt-PT, zh-CN) — now includes ProposalWizard and ProposalDetail namespaces
- Wallet security: nonce validation with 5-minute TTL
- RPC caching prevents 429 rate limit errors

### Known Issues

**Empty scaffolding directories** (intentional placeholders for future work):

- `src/features/{notifications,organic-id,profile,sprints}/`
- `src/components/{auth,notifications,sprints}/`

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
