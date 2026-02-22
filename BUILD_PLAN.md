# Organic DAO Platform — Build Plan

For session-by-session implementation notes see `SESSION_LOG.md`.

---

## Current Status

### Gamification Revamp — 🔄 In Progress (2026-02-21)

Quest model, progress API, and grouped quest UI shipped. Source-context navigation wired.

- [x] Quest domain model + evaluator (`daily`, `weekly`, `long_term` objectives)
- [x] Quest progress API (`/api/gamification/quests`)
- [x] Grouped quest UI in progression shell (cadence columns, reset timers, CTA hints)
- [x] Source-context progression links from sidebar, top bar, profile, tasks, proposals
- [x] Members/profile readability + privacy-safe achievement gating
- [ ] Quest CTA deep-links and claim/reward affordances tied to completed objectives

### Wave 2 UI/UX Revamp — ✅ Complete (2026-02-21)

All 8 feature-vertical slices delivered and validated. Wave 2 is closed.

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

Cross-feature consistency pass complete: `--transition-ui`, `--section-radius`, `--section-padding` tokens added to `globals.css`.

### Governance Integrity Program — ✅ Complete (Tasks 1–10)

Full release gate implemented. Final sign-off pending:
- [ ] Environment-capable E2E run (Supabase env vars + Playwright browser)
- [ ] Manual QA runbook (`docs/qa-runbook.md`)
- [ ] Sentry unresolved-error review

---

## Completed Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation (auth, wallet, Organic ID, profiles) | ✅ Done |
| 2 | Task Management (CRUD, kanban, submissions, review) | ✅ Done |
| 3 | Enhanced Profiles | ✅ Done |
| 4 | Navigation & UI Shell | ✅ Done |
| 5 | Infrastructure (middleware, SSR, auth flow) | ✅ Done |
| 5.5 | Internationalization (en, pt-PT, zh-CN) | ✅ Done |
| 6 | Sprint / Epoch Management | ✅ Done |
| 7 | Proposals System (wizard, lifecycle, voting) | ✅ Done |
| 8 | Treasury Dashboard | ✅ Done |
| 9 | Member Management & Admin Settings | ✅ Done |
| 10 | Analytics Dashboard | ✅ Done |
| 11 | Notifications & Communication (in-app, realtime, batching, voting reminders) | ✅ Done |
| 12 | Advanced Tasks (dependencies, subtasks, templates, recurring, delegation) | ✅ Done |
| 13 | Wallet Support (Solflare, Coinbase, Ledger, Torus, Backpack, OKX, etc.) | ✅ Done |
| 14 | Reputation & Gamification (XP, levels, achievements, streaks) | ✅ Done |
| 15 | Rewards & Distribution (claims, epoch pools, manual distributions) | ✅ Done |
| 16 | Dispute Resolution (3-tier, SLA, evidence, arbitration, XP effects) | ✅ Done |
| 19 | Launch Readiness (Zod hardening, E2E gate, Sentry, rate limiting, CI) | ✅ Done |

---

## Open / In Progress

### Gamification Revamp (Active)

- [ ] Quest CTA deep-links and claim/reward affordances tied to completed objectives

### Phase 2.1 — Task Management Hardening

- [ ] Complete remaining task i18n hardcoded string cleanup across all task surfaces
- [ ] Manual QA sweep for task user stories (discovery, self-join, review, mobile)

### Phase 7 — Proposals Remaining Items

- [ ] Proposal threshold gate (fixed or % supply)
- [ ] Anti-abuse: one live proposal per proposer + 7-day cooldown
- [ ] Execution window (3–7 days) + off-chain result handoff
- [ ] Proposal templates

### Phase 8 — Treasury Remaining Items

- [ ] Spending proposals (via existing proposal system)
- [ ] Multi-sig wallet integration (Squads or similar)
- [ ] Spending analytics

### Phase 9 — Members Remaining Items

- [ ] Member onboarding flow
- [ ] Organic ID minting interface

### Phase 10 — Analytics Remaining Items

- [ ] Treasury analytics
- [ ] Proposal success rates
- [ ] Export functionality

### Phase 11 — Notifications Remaining Items

- [ ] Email delivery via Resend (daily digest, respects preferences, React Email templates)
- [ ] System-wide announcements (admin/org level, not follow-based)
- [ ] Discord bot integration (planned later)
- [ ] Telegram bot integration (planned later)

### Phase 16 — Disputes Remaining Items

- [ ] Full manual pass for all Phase 16 user stories on staging/production data

---

## Roadmap

### Phase 17 — Integrations

- [x] Twitter/X engagement verification (OAuth, twitter task type, evidence)
- [ ] Discord bot (notifications, role sync)
- [ ] GitHub contribution tracking
- [ ] On-chain data verification (holdings/activity)

### Phase 18 — Platform Expansion

- [ ] White-label / multi-tenant support
- [ ] Custom branding and domain per tenant
- [ ] Open-core vs premium feature split

---

## Growth Roadmap — Community & Product Differentiation

These phases address the core gaps in crypto community SaaS platforms: contributor retention, collaboration visibility, governance quality, and portable identity.

---

### Phase 20 — Contributor Onboarding + Cohorts

**Goal:** Drop contributor churn by guiding new members from wallet connect to first contribution in under 10 minutes. Group them into cohorts for early social anchoring.

**DB:**
- [ ] `onboarding_steps` table (`id`, `user_id`, `step`, `completed_at`) — track wizard progress per member
- [ ] `cohorts` table (`id`, `name`, `intake_week`, `created_at`) — weekly intake groups
- [ ] `cohort_members` table (`cohort_id`, `user_id`, `joined_at`) — member-to-cohort mapping
- [ ] Seed starter quest pack in `quests` table (complete profile, submit first task, vote on proposal)

**API:**
- [ ] `GET /api/onboarding/steps` — fetch current member's onboarding progress
- [ ] `POST /api/onboarding/steps/:step/complete` — mark a step complete, trigger XP reward
- [ ] `POST /api/cohorts/assign` — auto-assign new member to current week's cohort on first login
- [ ] `GET /api/cohorts/current` — get calling user's active cohort + member list
- [ ] `GET /api/cohorts/:id/leaderboard` — XP leaderboard scoped to cohort members

**UI:**
- [ ] 5-step onboarding wizard modal: connect wallet → verify token → pick skills → pick first task → join sprint
- [ ] Skip and resume support (progress saved to `onboarding_steps`)
- [ ] Starter quest card set on dashboard for members with incomplete onboarding
- [ ] Cohort widget on dashboard: cohort name, member avatars, XP leaderboard, days left in cohort period
- [ ] Cohort badge on profile card (visible during first 30 days)
- [ ] Notification when cohort opens and when it closes with a summary

---

### Phase 21 — Task Threads + Co-crediting

**Goal:** Make collaboration visible inside the platform. Replace the silence between task creation and completion with threaded discussion and shared XP credit.

**DB:**
- [ ] `task_comments` table (`id`, `task_id`, `user_id`, `content`, `parent_id`, `edited_at`, `deleted_at`, `created_at`) — threaded comments, soft delete
- [ ] `task_collaborators` table (`task_id`, `user_id`, `credited_by`, `xp_share_pct`, `created_at`) — co-contributor credits at submission
- [ ] Extend task submission payload to include optional `collaborators` array

**API:**
- [ ] `GET /api/tasks/:id/comments` — fetch comment thread (nested, paginated)
- [ ] `POST /api/tasks/:id/comments` — post comment, resolve @mentions to user IDs and trigger notifications
- [ ] `PATCH /api/tasks/:id/comments/:commentId` — edit own comment (within edit window)
- [ ] `DELETE /api/tasks/:id/comments/:commentId` — soft delete own comment
- [ ] `POST /api/tasks/:id/collaborators` — add co-contributors at submission time
- [ ] Update XP distribution engine to split task reward among credited collaborators per `xp_share_pct`

**UI:**
- [ ] Comment thread panel on task detail page (collapsible sidebar or bottom section)
- [ ] Threaded reply UI with indent + collapse
- [ ] @mention autocomplete (search active members by name/handle)
- [ ] Co-contributor selector on submission form with XP split preview (e.g. "You 60% / Alice 40%")
- [ ] Collaborator avatars shown on task card in kanban and list views
- [ ] Notification to mentioned users and co-contributors

---

### Phase 22 — Advanced Voting

**Goal:** Replace binary yes/no token-weighted voting with mechanisms that give smaller holders a real voice and allow members to delegate governance to people they trust.

**DB:**
- [ ] Extend `votes` table: add `voting_method` enum (`standard`, `quadratic`, `conviction`), `raw_weight`, `conviction_multiplier`
- [ ] `vote_delegations` table (`id`, `delegator_id`, `delegate_id`, `category`, `active`, `created_at`) — per-category delegation
- [ ] `conviction_snapshots` table (`vote_id`, `weight`, `snapshotted_at`) — weight history for conviction votes
- [ ] `proposal_voting_config` column on `proposals` (`method`, `quadratic_cap`, `conviction_period_days`)

**API:**
- [ ] `POST /api/proposals/:id/vote` — handle all three methods; validate quadratic allocation does not exceed token balance
- [ ] `GET /api/proposals/:id/vote-breakdown` — return method-specific result (quadratic effective votes, conviction time-weighted)
- [ ] `POST /api/voting/delegate` — set or update delegation for a category
- [ ] `DELETE /api/voting/delegate/:id` — revoke a delegation
- [ ] `GET /api/voting/delegates` — list caller's active delegations and incoming delegations
- [ ] Scheduled job: increase conviction weight for all active conviction votes every 24 hours

**UI:**
- [ ] Voting method selector on proposal creation form (admin configures per proposal)
- [ ] Quadratic voting UI: token budget slider, shows "votes purchased" vs tokens spent (square root curve)
- [ ] Conviction voting UI: timeline bar showing weight buildup toward threshold, real-time counter
- [ ] Delegation manager page under `/settings/voting` — set delegate per governance category (treasury, tech, hiring, general)
- [ ] "Voting as delegate for N members" indicator on proposal vote form
- [ ] Vote breakdown visualization on closed proposals per method

---

### Phase 23 — Portable Reputation Credential

**Goal:** Let contributors take their reputation with them. A mintable, verifiable on-chain credential that captures their XP, roles, and work history — readable by anyone without logging in.

**DB:**
- [ ] `reputation_credentials` table (`id`, `user_id`, `snapshot_data` jsonb, `mint_address`, `tx_signature`, `status` enum `pending|confirmed|failed`, `minted_at`, `refreshed_at`)
- [ ] Snapshot schema: `xp`, `level`, `rank`, `achievements[]`, `quests_completed`, `tasks_completed`, `roles[]`, `active_since`, `top_skills[]`

**API:**
- [ ] `POST /api/reputation/credential/mint` — build snapshot from current profile, write record, trigger compressed NFT mint via Metaplex Bubblegum
- [ ] `POST /api/reputation/credential/refresh` — rebuild snapshot and update on-chain metadata URI (re-issue)
- [ ] `GET /api/reputation/credential/status` — poll mint status (pending → confirmed)
- [ ] `GET /api/users/:id/credential` — get credential for any user (public, no auth)
- [ ] `GET /api/credential/:id` — resolve credential by ID, no auth required (for public share link)

**UI:**
- [ ] "Mint Reputation Credential" CTA on profile page (only available at level 2+)
- [ ] Credential card component: avatar, XP, level, top 3 achievements, tasks completed, active since
- [ ] Mint progress indicator (wallet approval → tx sent → confirmed)
- [ ] Public credential page at `/credential/:id` — no login required, shareable link
- [ ] "Refresh Credential" option when XP or level has changed since last mint
- [ ] Credential badge on profile visible to other members

---

### Phase 24 — Budget Categories + Treasury Burn Rate

**Goal:** Turn the treasury from a black box into a transparent, accountable ledger. Admins pre-allocate funds by category; every spend is linked to a budget line; the community can verify it publicly.

**DB:**
- [ ] `treasury_budgets` table (`id`, `org_id`, `epoch_id`, `category_slug`, `label`, `allocated_amount`, `currency`, `created_at`)
- [ ] Add `budget_category_id` FK to `treasury_transactions` — nullable for legacy, required for new spends
- [ ] `treasury_epoch_snapshots` table (`epoch_id`, `category_slug`, `spent`, `allocated`, `snapshotted_at`) — burn rate history

**API:**
- [ ] `GET /api/treasury/budgets` — list budget categories + spent vs allocated per current epoch
- [ ] `POST /api/treasury/budgets` — admin creates or updates budget allocation for a category
- [ ] `GET /api/treasury/burn-rate` — spend vs budget breakdown by category for current epoch, with trend vs prior epoch
- [ ] `GET /api/treasury/public` — unauthenticated summary: total treasury, epoch allocation, top categories, recent large transactions
- [ ] Validate `budget_category_id` is required on all new spending proposal submissions

**UI:**
- [ ] Budget allocation panel in treasury admin: set amounts per category per epoch
- [ ] Category breakdown stacked bar chart on treasury dashboard (allocated vs spent)
- [ ] Epoch burn rate widget: % spent per category with color coding (green < 70%, amber 70–90%, red > 90%)
- [ ] Public treasury transparency page at `/treasury/public` — no login required, shareable link for community trust
- [ ] Required budget category selector on spending proposal form
- [ ] Category filter on transaction history list

---

### Phase 25 — Skill Endorsements + Matching

**Goal:** Make contributor skills verifiable through peer endorsement and use that data to surface the right tasks to the right people — and show admins where skill gaps are bottlenecking delivery.

**DB:**
- [ ] `skills` reference table (`slug`, `label`, `category`, `icon`) — canonical skill list
- [ ] `member_skills` table (`user_id`, `skill_slug`, `source` enum `self|endorsed`, `created_at`)
- [ ] `skill_endorsements` table (`id`, `from_user_id`, `to_user_id`, `skill_slug`, `task_id` context FK, `created_at`) — one endorsement per skill per task collaboration
- [ ] Add `required_skills` jsonb array to `tasks` table

**API:**
- [ ] `POST /api/skills/endorse` — endorse a collaborator's skill (gated: must have shared a completed task)
- [ ] `GET /api/users/:id/skills` — skill list with self-declared flag and endorsement count per skill
- [ ] `POST /api/profile/skills` — member declares their own skills
- [ ] `GET /api/tasks/recommended` — tasks matched to calling user's skill set, ranked by overlap score
- [ ] `GET /api/admin/skill-demand` — aggregate open task skill requirements vs available member skills (gap analysis)

**UI:**
- [ ] Skill endorsement prompt on task completion page: "Endorse your collaborators' skills"
- [ ] Skill badges on profile with endorsement count (e.g. "Solidity ×12")
- [ ] Endorsed vs self-declared visual distinction on profile skill chips
- [ ] "Recommended for you" task feed section on tasks page (based on skill match)
- [ ] Skill demand heatmap in admin analytics panel (skills in demand vs supply)
- [ ] Skill picker in onboarding wizard and profile edit (searchable, categorized)

---

### Phase 26 — Sprint Retrospectives

**Goal:** Close the feedback loop at the end of every sprint. Give contributors a structured, async space to reflect, vote on priorities, and commit to improvements before the next epoch starts.

**DB:**
- [ ] `sprint_retros` table (`id`, `sprint_id`, `status` enum `open|voting|closed`, `opened_at`, `voting_opened_at`, `closed_at`)
- [ ] `retro_entries` table (`id`, `retro_id`, `user_id`, `category` enum `went_well|improve|action`, `content`, `anonymous`, `created_at`)
- [ ] `retro_entry_votes` table (`entry_id`, `user_id`, `created_at`) — dot voting, one vote per entry per member
- [ ] `retro_commitments` table (`id`, `retro_id`, `user_id`, `content`, `resolved`, `created_at`) — carries over unresolved to next sprint

**API:**
- [ ] `POST /api/sprints/:id/retro/open` — admin (or auto-trigger on sprint close) opens retro in `open` status
- [ ] `POST /api/sprints/:id/retro/voting` — advance to voting phase (entries locked, voting begins)
- [ ] `POST /api/sprints/:id/retro/close` — close retro, compute top items, auto-create commitments from top action items
- [ ] `GET /api/sprints/:id/retro` — fetch retro with entries grouped by category, vote counts, commitments
- [ ] `POST /api/sprints/:id/retro/entries` — submit an entry (anonymous flag respected)
- [ ] `POST /api/sprints/:id/retro/entries/:entryId/vote` — cast a dot vote
- [ ] `GET /api/sprints/:id/retro/commitments` — list commitments with carry-over flag from prior sprint

**UI:**
- [ ] Retro board with 3 columns: Went Well / Improve / Action Items — sticky note style cards
- [ ] Anonymous entry toggle per submission
- [ ] Voting phase UI: dot allocation (each member gets N dots), live vote count visible after voting closes
- [ ] Commitments section below the board — list of action items with owner and resolved toggle
- [ ] "Carry forward" indicator on unresolved commitments from the previous sprint
- [ ] Summary card on sprint history page: top 2 items per column + commitment count
- [ ] Notification to all sprint members when retro opens and when voting begins

---

### Phase 27 — Multi-DAO / DAO Discovery (SaaS Layer)

**Goal:** Make Organic a platform, not just a product. Let multiple communities run on shared infrastructure, let contributors carry their identity across DAOs, and let new communities onboard in minutes with pre-built templates.

> **Dependency:** Requires Phase 20 (onboarding), Phase 23 (portable credential), Phase 25 (skills) to be stable first. This is the largest scope change in the roadmap — confirm approach before starting.

**DB:**
- [ ] `organizations` table (`id`, `slug`, `name`, `logo_url`, `description`, `token_mint`, `chain`, `tier` enum `free|pro|enterprise`, `created_at`)
- [ ] Add `org_id` FK to all core tables (tasks, proposals, sprints, members, treasury, etc.) — phased migration required
- [ ] `org_members` table (`org_id`, `user_id`, `role`, `joined_at`) — replaces single-community member model
- [ ] `org_templates` table (`slug`, `name`, `description`, `preset_config` jsonb) — pre-configured task categories, quest packs, role structures

**API:**
- [ ] `GET /api/orgs/discover` — public discovery feed, filterable by category, chain, member count
- [ ] `GET /api/orgs/:slug` — public org profile (no auth)
- [ ] `POST /api/orgs` — create new org (super-admin or approved tier gated)
- [ ] `GET /api/orgs/:slug/join` — verify token + apply to join
- [ ] `GET /api/users/:id/orgs` — list all orgs a user belongs to with roles
- [ ] Update middleware to resolve `org_id` from subdomain (`slug.organic.app`) or URL path param on all requests
- [ ] `GET /api/users/:id/cross-org-summary` — aggregate contributions across all orgs for unified profile

**UI:**
- [ ] DAO discovery page at `/discover` — public, no login required, card grid with search and filters (chain, category, size)
- [ ] DAO creation wizard: name → token configuration → template selection → role setup → invite first members
- [ ] DAO template picker: Dev DAO / Media DAO / Investment DAO / Custom (pre-fills quest packs, task categories, role names)
- [ ] Org switcher in navigation header (for members in multiple orgs)
- [ ] Unified profile page: cross-org contribution summary, per-org role badges
- [ ] Admin billing/tier management page (for future monetization)

---

## Mobile App Roadmap

These phases take the platform from a web-only product to a fully shipped mobile app (PWA + native). Follow the phases in order — each builds on the previous.

> **Rule:** Do not start a later phase until the prior phase's core items are validated on a real device.

---

### Phase 28 — Mobile Responsiveness Foundation

**Goal:** Fix every existing surface so it works correctly on a 375px viewport before any native work begins. This is the non-negotiable prerequisite for all mobile phases.

**Audit and fix:**
- [ ] Mobile viewport audit across all core surfaces: tasks, proposals, sprints, treasury, members, profile, notifications, admin
- [ ] Navigation: collapse sidebar to off-canvas drawer on `< md`, hamburger trigger
- [ ] All touch targets minimum 44×44px (buttons, links, icon actions)
- [ ] Tables and data grids: horizontal scroll or card-stack collapse on mobile
- [ ] Modals and dialogs: full-screen on mobile, avoid fixed heights that clip content
- [ ] Forms: correct `inputmode` and `type` attributes for mobile keyboards (number, email, url, search)
- [ ] Safe area insets: apply `env(safe-area-inset-*)` to fixed headers, bottom bars, and sticky footers
- [ ] Wallet connect modal: verify it renders correctly on mobile browsers (Safari iOS, Chrome Android)
- [ ] i18n layout: verify all three locales (en, pt-PT, zh-CN) on narrow viewports
- [ ] Manual QA sweep on iOS Safari and Chrome for Android for every core flow

---

### Phase 29 — Progressive Web App (PWA)

**Goal:** Make the web app installable on iOS and Android home screens with offline resilience and push notification capability.

**Infrastructure:**
- [ ] Add `next-pwa` or custom service worker setup (choose: Workbox via next-pwa recommended)
- [ ] Web app manifest: `name`, `short_name`, `icons` (192×192, 512×512, maskable), `theme_color`, `background_color`, `display: standalone`, `start_url`
- [ ] App icons set: generate full icon set from brand assets (all required sizes for iOS + Android)
- [ ] Splash screens for iOS (`apple-touch-startup-image` meta tags)
- [ ] Service worker: cache app shell and static assets on install
- [ ] Offline fallback page (`/offline`) for uncached navigations
- [ ] Background sync: queue failed API writes (task updates, votes) and retry when online
- [ ] "Add to Home Screen" install prompt: intercept `beforeinstallprompt`, show branded CTA banner
- [ ] Web Push API: VAPID key generation, push subscription endpoint (`POST /api/push/subscribe`), notification dispatch
- [ ] Hook web push into existing notification system (Phase 11 backend already exists — add push channel)
- [ ] Audit and fix any `https`-only APIs blocked on PWA installs

---

### Phase 30 — Mobile UX Patterns

**Goal:** Adapt the interaction layer to feel native on touch devices. The web shell should behave like an app, not a shrunk desktop site.

**Navigation:**
- [ ] Bottom navigation bar on mobile (≤ md): Home, Tasks, Proposals, Notifications, Profile — replaces sidebar on small screens
- [ ] Active state + badge count on bottom nav items
- [ ] Sidebar retained on tablet/desktop; bottom nav only on phone breakpoints

**Interactions:**
- [ ] Pull-to-refresh on list views (tasks, proposals, notifications)
- [ ] Swipe-to-dismiss on notification items and toast alerts
- [ ] Swipe-left/right on task cards (kanban column navigation on mobile)
- [ ] Sheet/bottom-drawer modals for action menus instead of centered overlay dialogs on mobile
- [ ] Skeleton loading states on all list and detail views (improve perceived perf on slow mobile connections)

**Forms and inputs:**
- [ ] Sticky action bar (Submit / Cancel) fixed to bottom of screen on long forms
- [ ] Keyboard-aware scroll: ensure active input is not obscured by virtual keyboard (especially on iOS Safari)
- [ ] Numeric inputs use `inputmode="decimal"` where appropriate

**Feedback:**
- [ ] Haptic feedback on native-feeling actions via `navigator.vibrate` (short pulses on confirm/error)
- [ ] Touch ripple or press feedback on interactive cards

---

### Phase 31 — React Native / Expo App

**Goal:** Build a cross-platform native app that reuses all existing API and business logic. The native app is a client — it does not duplicate server logic.

**Setup:**
- [ ] Expo managed workflow scaffold in `/mobile` directory (or separate repo — confirm with team)
- [ ] Expo Router for file-based navigation (mirrors Next.js App Router mental model)
- [ ] Shared TypeScript types: extract `src/types/` into a shared package or copy-sync to mobile
- [ ] Shared API client: move all `fetch` calls into a platform-agnostic `api/` module usable from both Next.js and React Native
- [ ] TanStack Query on mobile: same query keys and mutation patterns as web

**Auth:**
- [ ] Supabase `@supabase/supabase-js` on React Native with `AsyncStorage` session persistence
- [ ] Sign-in flow: email magic link + wallet (adapted for mobile)
- [ ] Biometric unlock (Face ID / fingerprint) via `expo-local-authentication` as a session re-auth shortcut
- [ ] Secure token storage via `expo-secure-store` (never AsyncStorage for credentials)

**Core screens (MVP):**
- [ ] Home / dashboard feed
- [ ] Task list + task detail
- [ ] Proposal list + voting
- [ ] Notifications inbox
- [ ] Profile + reputation card
- [ ] Sprint overview

**UI components:**
- [ ] Design token parity: port color and spacing tokens from `globals.css` to a React Native `theme.ts`
- [ ] Component library for mobile: Button, Card, Badge, Avatar, Sheet, Toast — matching web design language
- [ ] React Native safe area setup (`react-native-safe-area-context`)
- [ ] Accessibility: `accessibilityLabel` on all interactive elements, `accessibilityRole` set correctly

---

### Phase 32 — Solana Mobile Wallet Adapter

**Goal:** Enable native Solana wallet signing on Android via the Mobile Wallet Adapter (MWA) protocol, and handle iOS wallet connections via deep links / WalletConnect.

**Android (MWA):**
- [ ] Install `@solana-mobile/mobile-wallet-adapter-protocol-web3js`
- [ ] Implement `transact()` session for signing messages (wallet auth) and transactions
- [ ] Test against Phantom Mobile, Solflare Mobile, and any MWA-compatible wallets
- [ ] Graceful fallback if no MWA-compatible wallet is installed (prompt to install Phantom)

**iOS (deep link approach):**
- [ ] WalletConnect v2 integration for iOS wallet connections (Phantom, Backpack support WC)
- [ ] Universal link / custom URL scheme handling for wallet callback redirects
- [ ] Test on iOS with Phantom and Backpack

**Shared auth:**
- [ ] Reuse server-side `verify-wallet` signature check endpoint — no changes needed server-side
- [ ] Store wallet public key in Supabase session via existing `wallet_link` flow

---

### Phase 33 — Native Push Notifications and Deep Links

**Goal:** Deliver timely, actionable push notifications to native app users and link them directly to the relevant screen.

**Push notifications:**
- [ ] `expo-notifications` setup: request permissions, register device push token
- [ ] Push token registration endpoint: `POST /api/push/device-token` — store token per user in `push_subscriptions` table
- [ ] Notification dispatch: extend existing notification system to send via APNs (iOS) and FCM (Android) using Expo Push API
- [ ] Notification categories with actions (e.g. "View Task", "Vote Now") — actionable from lock screen
- [ ] Notification handler: when app is foregrounded, show in-app banner; when backgrounded/killed, route on tap

**Deep links:**
- [ ] Expo Router deep link config for all core routes: `/tasks/:id`, `/proposals/:id`, `/profile/:id`, `/notifications`
- [ ] Universal links (iOS) and App Links (Android): associate domain `organic.app` with the native app
- [ ] QR code support: scan a DAO invite or task share link and open the correct screen in-app
- [ ] Share sheet integration: "Share Task" and "Share Proposal" open native share sheet with deep link URL

---

### Phase 34 — App Store Release Pipeline

**Goal:** Ship the app to the iOS App Store and Google Play Store with a repeatable, automated build and release process.

**Build infrastructure:**
- [ ] EAS Build setup (`eas.json`): development, preview, and production profiles
- [ ] iOS: Apple Developer account, app bundle ID, provisioning profiles, push certificates
- [ ] Android: Google Play Console account, keystore generation and secure storage, signing config
- [ ] Environment variables: use EAS Secrets for all `SUPABASE_*`, `SOLANA_*`, and API keys — never in source

**App store assets:**
- [ ] Privacy policy page (`/legal/privacy`) — required for both stores
- [ ] Terms of service page (`/legal/terms`)
- [ ] App store screenshots: iPhone 6.5", iPhone 5.5", iPad 12.9" (iOS); phone + 7" tablet (Android)
- [ ] App store description, keywords, category selection
- [ ] App icon (1024×1024 no-alpha for iOS; 512×512 for Android)

**Testing tracks:**
- [ ] TestFlight internal testing: invite core team and testers
- [ ] Google Play internal testing track: same group
- [ ] Staged rollout plan (10% → 50% → 100%) for first production release

**CI/CD:**
- [ ] GitHub Actions workflow: on merge to `release/mobile`, trigger EAS Build + EAS Submit
- [ ] OTA update channel (`eas update`) for JS-only changes without full store resubmission
- [ ] Semantic versioning + build number auto-increment in CI

---

### Phase 35 — Mobile Observability and Analytics

**Goal:** Instrument the native app for crash detection, performance insight, and product analytics before public launch.

**Error and crash tracking:**
- [ ] `@sentry/react-native` SDK: automatic JS crash capture + native crash reporting
- [ ] Sentry release tracking tied to EAS build versions
- [ ] Source map upload in EAS Build pipeline for readable stack traces

**Performance:**
- [ ] Sentry Performance: slow screen renders, long tasks, navigation timing
- [ ] React Native profiler integration in development build
- [ ] Bundle size tracking: alert on regressions > 10% in EAS build output

**Product analytics:**
- [ ] Decide on analytics provider (PostHog recommended — same provider as web for unified funnels)
- [ ] `posthog-react-native` integration
- [ ] Track core funnel events: app open, wallet connect, first task view, first vote, first task submission
- [ ] Mobile-specific events: notification tap, deep link open, biometric auth used

**Quality gates before public launch:**
- [ ] Crash-free rate ≥ 99% on TestFlight / internal track (7-day soak)
- [ ] P75 screen render < 100ms for core screens (home, tasks, proposals)
- [ ] All critical flows pass manual QA on iPhone (latest iOS) and Pixel (latest Android)

---

## Technical Improvement Backlog

### Performance

- [ ] Replace public Solana RPC with paid provider (Helius/QuickNode/Alchemy)
- [ ] Bundle size analysis and reduction
- [ ] Lazy loading for images

### Security

- [ ] CSRF protection review
- [ ] Security headers configuration
- [ ] Regular dependency updates

### Testing

- [ ] Unit tests for utility functions
- [ ] Component testing with React Testing Library
- [ ] Test coverage reporting

### Developer Experience

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component Storybook
- [ ] Contribution guidelines

---

## Notes

- Maintain organic branding and design system across all new features
- Prioritize mobile responsiveness for all new features
- Target WCAG 2.1 AA for all UI components
- Document API endpoints as they're created
- Write tests alongside feature development

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [TailwindCSS](https://tailwindcss.com/docs)
