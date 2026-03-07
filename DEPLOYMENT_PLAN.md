# Organic Protocol — Deployment & Next Steps Plan

> Created: 2026-03-07
> Strategy: Polish & harden → deploy on Vercel → iterate
> Sequencing: Parallel tracks (blockers + features simultaneously)

---

## Decision Summary

| Decision | Choice |
|---|---|
| Primary goal | Polish & harden before deploying |
| Hosting | Vercel (default URL first, custom domain later) |
| Blockers | Fix them — they're critical |
| Priority features | Ideas Incubator hardening (Phase 28) + Task Threads (Phase 21) |
| New ideas | PWA, Landing Page, Activity Feed, Shareable Profiles — all included |
| Sequencing | Parallel tracks across sessions |
| Rebrand direction | Organic Protocol — community coordination & merit-based rewards layer |

---

## Track 1 — Blockers & Hardening (Pre-Deploy Critical)

### 1.1 Schema-Cache Drift Fix (PGRST204)

**Problem:** Staging schema-cache drift on proposal execution-window writes (`PGRST204` for `execution_deadline` path).

**Tasks:**
- [ ] Diagnose the exact column/table causing the PGRST204 error in proposal execution deadline writes
- [ ] Verify `execution_deadline` column exists in the Supabase schema and matches the generated types
- [ ] Run `supabase db reset` or schema cache reload on staging to clear drift
- [ ] Regenerate Supabase types (`supabase gen types typescript`) and update `src/types/database.ts`
- [ ] Verify proposal execution-window write path works end-to-end on staging
- [ ] Document the fix so it doesn't recur during future migrations

### 1.2 Manual QA Matrix Completion

**Problem:** Go/No-Go gate remains No-Go pending manual QA matrix completion.

**Tasks:**
- [ ] Review `docs/qa-runbook.md` for incomplete test cases
- [ ] Execute outstanding manual QA matrix items against staging
- [ ] Focus on critical paths: auth flow, wallet connect, task lifecycle, proposal voting, rewards claim
- [ ] Document results with pass/fail per test case
- [ ] Fix any bugs discovered during QA
- [ ] Update Go/No-Go gate to Go when all critical paths pass

### 1.3 Ideas Incubator Hardening (Phase 28 Closure)

**Problem:** Ideas Incubator is scaffolded but needs moderation UX, gamification integration, abuse prevention, and QA.

**Tasks:**
- [ ] **Admin moderation controls:** Pin, lock comments, remove idea, select/promote winner — context menu on idea cards
- [ ] **Gamification integration:**
  - Emit XP/points on idea creation (+5 XP)
  - Emit XP/points on vote cast (+1, daily cap 5/day)
  - Emit XP/points on vote received (+1, daily cap 10/day)
  - Emit bonus XP on promotion to proposal candidate (+25)
- [ ] **Abuse prevention:**
  - Block self-voting
  - Enforce duplicate vote protection
  - Add anomaly logging for suspicious voting patterns
  - Add gamification config keys for ideas with admin override
- [ ] **Weekly spotlight module:** "This week's proposal candidate" with countdown and CTA
- [ ] **PATCH `/api/ideas/:id`:** Full author edit window + admin moderation fields (pin, lock, status)
- [ ] **Integrity tests:** Vote idempotency, score correctness, winner selection determinism, promotion link integrity
- [ ] **Manual QA:** Create/post/vote/comment/moderate/promote flows on desktop + mobile

---

## Track 2 — New Features (Parallel Build)

### 2.1 PWA Support (Pre-Launch — High Priority)

**Goal:** Make Organic installable on mobile with offline browsing capability. Push notifications as fast follow.

#### Phase A: Installability + Offline (Pre-Launch)

**What this does:** Users visiting the site on mobile get an "Add to Home Screen" prompt. The app opens full-screen with its own icon, no browser bar. Basic pages load even without internet.

**Tasks:**
- [ ] Create `public/manifest.json` with app name, theme colors, icons, display mode
- [ ] Generate PWA icon set (192x192, 512x512, maskable) from Organic branding
- [ ] Add manifest link and meta tags to root layout (`<link rel="manifest">`, `<meta name="theme-color">`, Apple touch icon)
- [ ] Create service worker with Workbox for asset caching (cache-first for static, network-first for API)
- [ ] Register service worker in `_app` or root layout
- [ ] Add offline fallback page (`/offline`) for when network + cache both miss
- [ ] Test install flow on iOS Safari and Android Chrome
- [ ] Verify app works in standalone mode (no browser chrome)

#### Phase B: Push Notifications (Post-Launch Fast Follow)

**What this does:** Members get phone notifications even when the app is closed — "Proposal voting ends in 2 hours", "You were mentioned in a task comment", "Dispute window closing soon."

**Notification triggers (prioritized):**
1. **Voting reminders** — Proposal voting deadlines, new proposals to vote on
2. **Social/mentions** — @mentions in comments, direct notifications
3. **Time-sensitive events** — Dispute window closing, sprint ending, execution deadline approaching

**Tasks:**
- [ ] Set up web push service (Firebase Cloud Messaging or self-hosted with web-push library)
- [ ] Create push subscription API route (`POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`)
- [ ] Store push subscriptions in `push_subscriptions` table (`user_id`, `endpoint`, `keys`, `created_at`)
- [ ] Create push notification sender utility (title, body, icon, click URL)
- [ ] Integrate with existing notification system — trigger push alongside in-app notifications
- [ ] Add notification preferences: per-category push toggle in user settings
- [ ] Handle subscription refresh/expiry gracefully

### 2.2 Public Landing Page (Pre-Launch)

**Goal:** When someone visits the root URL without being logged in, they see a compelling page explaining what Organic Protocol is, not just a login screen.

**Tone:** Professional but crypto-native. Organic started as a meme but is evolving into Organic Protocol — a coordination layer for communities to interact, collaborate, and distribute rewards based on work merit.

**Sections:**
1. **Hero** — Bold headline, subtitle explaining the value prop, primary CTA "Join the DAO" + secondary "Explore"
2. **Feature overview** — 4-6 feature cards (Tasks, Proposals, Reputation, Treasury, Ideas, Rewards) with icons and one-liners
3. **How it works** — 3-step flow: Connect Wallet → Verify Token → Start Contributing
4. **Live stats** — Real counters from the platform: active members, tasks completed, proposals passed, XP distributed
5. **Public transparency links** — Link to public treasury, public idea feed, public profiles
6. **Footer** — Links, social handles, built with love by the Organic community

**Tasks:**
- [ ] Create unauthenticated landing route at `/[locale]/landing` or root redirect for unauthenticated users
- [ ] Design and build Hero section with headline, subtitle, dual CTAs
- [ ] Build feature overview grid (reuse Lucide icons, consistent with app design language)
- [ ] Build "How it works" 3-step section with illustrations or icons
- [ ] Create stats API endpoint (`GET /api/public/stats`) returning aggregate platform metrics
- [ ] Build live stats counter section (animated count-up on scroll)
- [ ] Build transparency links section
- [ ] Build footer with social links and community credits
- [ ] Add i18n support for landing page copy (en, pt-PT, zh-CN)
- [ ] Ensure mobile responsiveness across all sections
- [ ] Add Open Graph meta tags for the landing page itself (social sharing of the URL)

### 2.3 Unified Activity Feed (Pre-Launch)

**Goal:** A real-time pulse of DAO activity that keeps members engaged and creates FOMO. Shows what's happening across the community.

**Location:** Dashboard widget (quick preview) + dedicated `/activity` page (full browsing).

**Feed model:** Two tabs — "All Activity" (full DAO) and "My Activity" (personalized to current user).

**Tasks:**

#### Database
- [ ] Create `activity_events` table:
  - `id` UUID PK
  - `org_id` UUID FK
  - `actor_id` UUID FK (user who performed the action)
  - `event_type` enum: `task_created`, `task_completed`, `task_submitted`, `proposal_created`, `proposal_voted`, `proposal_passed`, `proposal_rejected`, `idea_posted`, `idea_promoted`, `member_joined`, `sprint_started`, `sprint_ended`, `reward_claimed`, `achievement_earned`, `level_up`, `dispute_opened`, `dispute_resolved`
  - `subject_type` text (task, proposal, idea, sprint, etc.)
  - `subject_id` UUID
  - `metadata` JSONB (title, details, amounts — enough to render without joins)
  - `created_at` timestamptz
- [ ] Add indexes on `(org_id, created_at DESC)`, `(actor_id, created_at DESC)`
- [ ] Add RLS: all authenticated members can read activity for their org

#### API
- [ ] `GET /api/activity` — paginated feed with cursor pagination
  - Query params: `scope=all|mine`, `type=task|proposal|idea|...`, `limit`, `cursor`
  - "mine" scope filters to events where actor_id = current user OR subject involves current user
- [ ] Create activity event emitter utility — called from existing API routes when actions happen
- [ ] Integrate emitter into: task creation/completion, proposal creation/voting/finalization, idea posting/voting/promotion, member join, reward claims, level-ups

#### UI
- [ ] **Dashboard widget:** Compact activity card showing last 5-8 events with "View all →" link
  - Event row: avatar, "Alice completed task 'Fix navbar'" time ago
  - Color-coded icons per event type
- [ ] **Full activity page (`/[locale]/activity`):**
  - Two tabs: "All Activity" / "My Activity"
  - Infinite scroll with cursor pagination
  - Filter by event type (dropdown or chips)
  - Each event card: actor avatar, action description, subject link, relative time
- [ ] Add `/activity` to main navigation
- [ ] Mobile responsive — compact cards, no horizontal overflow
- [ ] i18n for all event type labels

### 2.4 Shareable Profiles + OG Cards (Pre-Launch)

**Goal:** Let members flex their contributions. Public profile pages with social preview cards, contribution heatmaps, and shareable image cards.

**Privacy model:** Public by default — all profiles are visible. Members can opt out if desired.

**Visible data:** Reputation stats, contribution counts, achievements, DAO participation history.

**Tasks:**

#### Public Profile Pages
- [ ] Create public profile route at `/profile/:id` or `/member/:handle` (accessible without auth)
- [ ] Display sections:
  - **Header:** Avatar, display name, wallet address (truncated), member since date, level badge
  - **Reputation stats:** XP, level, rank, current streak
  - **Contribution counts:** Tasks completed, proposals authored, votes cast, ideas posted
  - **Top achievements:** Badge grid showing earned achievements (max 6-9 displayed, "view all" link)
  - **DAO participation:** Roles held, sprints participated, ideas promoted
  - **Contribution heatmap:** Calendar-style grid (like GitHub) showing daily activity intensity over last 12 months
- [ ] Ensure profile data API supports unauthenticated reads (public endpoint)
- [ ] Add RLS policy for public profile reads

#### OG Meta Tags (Social Preview Cards)
- [ ] Add dynamic Open Graph meta tags on profile pages:
  - `og:title` = "Member Name — Level X | Organic Protocol"
  - `og:description` = "X tasks completed, Y proposals, Z XP earned"
  - `og:image` = dynamically generated image (see below)
- [ ] Add Twitter Card meta tags (`twitter:card=summary_large_image`)
- [ ] Test social previews on Twitter, Discord, Telegram

#### Dynamic OG Image Generation
- [ ] Create OG image API route (`GET /api/og/profile/:id`) using `@vercel/og` or `satori`
  - Generates a 1200x630 image with: avatar, name, level, XP, top 3 stats, Organic branding
  - Cached with appropriate headers (immutable for X hours, revalidate on profile update)
- [ ] Design the OG card template — clean, branded, readable at small sizes

#### Contribution Heatmap
- [ ] Create heatmap data API (`GET /api/users/:id/activity-heatmap`)
  - Returns daily activity counts for last 365 days
  - Sources: task completions, votes cast, proposals created, ideas posted, comments
- [ ] Build heatmap component (calendar grid with color intensity)
  - Tooltip on hover showing date and activity count
  - Legend showing intensity scale
- [ ] Mobile responsive — horizontal scroll or condensed view on small screens

#### Shareable Image Card
- [ ] Create downloadable profile card image route (`GET /api/og/profile/:id/card`)
  - Higher resolution version of the OG image (1080x1080 for Instagram, 1200x675 for Twitter)
  - Includes QR code linking to the public profile page
- [ ] Add "Share Profile" button on profile page with options:
  - Copy link
  - Download image card
  - Share to Twitter (pre-filled tweet with profile link)

---

## Track 3 — Phase 21: Task Threads + Co-crediting (Full Build)

**Goal:** Make collaboration visible inside the platform. Replace silence between task creation and completion with threaded discussion and shared XP credit.

### Database
- [ ] Create `task_comments` table:
  - `id` UUID PK
  - `task_id` UUID FK
  - `user_id` UUID FK
  - `content` text (max 2000 chars)
  - `parent_id` UUID FK nullable (self-referencing for threads)
  - `edited_at` timestamptz nullable
  - `deleted_at` timestamptz nullable (soft delete)
  - `created_at` timestamptz
- [ ] Create `task_collaborators` table:
  - `task_id` UUID FK
  - `user_id` UUID FK
  - `credited_by` UUID FK (who added them)
  - `xp_share_pct` integer (percentage, all collaborators must sum to 100)
  - `created_at` timestamptz
- [ ] Add indexes: `(task_id, created_at)` on comments, `(task_id)` on collaborators
- [ ] Add RLS: task comments readable by all org members, writable by authenticated members; collaborators writable by task assignee

### API
- [ ] `GET /api/tasks/:id/comments` — nested comment thread, paginated, includes author profile
- [ ] `POST /api/tasks/:id/comments` — create comment, resolve @mentions to user IDs, trigger notifications
- [ ] `PATCH /api/tasks/:id/comments/:commentId` — edit own comment (within 15-min edit window)
- [ ] `DELETE /api/tasks/:id/comments/:commentId` — soft delete own comment
- [ ] `POST /api/tasks/:id/collaborators` — add co-contributors at submission time with XP split percentages
- [ ] `GET /api/tasks/:id/collaborators` — list collaborators and their XP shares
- [ ] Update XP distribution engine to split task reward among credited collaborators per `xp_share_pct`
- [ ] Validate total `xp_share_pct` sums to 100 across all collaborators (Zod)
- [ ] Trigger notifications for @mentions and when added as collaborator

### UI
- [ ] **Comment thread panel** on task detail page (collapsible section below task description)
  - Comment input with markdown support (bold, links, code)
  - Threaded reply UI with indent + collapse (max 3 levels deep)
  - Edit/delete controls on own comments
  - Relative timestamps, author avatar + name
- [ ] **@mention autocomplete** — type `@` to search active members by name/handle, insert mention chip
- [ ] **Co-contributor selector** on task submission form:
  - Search and add collaborators
  - XP split sliders/inputs with preview ("You 60% / Alice 25% / Bob 15%")
  - Validation: must sum to 100%
- [ ] **Collaborator avatars** shown on task card in kanban and list views (small avatar stack)
- [ ] **Notifications** for mentioned users and co-contributors
- [ ] i18n for all comment and collaborator UI strings
- [ ] Mobile responsive — comment thread readable on small screens

---

## Track 4 — Vercel Deployment Setup

### Pre-Deployment Checklist
- [ ] Verify all environment variables from `.env.local.example` are set in Vercel dashboard
- [ ] Configure Supabase production project (separate from staging)
- [ ] Set `NEXT_PUBLIC_APP_URL` to Vercel deployment URL
- [ ] Verify Solana RPC endpoint is production-ready (consider paid provider: Helius/QuickNode)
- [ ] Configure Sentry for production environment
- [ ] Set up Upstash Redis for production rate limiting
- [ ] Review and set security headers in `next.config.ts` and `vercel.json`

### Deployment Steps
- [ ] Run `npm run lint` — ensure zero errors
- [ ] Run `npm run build` — ensure clean production build
- [ ] Connect GitHub repo to Vercel project
- [ ] Configure production branch (main) for auto-deployments
- [ ] Configure preview deployments for PRs
- [ ] Deploy to Vercel default URL
- [ ] Verify all critical flows work on production:
  - Auth / wallet connect
  - Task lifecycle
  - Proposal voting
  - Ideas feed
  - Notifications
- [ ] Set up custom domain later when ready (app.organic-protocol.xyz or similar)

### Post-Deployment Monitoring
- [ ] Verify Sentry is receiving errors
- [ ] Create `/api/health` endpoint checking: Supabase connection, Solana RPC status, app version
- [ ] Set up Vercel Analytics (built-in, free tier)
- [ ] Monitor Core Web Vitals in Vercel dashboard
- [ ] Set up uptime monitoring (UptimeRobot or similar, free tier)

---

## Execution Order (Parallel Tracks)

```
Week 1-2:  Track 1 (Blockers) + Track 2.1a (PWA Installability) + Track 2.2 (Landing Page)
Week 2-3:  Track 1 cont. + Track 2.3 (Activity Feed DB + API)
Week 3-4:  Track 3 (Phase 21 DB + API) + Track 2.3 (Activity Feed UI)
Week 4-5:  Track 3 cont. (Phase 21 UI) + Track 2.4 (Shareable Profiles)
Week 5-6:  Track 4 (Deployment) + Track 2.1b (Push Notifications)
Week 6+:   Post-launch iteration, monitoring, community feedback
```

**Note:** This is a rough guide. Sessions will be prioritized based on momentum and mood. Any track can be picked up independently.

---

## Technical Improvement Targets (Ongoing)

- [ ] Replace public Solana RPC with paid provider before production traffic
- [ ] Bundle size audit with `@next/bundle-analyzer` (already in devDeps)
- [ ] Image lazy loading audit across all surfaces
- [ ] CSRF protection review for all mutation endpoints
- [ ] Regular dependency updates (npm audit)
- [ ] API documentation with OpenAPI/Swagger for public endpoints
- [ ] Component testing with React Testing Library for critical UI flows

---

## Success Criteria for Launch

1. **Go/No-Go gate = Go** — All critical QA paths pass, schema drift resolved
2. **Core flows work on production** — Auth, tasks, proposals, voting, rewards
3. **Mobile experience is solid** — PWA installable, responsive UI, offline fallback
4. **Landing page is live** — New visitors understand what Organic Protocol is
5. **Activity feed shows life** — Members see the DAO is active when they log in
6. **Social sharing works** — Profile links render rich cards on Twitter/Discord
7. **Monitoring is active** — Sentry capturing errors, health endpoint responding
