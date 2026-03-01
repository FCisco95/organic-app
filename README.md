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

```
organic-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── [locale]/          # Localized routes
│   │   │   ├── auth/          # Auth pages
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Signup page
│   │   │   ├── profile/       # User profile page
│   │   │   ├── proposals/     # Proposals listing & detail
│   │   │   ├── tasks/         # Task management UI
│   │   │   ├── sprints/       # Sprint planning
│   │   │   ├── leaderboard/   # Leaderboard page
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Home page
│   │   │   └── globals.css    # Global styles
│   │   └── api/               # API routes
│   │       ├── auth/          # Authentication endpoints
│   │       ├── leaderboard/   # Leaderboard endpoints
│   │       ├── nonce/         # SIWS nonce generation
│   │       ├── organic-id/    # Organic ID issuance
│   │       ├── profile/       # Profile endpoints
│   │       ├── proposals/     # Proposal CRUD
│   │       ├── sprints/       # Sprint endpoints
│   │       ├── tasks/         # Task management
│   │       └── voting/        # Voting endpoints
│   │
│   ├── components/            # Reusable components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── auth/             # Auth components
│   │   ├── notifications/    # Notification components
│   │   ├── proposals/        # Proposal components
│   │   ├── sprints/          # Sprint components
│   │   ├── tasks/            # Task components
│   │   ├── voting/           # Voting components
│   │   ├── wallet/           # Wallet components
│   │   ├── language-selector.tsx
│   │   ├── locale-switcher.tsx
│   │   └── navigation.tsx
│   │
│   ├── features/             # Feature-based modules
│   │   ├── auth/             # Auth context & wallet provider
│   │   ├── tasks/            # Task hooks, types, schemas, utils (fully implemented)
│   │   └── [scaffolding]/    # organic-id, proposals, voting, sprints, notifications, profile (planned)
│   │
│   ├── i18n/                 # i18n helpers
│   ├── lib/                  # Utility functions
│   │   ├── supabase/          # Supabase clients
│   │   ├── solana.ts          # Solana helpers
│   │   └── utils.ts           # Shared utilities
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   └── config/               # Configuration files
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
│
├── public/                   # Static assets
│   └── assets/               # Public images
└── [config files]            # Various configuration files

```

## ✅ Completed Features

### Authentication & User Management

- [x] Supabase email/password authentication
- [x] Solana wallet integration (Phantom, Solflare, etc.)
- [x] Wallet linking with signature verification
- [x] Role-based access control (admin, council, member, viewer)
- [x] User profiles with editable fields
- [x] Profile picture upload to Supabase Storage
- [x] Avatar display with gradient fallback
- [x] Social media links (Twitter, Discord)

### Organic ID System

- [x] Automatic ID assignment to ORG token holders
- [x] Sequential numbering system
- [x] Blockchain verification via Solana RPC
- [x] Balance checking and validation
- [x] Admin-reserved ID #1

### Task Management

- [x] Full CRUD operations for tasks
- [x] Tasks list with tabs (All, Backlog, Active, In Review, Completed)
- [x] Kanban board scoped to active sprint
- [x] Drag-and-drop task status updates (sprint board)
- [x] Task detail pages with comprehensive information
- [x] Task comments system with real-time updates
- [x] User assignment modal (admin/council)
- [x] Task deletion with confirmation (admin only)
- [x] Task properties: priority, points, labels, due dates
- [x] Sprint assignment
- [x] Permission-based task management
- [x] Status workflow: backlog → todo → in_progress → review → done

### Proposals & Voting

- [x] Proposal creation form with validation
- [x] Proposal listing with filters and search
- [x] Proposal detail view with full information
- [x] Token-weighted off-chain voting system
- [x] Vote casting and tallying
- [x] Proposal status workflow: draft → active → passed/rejected
- [x] Discussion/comments on proposals
- [x] Edit functionality for draft proposals (author/admin)
- [x] Delete functionality with confirmation (author/admin)
- [x] Admin controls for proposal lifecycle

### Sprint Management

- [x] Sprint creation and management
- [x] Sprint listing page
- [x] Sprint detail pages with task views
- [x] Active sprint tracking
- [x] Sprint progress visualization

### Infrastructure & UI

- [x] Next.js 14 App Router setup
- [x] Tailwind CSS with custom Organic branding
- [x] Responsive mobile-first design
- [x] Navigation with role-based menu items
- [x] Enhanced SSR session handling
- [x] Middleware for authentication
- [x] API routes with proper error handling
- [x] Solana RPC fallback system
- [x] Environment configuration
- [x] Cookie-based session management

## 🚧 In Progress / Planned Features

### Advanced Task Features

- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Task templates
- [ ] Sprint burndown charts
- [ ] Sprint capacity planning

### Proposal Enhancements

- [ ] Proposal templates
- [ ] Proposal categories/tags
- [ ] Delegation system

### Treasury & Analytics

- [ ] Treasury balance display
- [ ] Transaction history
- [ ] Budget allocation tracking
- [ ] Member contribution metrics
- [ ] DAO activity dashboard

### Communication

- [ ] In-app notification system
- [ ] Email notifications
- [ ] Discord bot integration
- [ ] Announcement system

For detailed build plan and roadmap ideas, see [BUILD_PLAN.md](./BUILD_PLAN.md)

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

#### 📝 Proposals & Governance

- Full proposal lifecycle management
- Token-weighted voting system
- Discussion threads and comments
- Status workflow from draft to execution
- Edit and delete controls for authors/admins
- Transparent voting results

#### 🏃 Sprint Planning

- Sprint creation and management
- Task-sprint associations
- Progress tracking and visualization
- Active sprint monitoring

## Database Schema

Implemented in Supabase with Row Level Security:

- `user_profiles` - User accounts, profiles, and role management
- `proposals` - DAO proposals with lifecycle tracking
- `proposal_comments` - Discussion threads on proposals
- `votes` - Vote records and tallying
- `tasks` - Task management with priorities and status
- `task_comments` - Collaboration on tasks
- `sprints` - Sprint/epoch planning and tracking
- `leaderboard` - Member contribution rankings

See `supabase/migrations/` for full schema definitions.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request to `main`

## License

Private project - All rights reserved
