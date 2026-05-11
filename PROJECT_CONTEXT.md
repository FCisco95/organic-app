# PROJECT_CONTEXT.md

## Organic Platform

### 1. Project Overview

**Project name:** Organic

**One-liner:**  
Organic is a company that builds AI-driven infrastructure for blockchain communities.

**Core idea:**  
Organic builds the rails that any blockchain community can run on. The product surface turns community activity from messy human coordination into legible, on-chain, auto-settled infrastructure. Seven pillars: transparency (blockchain-verified activity), share of rewards (verifiable participation in project economics), incentivization (reward pools + leaderboards), community management (moderation, onboarding, role-gating), roadmap definition (on-chain governance), sprint-basis execution (scoped sprints with payouts), and automatic payments (programmatic on-chain settlement). All seven are AI-driven.

Organic Hub (organichub.fun) is the v1 product — a functioning DAO platform built for the Organic memecoin community first, with the long-term vision of becoming reusable infrastructure for any blockchain community.

---

### 2. Vision & Philosophy

Organic is built around a few core beliefs:

- Decentralization should be **practical**, not symbolic
- Communities should **build themselves**, not wait on founders
- Contribution should be **measurable**, **rewarded**, and **visible**
- Governance should be flexible and evolve over time
- The “trenches” of crypto should be more fair and less extractive

The platform is intentionally designed to evolve. Nothing is considered permanently locked at this stage.

---

### 3. What the Platform Does (Conceptually)

At a high level, Organic enables the following loop:

1. Community members create **proposals**
2. Proposals are **voted on**
3. Approved proposals enter a **backlog**
4. Backlog items are selected into **waves/sprints**
5. Tasks are executed by contributors with different roles
6. Contributors earn **points**
7. Points translate into **revenue share and influence**
8. The system learns and improves over time

Later stages introduce automation and AI-assisted coordination.

---

### 4. Roles & Participation

The platform is designed to support multiple community roles, including (but not limited to):

- Developers
- Content creators
- Community operators
- Strategists
- General contributors

Long-term idea:

- Introduce **learning paths / certifications**
- Certifications unlock or boost effectiveness in certain task types
- Certified roles may earn higher point multipliers for relevant work

Role systems are **not finalized** and expected to evolve.

---

### 5. Current State (Reality Check)

**What is fully implemented:**

- Auth (email/password + Solana wallet link, nonce-protected SIWS)
- Organic ID assignment with on-chain token holder verification
- Task management: CRUD, kanban, claim/submit/review lifecycle, subtasks, dependencies, templates, recurring tasks
- Proposals: wizard, lifecycle (draft → voting → passed/rejected), token-weighted voting, delegation
- Sprint phase engine (planning → active → review → dispute\_window → settlement → completed)
- Dispute resolution: 3-tier escalation, SLA enforcement, evidence lifecycle, XP effects
- Rewards: epoch pool distribution, point-to-token claiming, manual distributions, settlement integrity
- Reputation: XP, levels, achievements, streaks, leaderboard
- Notifications: in-app realtime, batching, voting reminders, follow model, preferences
- Member directory, admin settings (6 tabs), role management
- Treasury dashboard (on-chain balances, allocation chart, transaction history)
- Analytics dashboard (KPI cards, activity trends, member growth, proposal/voting charts)
- Twitter/X engagement verification (OAuth linking, evidence submission)
- Ideas incubator baseline (`/ideas`, `/ideas/[id]`, voting/comments/KPI APIs, promote/winner flow, proposal source-idea linkage) behind feature flag
- Wave 2 UI/UX revamp complete across all surfaces
- Accessibility pass (WCAG 2.1 AA aria-labels, aria-hidden)
- Internationalization: en, pt-PT, zh-CN
- Codebase standardization: all hooks use `fetchJson`/`buildQueryString`, shared Zod schemas, consistent feature domain structure, kebab-case file naming, 89 unit tests

**Recent ships (post-launch):**

- Easter egg hunt + genesis hatch campaign — ✅ Shipped, wound down Apr 6
- Content translation (DeepL on-demand, posts/comments/proposals/ideas/tasks, admin toggles) — ✅ Shipped Apr 15–21
- RPC resilience (RpcPool, consensus verifier, browser proxy routes, lockdown) — ✅ Shipped Apr 22–23 (5 PRs)
- XER backend (engagement verification pipeline, crons running on GitHub Actions) — ✅ Backend shipped PR #77 Apr 24; UI deferred
- Streak button (auth-gated) — ✅ Shipped PR #78 Apr 24
- Egg badges everywhere (byline, profile, members, leaderboard, post/task/proposal comments) — ✅ Shipped PRs #113–#115
- Egg-recipient micro-badge (denormalized count, badge on posts/profile/members/leaderboard) — ✅ Shipped PR #112
- Comprehensive hardening pass (3 CRIT + 3 HIGH security fixes, 186 new assertions, audit reports) — ✅ Shipped PR #121 May 8

**What is still open or incomplete:**

- XER UI — deferred intentionally; backend pipeline works but has no seeded data yet (engagement_handles empty, TWITTER_TOKEN_ENCRYPTION_KEY not confirmed set). See `docs/audits/xer-diagnosis-2026-05-08.md`
- Email notification digests (Resend integration not built)
- Multi-sig treasury (Squads or similar — not started)
- Onboarding cohorts layer (weekly cohort assignment, cohort leaderboard, cohort widgets)
- Starter onboarding quest pack and cohort-specific onboarding UX polish
- Ideas incubator hardening (moderation UX controls, abuse checks, and manual QA closure)
- Discord bot / GitHub contribution tracking
- Multi-tenant / white-label support (future)
- wallets.json endpoint at `/wallets.json` (Sprint 1 Task 1.4 — in scope next)
- AGPL-3.0 LICENSE file in repo (Sprint 1 Task 1.5 — in scope next)
- `src/types/database.ts` regeneration from live schema (closes ~120 of 201 `as any` casts)
- `/tasks/[id]` bundle size: 334 kB → needs dynamic-import for below-fold sections

---

### 6. Long-Term Ideas (Not Required Now)

These are **directional**, not requirements:

- AI agent that scores task quality and contribution fairness
- Automated sprint creation and closure
- Proposal-to-task transformation automation
- Multi-instance version of the platform for other projects
- SaaS-style monetization (subscription or license model)
- Community-managed treasury via multi-sig
- Revenue allocation governed by top contributors or point holders

Agents should **not** implement these unless explicitly asked.

---

### 7. Tech Stack (Current & Flexible)

**Current stack:**

- Frontend: Next.js (App Router)
- Styling: Tailwind CSS
- Backend: Supabase
- Blockchain: Solana
- Auth: Supabase Auth + wallet-based logic

**Notes:**

- shadcn/ui is in use for UI primitives
- Stack is **not locked**
- Open to changes if there is strong justification
- Preference is for simplicity, security, and maintainability

---

### 8. Design & UX Principles

- Simple over clever
- Transparent over abstract
- Power-user friendly, but not overwhelming
- Clear flows: proposal → decision → execution → reward
- UI should make governance feel tangible and understandable

UI revamp is explicitly desired.

---

### 9. Security & Environment

- Security matters, but perfection is not expected at this stage
- Environment separation and best practices are important
- Agents should flag risks clearly
- No silent assumptions about trust or permissions

---

### 10. Open Questions (Intentionally Open)

- What governance rules make sense at each stage?
- How automated should the system become, and when?
- How to balance flexibility vs abuse resistance?
- How to fairly score contributions across different roles?
- What should be on-chain vs off-chain?

These are areas where agent input is explicitly welcome.

---

### 11. Project Status Summary

**As of 2026-05-11.** Organic Hub is live at organichub.fun with ~50 real users. All core DAO flows (auth, tasks, proposals, voting, sprints, disputes, rewards, reputation, notifications, analytics, treasury) are built, tested, and UX-revamped. The foundation is solid and post-launch hardening is complete.

**Strategic direction (v2):** Multi-tenant platform readiness — see canonical design spec at `docs/superpowers/specs/2026-05-11-multi-tenant-platform-readiness-design.md`. Four-layer architecture (Identity / Index / Tenant / Economic), 13 locked decisions, 11 sequenced sub-sessions (9 engineering phases + 2 brand/communication parallel track). v2 introduces three product surfaces — **Organic Hub** (current DAO platform, multi-tenant), **Organic Passport** (soulbound personhood credential), **Organic Scan** (community-health discovery + alpha-hunting). The central engineering bet is Pillar 4 (community management via AI Steward) — without it, multi-tenancy stays founder-dependent and the business model fails.

**Current focus (near-term, parallel to v2 planning):** Sprint 1 codebase items (`wallets.json` endpoint + AGPL-3.0 license — license shipped 2026-05-10 PR #123, wallets.json shipped 2026-05-11 PR #124). Non-code brand/comms work runs in parallel.

**Next on-product build priorities:**
1. **V2 planning kickoff** — open sub-session 1 (multi-tenant data model migration) via `superpowers:writing-plans`; or sub-session 10 (brand identity refresh) for the parallel brand track
2. XER UI (blocked on seeding `engagement_handles` and confirming `TWITTER_TOKEN_ENCRYPTION_KEY`)
3. `database.ts` regeneration from live schema
4. `/tasks/[id]` bundle size reduction

The goal remains: build the _best possible version_ of this system — correctly and intentionally.
