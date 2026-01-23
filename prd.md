# Organic DAO Platform Revamp - PRD & Implementation Plan

## Executive Summary

**Goal**: Revamp Organic DAO into a gamified community governance platform with clear rewards, engaging UX, and working task/voting flows. Build as proof of concept first, with future SaaS/white-label vision.

**Timeline**: 2-4 weeks MVP
**Founder**: Solo founder, very active for testing/feedback
**Approach**: Feature by feature, open to stack changes if beneficial

---

## Product Requirements Document (PRD)

### 1. Problem Statement

Current issues with the Organic platform:

- **Low engagement**: Members aren't participating actively
- **Unclear rewards**: Points don't translate to tangible value
- **UX friction**: App hasn't launched, needs polish and completeness
- **Missing features**: Task flow, voting, sprint management incomplete
- **No differentiation**: Nothing that makes the community stand out long-term

### 2. Target Users

**Primary**: Crypto natives familiar with wallets, DAOs, and DeFi
**Scale**: Starting <100 members, potential growth to 500+ in 12 months

### 3. Core Features (MVP Priority Order)

#### 3.1 Task Management System (CRITICAL - Broken/Incomplete)

**Task Types**:

- Development (code tasks with GitHub PR links)
- Content/Social (writing, tweets, community posts)
- Design (graphics, UI mockups, branding)
- Custom (admin-defined types)

**Task Modes**:

- Solo bounties (single assignee)
- Team tasks (multiple contributors) - determined by task type

**Task Lifecycle**:

1. Task created (by admin, optionally linked to passed proposal)
2. Member self-assigns (click to claim)
3. Member works and submits via structured form (different form per task type)
4. Reviewer rates quality (1-5 stars)
5. Points distributed based on quality score
6. If team task, points split by individual quality scores

**Submission Forms** (per task type):

- Development: PR link, description, testing notes
- Content: Content link/text, reach metrics, description
- Design: File upload, description, revision notes
- Custom: Configurable fields

**Quality Scoring**:

- Star rating (1-5)
- Affects point multiplier (e.g., 5★ = 100%, 3★ = 60%, 1★ = 20%)
- For team tasks: each contributor scored individually, points split proportionally

#### 3.2 Voting System (CRITICAL)

**Proposal Flow**:

1. Member creates proposal (token holder with Organic ID)
2. Community votes (token-weighted, 1 $ORG = 1 vote)
3. If passed: Admin creates bound tasks
4. Tasks completed → rewards distributed

**Voting Parameters**:

- Quorum: 5-10% circulating supply
- Approval threshold: >50% YES (configurable for treasury proposals)
- Voting window: 5 days (configurable)
- Optional abstain counts toward quorum
- Proposal threshold: minimum $ORG to create proposal
- Anti-abuse: one live proposal per proposer + 7-day cooldown

#### 3.3 Sprint/Epoch Management

**Model**: Time-boxed sprints (1-2 week duration)

- Create sprint with start/end dates
- Assign tasks to sprints
- Tasks can exist outside sprints too
- Sprint progress tracking
- Sprint history/archive

#### 3.4 Rewards & Reputation System

**Point System**:

- Tasks have base point values (initially set by admin)
- Future: Community votes on task weights
- Dev tasks weighted higher than other types
- Quality multiplier affects final points

**Points → Token Conversion**:

- **Phase 1 (Launch)**: Threshold-based claiming
  - Accumulate points until threshold (e.g., 1000 points)
  - Claim converts to $ORG tokens (manual distribution by admin initially)
- **Phase 2**: Epoch pools (fixed token pool per sprint, distributed proportionally)
- **Phase 3**: Multi-sig treasury managed by Council

**Reputation Tiers (11 levels)**:

1. Bot (0 XP) - New, unproven
2. Automaton (100 XP)
3. Synthetic (250 XP)
4. Awakening (500 XP)
5. Sentient (1000 XP)
6. Conscious (2000 XP)
7. Aware (4000 XP)
8. Mindful (7000 XP)
9. Enlightened (12000 XP)
10. Human (20000 XP)
11. Transcendent (35000 XP) - Legendary status

**Unlocks per tier**:

- **Voting power**: Higher rep = more weight
- **Task access**: Higher-value bounties, sensitive tasks
- **Governance roles**: Council eligibility, proposal creation, arbitration rights

#### 3.5 Gamification

**XP & Levels**:

- 11 reputation tiers with clear progression
- XP from: task completion, voting, proposals, social activity
- Visible level badges on profiles

**Achievements/Badges**:

- Milestone badges (first task, 10 tasks, 100 tasks)
- Role badges (first proposal passed, council member)
- Activity badges (7-day streak, monthly contributor)

**Leaderboards**:

- Weekly/monthly/all-time rankings
- Categories: points, tasks, proposals, reputation

**Streaks**:

- Daily/weekly activity streaks
- Bonus multipliers for maintaining streaks
- Inactivity removes streak boosts (soft moderation)

#### 3.6 Homepage & Activity Feed

**Components**:

- **Live activity stream**: "Alice completed X", "Bob earned 50 XP", "Proposal Y passed"
- **Leaderboard sidebar**: Top contributors this week/month
- **Featured tasks**: Open bounties people can claim
- **Community stats**: Active members, tasks completed, tokens distributed

#### 3.7 Member Management

**Onboarding**:

1. User connects wallet
2. If minimum $ORG threshold met → can claim Organic ID
3. Organic ID grants "Member" role
4. Members can: view tasks, self-assign, vote, create proposals

**Organic ID Threshold**: 1000 $ORG minimum to claim

**Role Hierarchy**:

- Admin (full control)
- Council (task review, dispute arbitration, elevated voting)
- Member (standard participation)

**Moderation** (soft approach):

- No hard removal for inactivity
- Remove streak boosts when inactive
- Mark "inactive since" timestamp for analytics
- Admin can revoke roles for bad actors

#### 3.8 Dispute Resolution

**Community Arbitration**:

- High-rep members can serve as arbitrators
- Disputed task goes to arbitration queue
- Arbitrator reviews submission and makes decision
- Escalation path: Arbitrator → Council → Admin

#### 3.9 Treasury Display

**MVP**:

- Show $ORG treasury balance
- Basic transaction history
- Rolling treasury model (no fixed budgets per sprint)

**Future**:

- Multi-sig integration (Squads or similar)
- Budget tracking per proposal
- Spending analytics

### 4. Technical Requirements

#### 4.1 Current Stack

- Next.js 14 App Router
- Supabase (Postgres + Auth)
- Solana wallet integration (Phantom + others)
- React Query for caching
- Zod for validation
- next-intl for i18n (en, pt-PT, zh-CN)

#### 4.2 Concerns to Address

- **Performance**: RPC rate limits, caching strategy
- **Complexity**: Keep diffs small, avoid over-engineering
- **Security**: Wallet security, signature verification, input validation
- **Scalability**: Architecture should handle growth to 500+ members

#### 4.3 Database Changes Needed

- Task submissions table
- Task quality scores table
- Reputation/XP tracking
- Achievements table
- Activity log table
- Streak tracking
- Point balances

### 5. UX/Design Direction

**Style**: Gamified

- Progress bars for level advancement
- Achievement popups
- Leveling up animations
- Badge displays
- Streak indicators

**Branding**: Partial exists (logo + colors), needs polish for gamified feel

**Mobile**: Responsive (existing), maintain mobile-first consideration

### 6. Integrations (Future, not MVP)

- Discord: Bot for notifications, role sync
- Twitter/X: Track engagement, verify posts
- GitHub: Code contribution tracking
- On-chain data: Token holdings, activity verification
- AI: Content generation, analytics dashboard (later)

### 7. Future Vision (Post-MVP)

**SaaS Platform**:

- Full white-label for other communities
- Custom branding, domain, configuration per tenant
- Open core model: basic features open source
- Premium (proprietary): Advanced analytics, scale features

**Certification System**:

- Certify other projects based on Organic activity standards

---

## Implementation Plan

### Phase 1: Fix Core Task Flow (Week 1)

**Files to modify**:

- `src/features/tasks/` - Task domain logic
- `src/components/tasks/` - Task UI components
- `src/app/[locale]/tasks/` - Task pages
- `src/app/api/tasks/` - Task API routes
- `supabase/migrations/` - New migrations for submissions, quality scores

**Tasks**:

1. Audit current task creation flow, identify gaps
2. Implement structured submission forms by task type
3. Add task type selector (Dev/Content/Design/Custom)
4. Build submission review UI for admin/council
5. Implement star rating quality scoring
6. Add point calculation based on quality score
7. Fix task assignment/claiming flow
8. Test complete task lifecycle end-to-end

### Phase 2: Voting System (Week 1-2)

**Files to modify**:

- `src/features/voting/` - Voting domain logic
- `src/features/proposals/` - Proposal enhancements
- `src/components/proposals/` - Voting UI
- `src/app/api/proposals/` - Voting API routes

**Tasks**:

1. Build vote casting UI
2. Implement token-weighted vote calculation
3. Add quorum and threshold checking
4. Create vote result display
5. Link passed proposals to task creation
6. Test proposal → vote → pass → task flow

### Phase 3: Reputation & Points (Week 2)

**Files to modify**:

- `src/features/reputation/` - New domain
- `src/features/profile/` - Profile enhancements
- `src/components/profile/` - Level/badge display
- `supabase/migrations/` - XP, reputation, achievements tables

**Tasks**:

1. Design 11 tier reputation system
2. Implement XP calculation from activities
3. Build level progression logic
4. Create tier-based unlock system
5. Add reputation display to profiles

### Phase 4: Gamification (Week 2-3)

**Files to modify**:

- `src/features/achievements/` - New domain
- `src/features/streaks/` - New domain
- `src/components/gamification/` - New UI components
- `src/app/[locale]/` - Homepage updates

**Tasks**:

1. Define achievement list and criteria
2. Implement achievement unlock logic
3. Build streak tracking system
4. Create achievement notification popups
5. Add gamified UI elements (progress bars, badges)

### Phase 5: Homepage & Activity Feed (Week 3)

**Files to modify**:

- `src/app/[locale]/page.tsx` - Homepage
- `src/features/activity/` - New domain
- `src/components/activity/` - Feed components
- `src/components/leaderboard/` - Leaderboard component

**Tasks**:

1. Create activity log infrastructure
2. Build real-time activity feed component
3. Implement leaderboard component
4. Add featured tasks section
5. Compose new homepage layout

### Phase 6: Polish & Launch Prep (Week 3-4)

**Tasks**:

1. Sprint management improvements
2. Treasury balance display
3. Member directory enhancements
4. Bug fixes from testing
5. Performance optimization
6. Security review

---

## Verification

### Commands

```bash
npm run dev    # Test locally
npm run lint   # Check code quality
npm run build  # Verify build passes
npm run format # Clean formatting
```

### Manual Checks

1. Complete user journey: Connect wallet → Claim ID → Self-assign task → Submit → Get rated → See points
2. Proposal flow: Create proposal → Vote → Pass → See linked task option
3. Gamification: Complete task → See XP gain → Level up notification → Badge earned
4. Homepage: Activity feed updates in real-time, leaderboard shows correct rankings
5. Mobile: All flows work on mobile devices

---

## Open Questions (Minor)

1. What achievements should be available at launch?
2. Should we use Supabase Realtime for activity feed, or polling?

---

## Summary

**MVP Deliverables** (2-4 weeks):

1. Working task flow with structured submissions and quality scoring
2. Token-weighted proposal voting
3. 11 tier reputation system with XP
4. Gamification (achievements, streaks, leaderboards)
5. New homepage with activity feed
6. Treasury balance display
7. Sprint management fixes

**Development Approach**: Feature by feature, with active testing feedback

**Future**: SaaS white-label platform, integrations (Discord/Twitter/GitHub), AI analytics
