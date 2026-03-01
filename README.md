# Organic App

DAO governance and task management platform for Organic DAO

## Overview

A full-stack application for managing DAO proposals, voting, task management, and member coordination with Solana wallet integration.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Solana
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query
- **Validation**: Zod
- **Analytics**: Plausible

## Project Structure

Core architecture map:

- `src/app/[locale]/` localized Next.js App Router pages/layouts
- `src/app/api/` API route handlers
- `src/features/` domain logic, hooks, schemas, and types
- `src/components/` UI components (`src/components/ui/` for shadcn primitives)
- `src/lib/`, `src/hooks/`, `src/config/`, `src/types/`, `src/i18n/` shared layers
- `messages/` locale dictionaries (`en`, `pt-PT`, `zh-CN`)
- `supabase/migrations/` SQL migrations

## Platform Status (2026-03-01)

Implemented and active:

- Auth/session flows with wallet linking + Organic ID checks
- Tasks lifecycle (CRUD, dependencies, subtasks, templates, recurring, review queue)
- Proposals lifecycle (draft -> voting -> passed/rejected, templates, threshold/cooldown guardrails)
- Voting integrity controls and audited freeze/recovery behavior
- Sprint phase engine with settlement integrity controls
- Rewards claims/distributions with hold/kill-switch safety posture
- Disputes workflow with SLA + evidence surfaces
- Notifications (in-app feed, realtime, preferences)
- Members/profile/admin settings surfaces
- Analytics and treasury dashboards
- Quests + referrals + burn-to-level experience (`/quests`)
- Onboarding foundation (4-step wizard + progress APIs; cohorts still pending)
- Ideas incubator baseline (`/ideas`, `/ideas/[id]`, vote/comment/KPI APIs, promote/winner endpoints, source-idea proposal linkage) behind feature flag
- Internationalization (`en`, `pt-PT`, `zh-CN`) and Wave 2 UI/UX revamp

Open and in progress:

- Launch gate closure: blocking manual QA matrix completion + staging schema-cache alignment for proposal execution-window writes
- Cohort onboarding layer (assignment, cohort leaderboard/widgets)
- Ideas incubator hardening (admin moderation UX controls + integrity/manual QA pass)
- Treasury spending analytics + multi-sig integration
- Email digest/announcement delivery layer (Resend + system announcements)
- Integrations backlog (Discord, GitHub contribution tracking, on-chain activity verification)

For detailed roadmap and per-phase status, see [BUILD_PLAN.md](./BUILD_PLAN.md).  
For manual QA coverage, see [docs/qa-runbook.md](./docs/qa-runbook.md).

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Solana wallet

### Installation

1. Clone the repository

```bash
git clone https://github.com/FCisco95/organic-app.git
cd organic-app
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

If you plan to use Twitter/X engagement verification, also configure:

- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `TWITTER_REDIRECT_URI` (primary)
- `TWITTER_CALLBACK_URL` (optional compatibility alias)
- `TWITTER_TOKEN_ENCRYPTION_KEY`
- `TWITTER_OAUTH_SCOPE` (quote it if sourcing via shell, e.g. `TWITTER_OAUTH_SCOPE="users.read tweet.read like.read offline.access"`)

For local tunnels (ngrok, Cloudflare Tunnel, etc.), use your public HTTPS domain:

- Set `NEXT_PUBLIC_APP_URL` to your public app URL
- Set `TWITTER_REDIRECT_URI` (or `TWITTER_CALLBACK_URL`) to `{PUBLIC_URL}/api/twitter/link/callback`
- Register the exact same callback URL in your X Developer app settings

4. Run the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Release Gate (Core Features)

Blocking checks before release:

- `npm run lint`
- `npm run build`
- `npx playwright test tests/proposals-lifecycle.spec.ts tests/voting-integrity.spec.ts tests/proposal-task-flow.spec.ts tests/sprint-phase-engine.spec.ts tests/dispute-sla.spec.ts tests/rewards-settlement-integrity.spec.ts tests/admin-config-audit.spec.ts --workers=1`
- Manual QA matrix completion across EN/PT-PT/ZH-CN desktop+mobile (see `docs/qa-runbook.md`)
- Staging schema-cache alignment for proposal execution-window writes (`execution_deadline` path)

Required environment variables for integrity E2E:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAYWRIGHT_BASE_URL`

The full Playwright suite (`npm run test:e2e`) remains non-blocking evidence until reliability is consistently proven in CI.

### Supabase Environment Strategy (Main vs CI)

Use two Supabase projects with clear ownership:

- **Main DB (`dcqfuqjqmqrzycyvutkn`)**: production/staging app data, source of truth.
- **CI DB (`rrsftfoxcujsacipujrr`)**: GitHub Actions E2E/testing/safe automation surface.

Pipeline behavior:

1. PRs run CI against the **CI DB** (`CI_*` Supabase secrets).
2. Merges to `main` trigger workflow **`Supabase Migration Sync`**.
3. That workflow applies and records all local migrations on both **Main DB** and **CI DB**, then reloads PostgREST schema cache.
4. App runtime environments (Vercel preview/prod) should continue pointing to **Main DB**.

Required GitHub Actions secrets for reliable DB sync:

- `SUPABASE_ACCESS_TOKEN` (Management API token with access to both projects)
- `SUPABASE_MAIN_PROJECT_REF` (recommended: `dcqfuqjqmqrzycyvutkn`)
- `SUPABASE_CI_PROJECT_REF` (recommended: `rrsftfoxcujsacipujrr`)
- `CI_NEXT_PUBLIC_SUPABASE_URL`
- `CI_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CI_SUPABASE_SERVICE_ROLE_KEY`

Local verification command:

```bash
node scripts/qa/sync-supabase-migrations.mjs --project-ref dcqfuqjqmqrzycyvutkn
```

Local apply+sync command:

```bash
node scripts/qa/sync-supabase-migrations.mjs \
  --project-ref dcqfuqjqmqrzycyvutkn \
  --apply \
  --allow-equivalent-errors \
  --record-applied \
  --reload-postgrest
```

## Deployment Checklist (Vercel)

Set these variables in Vercel for both Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_NETWORK`
- `NEXT_PUBLIC_ORG_TOKEN_MINT`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_DOMAIN`
- `ADMIN_EMAIL`

Set these for Sentry monitoring:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `SENTRY_PROFILES_SAMPLE_RATE`
- `SENTRY_ORG` (for source map upload)
- `SENTRY_PROJECT` (for source map upload)
- `SENTRY_AUTH_TOKEN` (for source map upload)

Set these to enable distributed Upstash rate limiting:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Set this to secure scheduled internal refresh routes:

- `CRON_SECRET`

Set these only if you use Twitter/X verification:

- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `TWITTER_REDIRECT_URI`
- `TWITTER_CALLBACK_URL` (optional compatibility alias)
- `TWITTER_OAUTH_SCOPE`
- `TWITTER_TOKEN_AUTH_METHOD`
- `TWITTER_TOKEN_ENCRYPTION_KEY`

Optional:

- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- `NEXT_TELEMETRY_DISABLED`
- `DISABLE_RATE_LIMIT` (use `true` only for local debugging)
- `ENABLE_RATE_LIMIT_NON_VERCEL` (set `true` if you run production outside Vercel)

Production launch checks:

- Confirm Supabase migrations are applied in production.
- For migrations that add enum values, run enum additions in a committed migration step before any SQL that references new enum literals.
- If a migration uses deferred constraints plus large backfills, flush deferred checks (`SET CONSTRAINTS ALL IMMEDIATE;`) before `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Confirm Vercel CI passes (`lint` and `build`) for the release commit.
- Confirm `GET /api/health` returns `200`.
- Confirm GitHub Actions workflow `Market Cache Refresh` is active and successful.
- Confirm Supabase auth redirect URLs and site URL match the production domain.

### Operations Runbook (Market Cache Refresh)

This app uses GitHub Actions (not Vercel Cron) to warm market cache snapshots.

Required secrets:

- Vercel env: `CRON_SECRET`
- GitHub Actions secrets:
  - `BASE_URL` (for example `https://organic-app-rust.vercel.app`)
  - `CRON_SECRET` (must match Vercel value)

Manual validation commands:

```bash
export BASE_URL="https://organic-app-rust.vercel.app"
export CRON_SECRET="your_cron_secret"

# Refresh endpoint (authorized)
curl -i -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE_URL/api/internal/market-cache/refresh"

# Core API health checks
curl -i "$BASE_URL/api/stats"
curl -i "$BASE_URL/api/analytics"
curl -i "$BASE_URL/api/treasury"
```

Expected results:

- Refresh endpoint returns `200`.
- Core endpoints return `200`.
- Core endpoints include `X-Data-Source` and `X-Data-Age-Seconds` response headers.

Trigger/inspect scheduler workflow:

```bash
# Trigger now
gh workflow run market-cache-refresh.yml --ref main

# Check latest run
gh run list --workflow market-cache-refresh.yml --limit 1
```

### Key Features

#### 🔐 Authentication & Profiles

- Email/password authentication via Supabase
- Solana wallet integration and linking
- Role-based access control (admin, council, member, viewer)
- Customizable user profiles with avatars
- Social media integration
- Onboarding progress state (`connect_wallet`, `verify_token`, `pick_task`, `join_sprint`)

#### 🎫 Organic ID System

- Automatic ID assignment to ORG token holders
- Sequential numbering with blockchain verification
- Real-time balance checking via Solana RPC
- Admin controls for ID management

#### 📋 Task Management

- Tasks list with tabs and filters
- Kanban board for the active sprint (drag-and-drop)
- Comprehensive task detail pages
- Real-time commenting system
- User assignment and delegation
- Sprint organization
- Priority, points, and label tracking
- Dependencies, subtasks, templates, and recurring-task support

#### 📝 Proposals & Governance

- Full proposal lifecycle management
- Token-weighted voting system
- Discussion threads and comments
- Status workflow from draft to passed/rejected + execution window handoff
- Edit and delete controls for authors/admins
- Transparent voting results
- Threshold/cooldown anti-abuse controls
- Integrity freeze and audited manual resume controls

#### 🏃 Sprint Planning

- Sprint creation and management
- Task-sprint associations
- Progress tracking and visualization
- Active sprint monitoring
- Settlement integrity posture and audit traces

#### 🎯 Gamification and Referrals

- Quest progression and referral program (`/quests`)
- Referral code generation, validation, and completion
- Burn-to-level flow with configurable gamification controls

#### 💡 Ideas Incubator (App Layer)

- Ideas feed and detail pages with vote rails and threaded discussion
- Organic ID-gated create/vote/comment behavior with anti-self-vote rules
- KPI endpoint + weekly spotlight surface for funnel visibility
- Feature-flagged rollout (`NEXT_PUBLIC_IDEAS_INCUBATOR_ENABLED` / `IDEAS_INCUBATOR_ENABLED`)

## Database Schema

Implemented in Supabase with Row Level Security:

- `user_profiles` - account metadata, role, XP, onboarding completion marker
- `tasks`, `task_assignees`, `task_submissions`, `task_dependencies`, `subtasks`, `task_templates`
- `proposals`, `proposal_comments`, `proposal_votes`, `proposal_templates`, `proposal_stage_events` (+ `source_idea_id` linkage)
- `sprints`, `sprint_task_snapshots`, settlement events, and reward distribution records
- `disputes` + dispute comments/evidence and escalation metadata
- `quests`, `referral_codes`, `referrals`, `referral_rewards`, `point_burns`
- `notifications` + preference/follow models
- `onboarding_steps`
- `ideas`, `idea_votes`, `idea_events`, `idea_promotion_cycles`

See `supabase/migrations/` for full schema definitions.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request to `main`

## License

Private project - All rights reserved
