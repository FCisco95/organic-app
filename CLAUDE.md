# CLAUDE.md

This file defines how Claude Code should work in this repository.

## Project snapshot

Organic App is a DAO-style community app for $ORG built with Next.js 14 App Router, Supabase (Postgres + Auth), and Solana wallet linking.
Core domains: tasks, proposals, voting, sprints, notifications, profiles, Organic ID.

## Agents

Claude agents are defined in: agents/claude.md
Repo wide agent rules live in: AGENTS.md

## Definition of done

A change is done when:

- Feature works locally: `npm run dev`
- Lint passes: `npm run lint`
- Build passes for important changes: `npm run build`
- Formatting is clean: `npm run format`
- No obvious TypeScript issues
- Docs updated if behavior, flows, or assumptions changed

## Hard rules (never break)

Security and secrets

- Never print, log, paste, or expose secrets from .env.local.
- Never commit secrets, tokens, private keys, or Supabase service role keys.
- If env vars are missing, ask Cisco and explain what is required.

Supabase and Solana

- Do not modify Supabase RLS policies unless explicitly requested.
- Do not change token verification or wallet linking logic unless explicitly requested.
- Any wallet related change must keep signature verification strict.

Change discipline

- Prefer small focused diffs.
- Ask before large refactors, renames, moving folders, or changing public APIs.
- Keep domain logic out of UI components when possible.

## Architecture rules

Separation of concerns

- UI components: src/components only
- Domain logic and hooks: src/features
- Cross cutting utilities: src/lib and src/hooks
- Route handlers (src/app/api) orchestrate only, no heavy business logic

Data access

- React Query owns caching and invalidation for client data flows.
- Zod validates all external input (API requests, forms, query params).

## Workflow for every task

Before coding

1. Restate goal in 1 sentence.
2. List assumptions (if any).
3. Propose a plan (3 to 7 bullets) with file paths.

While coding

- Make minimal diffs.
- Prefer adding small helper functions in src/features over stuffing logic in components.
- Add tests when logic is critical or easy to cover.

After coding

- Provide commands to verify.
- Mention any follow ups or risks.

## Plan mode contract (required)

For any non-trivial task, Claude must start in Plan mode.

In Plan mode Claude must:

- Not edit files
- Ask only questions needed to remove ambiguity (max 5)
- Propose a small plan (3–7 bullets) with file paths
- Include verification steps (commands + manual checks)
- Explicitly wait for approval before implementing

Claude must end Plan mode responses with:
"Say 'go' to implement, or tell me what to change in the plan."

## Output format (required)

Always respond with:

1. Plan
2. Changes (what and where)
3. How to verify (commands + manual checks)

## Quick navigation

Start

- App Router root: src/app/
- Localized routes: src/app/[locale]/
- Root layout: src/app/[locale]/layout.tsx
- Middleware: src/middleware.ts
- Global styles: src/app/[locale]/globals.css

Domains

- Auth: src/features/auth/
- Profile: src/features/profile/
- Organic ID: src/features/organic-id/
- Tasks: src/features/tasks/
- Proposals: src/features/proposals/
- Voting: src/features/voting/
- Sprints: src/features/sprints/
- Activity: src/features/activity/
- Notifications: src/features/notifications/

UI

- Shared UI (shadcn): src/components/ui/
- Feature UI: src/components/{auth,dashboard,notifications,proposals,sprints,tasks,voting,wallet}/
- App shell + navigation: src/components/layout/
- Navigation: src/components/navigation.tsx
- Locale switcher: src/components/locale-switcher.tsx
- Language selector: src/components/language-selector.tsx

i18n

- i18n config: src/i18n/
- Translations: messages/ (en.json, pt-PT.json, zh-CN.json)

API and DB

- API routes: src/app/api/
- Migrations: supabase/migrations/
- Edge functions: supabase/functions/
- Generated types: src/types/

Shared libs and assets

- Supabase clients: src/lib/supabase/
- Shared utilities: src/lib/utils.ts
- Public assets: public/assets/

## Commands

npm run dev
npm run lint
npm run build
npm run format

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

**Migration (needs to be applied to Supabase):**

- `supabase/migrations/20260201000000_create_activity_log.sql`

### What to do next

1. **Apply the migration** — Run the SQL in `supabase/migrations/20260201000000_create_activity_log.sql` against the Supabase database (via SQL Editor or `supabase db push`). This creates:
   - `activity_event_type` enum (12 events including deletes)
   - `activity_log` table with indexes, RLS (public read), Realtime publication
   - 11 trigger functions on `tasks`, `task_submissions`, `task_comments`, `proposals`, `votes` (INSERT, UPDATE, DELETE as appropriate)
2. **Regenerate types** — After migration is applied, run `npx supabase gen types typescript --project-id <project-id> > src/types/database.ts` then re-add the convenience aliases at the top. The manual type additions will be replaced by generated ones.
3. **Test end-to-end** — Create a task, check activity_log has an entry, verify the homepage feed shows it in real-time.
4. **Verify stats** — Check that the stats bar numbers match actual DB counts and that the $ORG price loads from Jupiter.

### Risks

- Jupiter API may rate-limit or be slow — cached with 60s TTL, shows "—" on failure
- Realtime requires `activity_log` added to `supabase_realtime` publication (handled in migration)
- Delete triggers: `actor_id` uses the row's owner (assignee/creator/commenter) since the actual deleter isn't available in a trigger context

## Workspace Health Summary (Last audit: 2026-01-24)

### What's Solid

- Lint passes with zero errors/warnings
- React Query properly centralized in `src/features/tasks/hooks.ts`
- Zod schemas separated in `src/features/tasks/schemas.ts`
- Barrel exports enable clean imports (`@/features/tasks`)
- Migration files well-organized and timestamped
- i18n implementation complete (en, pt-PT, zh-CN)
- Wallet security: nonce validation with 5-minute TTL
- RPC caching prevents 429 rate limit errors

### Known Issues

**Empty scaffolding directories** (intentional placeholders for future work):

- `src/features/{notifications,organic-id,profile,proposals,sprints,voting}/`
- `src/components/{auth,notifications,proposals,sprints,ui,voting}/`

**Pending migration**: `supabase/migrations/20260201000000_create_activity_log.sql` needs to be applied to Supabase before the activity dashboard works. See "Activity Dashboard & Live Feed" section above.

**Type duplication**: Task/Sprint types defined locally in page components instead of importing from `@/features/tasks/types.ts`. Future work should consolidate.

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

### Areas Needing Human Confirmation

- Voting system implementation (Phase 7 in BUILD_PLAN)
- API route refactoring to service layer pattern
- Type consolidation across page components
- Replace public Solana RPC with paid provider (infrastructure)
