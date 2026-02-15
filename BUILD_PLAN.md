# Organic DAO Platform - Build Plan

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

## 🚧 In Progress / Next Steps

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

- [ ] `disputes` table with status lifecycle (open → mediation → awaiting_response → under_review → resolved/dismissed/withdrawn/mediated)
- [ ] `dispute_comments` table for semi-public discussion threads (parties + arbitrator visibility)
- [ ] Dispute reason categories: rejected_unfairly, low_quality_score, plagiarism_claim, reviewer_bias, other
- [ ] XP stake on filing (default 50 XP, configurable via `orgs.gamification_config`)
- [ ] Minimum XP threshold to file (default 100 XP, prevents spam from new members)
- [ ] One active dispute per submission constraint
- [ ] 7-day cooldown between disputes per user
- [ ] Evidence required: text explanation + optional file/link attachments (append-only, immutable after submission)

#### 16.2 Three-tier escalation

- [ ] **Tier 1 — Mediation** (optional, 24h window): both parties can negotiate a resolution privately
- [ ] **Tier 2 — Council arbitration**: council+ member (not the original reviewer) reviews evidence and decides
- [ ] **Tier 3 — Admin appeal**: disputant can appeal council ruling within 48h; admin makes final ruling
- [ ] Sprint-bound deadlines: unresolved disputes auto-escalate at sprint close; admin-tier disputes get 48h extension
- [ ] Arbitrator self-assignment from queue (conflict-of-interest guard: cannot be original reviewer)
- [ ] Arbitrator recusal with dispute reassignment

#### 16.3 Structured counter-arguments

- [ ] Reviewer receives 48h window to submit counter-argument after dispute is filed
- [ ] Counter-argument form: text response + optional evidence links
- [ ] Response deadline tracked; arbitration proceeds regardless after deadline passes

#### 16.4 Resolution outcomes

- [ ] **Overturn**: submission approved, points awarded, disputant XP stake refunded, reviewer XP penalty
- [ ] **Compromise**: arbitrator sets new quality score, partial points recalculated, disputant XP stake refunded
- [ ] **Uphold**: original decision stands, disputant loses XP stake
- [ ] **Dismiss**: frivolous dispute, disputant loses XP stake + extended cooldown
- [ ] **Withdrawn**: disputant can withdraw before resolution (small XP fee deducted, rest refunded)
- [ ] **Mediated**: both parties agree on resolution, full XP stake refunded

#### 16.5 Arbitrator rewards & reviewer accountability

- [ ] Arbitrator earns flat XP per resolution (default 25 XP, configurable)
- [ ] Reviewer XP penalty on overturned decisions (default 30 XP, configurable)
- [ ] Reviewer accuracy tracking (% of reviews overturned via disputes)
- [ ] Achievements: "First Arbiter" (1 resolved), "Justice Keeper" (10 resolved), "Peacemaker" (5 mediated), "Vindicated" (1 won as disputant)

#### 16.6 UI & pages

- [ ] Dedicated `/disputes` queue page (council/admin see all, members see their own)
- [ ] Dispute detail page `/disputes/[id]` with evidence, response, timeline, resolution panel
- [ ] Inline "Dispute" button on rejected task submissions (disabled if cooldown/insufficient XP)
- [ ] Create Dispute modal (reason picker, evidence text, file upload, XP stake display)
- [ ] Dispute timeline visualization (filed → mediation → response → review → resolved)
- [ ] Status + tier badge components
- [ ] Arbitrator stats dashboard (resolved count, overturn rate)
- [ ] Sidebar navigation link with pending-dispute badge counter (council/admin)

#### 16.7 Notifications & activity integration

- [ ] Activity event types: dispute_created, dispute_response_submitted, dispute_escalated, dispute_resolved, dispute_withdrawn
- [ ] New `disputes` notification category with user preference toggle
- [ ] Auto-follow for disputant, reviewer, and arbitrator
- [ ] Notifications: reviewer notified on filing, disputant on response, arbitrator on escalation, both on resolution

#### 16.8 i18n

- [ ] Disputes namespace across en, pt-PT, zh-CN (~80 keys)
- [ ] Covers: statuses, tiers, resolutions, reasons, form labels, validation errors, notification copy, achievements

#### 16.9 Configurable parameters (via orgs.gamification_config)

- [ ] `xp_dispute_stake`: 50 (XP cost to file)
- [ ] `xp_dispute_arbitrator_reward`: 25 (XP per resolution)
- [ ] `xp_dispute_reviewer_penalty`: 30 (XP lost if overturned)
- [ ] `xp_dispute_withdrawal_fee`: 10 (small fee on withdrawal)
- [ ] `dispute_mediation_hours`: 24
- [ ] `dispute_response_hours`: 48
- [ ] `dispute_appeal_hours`: 48
- [ ] `dispute_cooldown_days`: 7
- [ ] `dispute_min_xp_to_file`: 100

### Phase 17: Integrations (Future)

- [ ] Discord bot (notifications, role sync)
- [ ] Twitter/X engagement verification
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

Last Updated: 2026-02-15
Version: 1.9.0

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
