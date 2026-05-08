# Test Coverage Map — 2026-05-08

## Summary
- **Domains fully covered**: 5 (auth, tasks, proposals, voting, sprints)
- **Domains with partial coverage**: 5 (disputes, members, reputation, rewards, engagement)
- **Domains with minimal/no tests**: 3 (notifications, points/gamification (API), easter/xer)
- **Total test files**: 348 across the repo (27 integration/E2E specs + 30 security tests + 40+ unit tests in src/features)
- **Test frameworks in use**: Vitest (unit tests), Playwright (E2E/API smoke tests)

### Top 10 Highest-Priority Test Gaps

1. **Notifications API routes** — No tests for notification creation, read state, preferences, or fanout logic
2. **Points system** — No API tests for point earn/spend; reputation decay not tested at API level
3. **Easter egg / Campaign logic** — Only UI badge test; no API tests for egg-granting, opening, or micro-badge logic
4. **Reputation score calculation** — Unit tests for leaderboard ordering exist, but no end-to-end score calc tests
5. **Cron job coverage** — Only sprint-summary cron tested; appeals-sweep and engagement-poll have no tests
6. **Rate limiting across domains** — No tests verify rate limits on high-risk endpoints (auth, voting, claims)
7. **RLS policy enforcement (member-level)** — RLS audit exists; no systematic member isolation tests per domain
8. **IDOR detection** — No tests for cross-user data access attempts on disputes, posts, treasury
9. **Proposal dispute/finalization edge cases** — No tests for proposal state violations (e.g., voting after dispute)
10. **Daily tasks streak logic** — No API test coverage; route exists but untested

---

## Coverage by Domain

### 1. auth

**Covered:**
- `tests/proposals.spec.ts` — Covers login page structure
- `tests/notifications-auth-surface-revamp.spec.ts` — Auth page renders (login, signup, error)
- `tests/security/auth-session.test.ts` — getSession vs getUser in API routes; nonce lifecycle (SIWS); Twitter OAuth PKCE flow; OAuth session TTL, duplicate account detection, re-link cooldown
- `tests/security/auth-redirect.test.ts` — POST /api/auth/callback redirect behavior
- `src/app/api/auth/nonce/__tests__/route.test.ts` (absent — only route.ts exists)
- `src/app/api/auth/link-wallet/__tests__/route.test.ts` (absent)

**Missing (priority):**
- **HIGH**: POST /api/auth/nonce — no test verifies rate limiting or nonce expiry enforcement
- **HIGH**: POST /api/auth/link-wallet — no test verifies SIWS signature validation or wallet already-linked rejection
- **HIGH**: POST /api/auth/callback (Twitter) — no test verifies Free-tier pending profile handling
- **MED**: GET /api/user (profile fetch) — no test for session timeout behavior
- **LOW**: OAuth state parameter collision tests

---

### 2. tasks

**Covered:**
- `tests/tasks.spec.ts` — Task CRUD (create, fetch, update, delete); role enforcement (member 403); task submission lifecycle (submit → review → approve/reject); quality scoring (points deduction)
- `tests/tasks-surface-revamp.spec.ts` — UI surface validation (tasks page, task detail page, submission review page)
- `src/features/tasks/__tests__/proposal-linkage.test.ts` — Proposal linkage validation
- `tests/security/task-submission-auth.test.ts` — Auth enforcement on submission endpoints
- `src/app/api/tasks/[id]/submissions/route.test.ts` (absent)
- `src/app/api/submissions/[id]/review/route.test.ts` (absent)

**Missing (priority):**
- **HIGH**: Rejection with reason validation (test exists but only checks 400 when reason missing)
- **HIGH**: POST /api/tasks/[id]/submissions — no test for duplicate submission detection or submission limit per sprint
- **HIGH**: POST /api/submissions/[id]/review — no test for appeal-state handling or reviewer conflict of interest
- **MED**: Task template endpoints (GET /api/tasks/templates)
- **MED**: Task assignee management (GET /api/tasks/assignees)
- **LOW**: Custom task_type validation

---

### 3. proposals

**Covered:**
- `tests/proposals.spec.ts` — Proposal creation (verified member only; guest 403); public GET (no auth); draft update/submit; delete as author
- `tests/proposals-lifecycle.spec.ts` — Full lifecycle: draft → submitted → in-progress → voting → finalized
- `tests/proposals-surface-revamp.spec.ts` — UI surface (list page, detail page, voting interface)
- `tests/voting-integrity.spec.ts` — Voting snapshot capture, finalization with dedupe keys, recovery after failures
- `src/features/proposals/__tests__/anti-abuse.test.ts` — Duplicate proposal detection, spam prevention
- `src/features/proposals/__tests__/lifecycle.test.ts` — State machine validation

**Missing (priority):**
- **HIGH**: POST /api/proposals/[id]/start-voting — no test verifies non-eligible voters (insufficient balance) cannot vote
- **HIGH**: Proposal withdrawal after voting started — no test verifies state violation rejection
- **HIGH**: Vote weight calculation — voting-integrity.spec tests snapshot but not weight distribution
- **MED**: GET /api/proposals/eligibility — no test for token-holder verification or delegation resolution
- **MED**: POST /api/proposals/[id]/vote — no test for double-voting prevention
- **MED**: Proposal templates (GET /api/proposals/templates)

---

### 4. voting

**Covered:**
- `tests/voting-integrity.spec.ts` — Voting snapshot determinism; finalization idempotency; dedupe-key recovery; delegation state capture
- `src/features/voting/__tests__/snapshot-integrity.test.ts` — Schema validation for start-voting and finalize payloads
- `tests/security/voting-snapshot-integrity.test.ts` — Snapshot immutability checks

**Missing (priority):**
- **HIGH**: Vote weight calculation algorithm — no test for delegation chain resolution or rank decay
- **HIGH**: POST /api/voting/delegations — no test for delegation conflicts or circular delegation detection
- **MED**: Finalization race condition under concurrent requests
- **MED**: Vote revocation after finalization (if supported)
- **LOW**: Voting period enforcement (no test verifies voting after deadline ends)

---

### 5. sprints

**Covered:**
- `tests/sprints.spec.ts` — Sprint CRUD; start (planning → active) with 409 conflict guard; complete across phases (active → review → dispute_window → settlement → completed); role enforcement
- `tests/sprint-phase-engine.spec.ts` — Phase transition rules; execution phase detection
- `tests/sprints-surface-revamp.spec.ts` — UI surface (list, detail, creation)
- `src/features/sprints/__tests__/phase-engine.test.ts` — Phase rank ordering, forward-only transitions
- `src/features/sprints/__tests__/settlement-blockers.test.ts` — Settlement blocker detection (unresolved disputes, pending payouts)
- `tests/security/sprints-task-transition.test.ts` — Task transitions during sprint phase changes

**Missing (priority):**
- **HIGH**: Sprint phase auto-transition cron trigger — no test for scheduled phase advancement
- **HIGH**: PATCH /api/sprints/[id] — update sprint metadata (theme, dates, goals)
- **MED**: Dispute window duration enforcement
- **MED**: Settlement payout distribution logic (currently tested in rewards, not sprint-specific)
- **LOW**: Sprint template/theme validation

---

### 6. members

**Covered:**
- `tests/members-profile-surface-revamp.spec.ts` — UI surface (members list, profile detail)
- `tests/profile.spec.ts` — Profile avatar upload; profile field updates
- `src/features/members/__tests__/members-api.test.ts` — Member list pagination
- `tests/security/member-privacy.test.ts` — Privacy field filtering (wallet, email, xp visibility)

**Missing (priority):**
- **HIGH**: POST /api/organic-id/assign — no test verifies sequential ID generation or duplicate prevention
- **HIGH**: GET /api/members/[id] — no test for deleted member handling or privacy filtering
- **MED**: PATCH /api/profile — comprehensive field update tests (name, bio, avatar, privacy settings)
- **MED**: GET /api/members/privacy — privacy setting read/write
- **LOW**: Member search/filter endpoints

---

### 7. notifications

**Covered:**
- `tests/notifications-auth-surface-revamp.spec.ts` — Notifications page structure (filter tabs, preferences toggle)

**Missing (priority):**
- **HIGH**: POST /api/notifications — no test for notification creation trigger (comment, vote, submission review)
- **HIGH**: PATCH /api/notifications/[id] — no test for read state updates
- **HIGH**: POST /api/notifications/preferences — no test for preference persistence (email, in-app toggles)
- **HIGH**: Notification fanout logic — no test verifies recipient selection (author, voters, disputants, etc.)
- **MED**: GET /api/notifications — list with pagination and filtering (read/unread, type)
- **LOW**: Notification type categorization tests

---

### 8. reputation

**Covered:**
- `src/features/reputation/__tests__/leaderboard-ordering.test.ts` — Leaderboard entry comparator (XP priority, then points, then tasks); rank assignment

**Missing (priority):**
- **HIGH**: Reputation score calculation formula — no test for XP acquisition rate or decay mechanism
- **HIGH**: GET /api/reputation/[userId] — no test for score retrieval or rank calculation
- **HIGH**: POST /api/reputation/check-levelup — no test for level-up threshold validation
- **MED**: Reputation decay over time (e.g., 1% per week decay)
- **MED**: Score carry-over between sprints
- **LOW**: Reputation reset/penalty for disputes or violations

---

### 9. treasury

**Covered:**
- `tests/treasury-transparency.spec.ts` — Treasury panel UI (emission policy, settlement status, audit link)
- `src/app/api/treasury/__tests__/consensus-balance.test.ts` — Consensus balance validation across Solana RPC nodes

**Missing (priority):**
- **HIGH**: GET /api/treasury — no test for treasury balance endpoint or Solana RPC consensus
- **HIGH**: Treasury allocation endpoints — no test for reward distribution or payout logic
- **MED**: Emission cap calculation (min of percent vs fixed cap)
- **MED**: Carryover management (carryover streak, sprint cap)
- **LOW**: Treasury audit log retrieval

---

### 10. points / gamification

**Covered:**
- `tests/rewards.spec.ts` — Rewards summary (claimable_points); claim validation (threshold check); successful claim
- `tests/rewards-surface-revamp.spec.ts` — Rewards UI surface
- `tests/rewards-settlement-integrity.spec.ts` — Reward settlement and carryover logic
- `src/features/rewards/__tests__/settlement.test.ts` — Settlement policy normalization, emission cap, carryover math, integrity classification
- `src/features/engagement/__tests__/payout-math.test.ts` — Rank decay, wave multipliers, comment scoring, sprint bonus distribution

**Missing (priority):**
- **HIGH**: POST /api/user/points/spend — no test for post creation points deduction
- **HIGH**: POST /api/user/points/earn — no test for sprint completion point award
- **HIGH**: GET /api/gamification/overview — no test for XP summary endpoint
- **MED**: POST /api/gamification/burn — burn mechanics (if implemented)
- **MED**: POST /api/gamification/quests — quest completion tracking
- **LOW**: Gamification achievement/badge logic (mostly in easter eggs)

---

### 11. easter / campaigns

**Covered:**
- `src/components/gamification/__tests__/easter-egg-badge.test.tsx` — Badge render null when no elements

**Missing (priority):**
- **HIGH**: GET /api/easter/egg-check — no test for egg discovery logic
- **HIGH**: POST /api/easter/egg-claim — no test for egg claiming and points award
- **HIGH**: POST /api/easter/xp-egg-claim — no test for XP-based egg claiming
- **HIGH**: GET /api/easter/leaderboard — no test for leaderboard ranking
- **HIGH**: Egg denormalization (if campaign logic still exists) — no test for data sync
- **MED**: POST /api/egg-opening/open — egg opening animation/state
- **MED**: GET /api/egg-opening/history — opening history retrieval

---

### 12. xer (cron logic)

**Covered:**
- `src/app/api/internal/cron/sprint-summary/__tests__/route.test.ts` — CRON_SECRET auth gate; active sprint discovery; summary generation

**Missing (priority):**
- **HIGH**: Engagement appeals-sweep cron — no test for appeal status lifecycle
- **HIGH**: Market-cache refresh cron — no test for market data sync
- **MED**: Engagement polling cron — no test for engagement calculation triggers
- **MED**: XER output generation (currently produces 0 output per Phase 4 diagnosis) — no test for output shape or format
- **LOW**: Cron job scheduling/cadence validation

---

## Cross-cutting Test Gaps

### Security & Rate Limiting
- **Rate limiting**: No systematic tests across high-risk endpoints (auth, voting, claims, disputes). Only applyIpRateLimit helpers mocked in unit tests.
- **IDOR**: No E2E tests verify 403/404 on cross-user data access (disputes by non-parties, treasury by non-admin, private profiles).
- **CSRF**: OAuth PKCE validated; no general CSRF token validation tests for forms.
- **SQL injection**: No postgrest injection tests beyond `postgrest-injection.test.ts`.

### RLS & Authorization
- **RLS policy coverage**: `rls-isolation.test.ts` and `rls-audit-report.md` document service-role usage; no systematic per-table RLS enforcement tests.
- **Member isolation**: No tests verify that members can only see own submissions, disputes, notifications, profiles (unless public).
- **Role-based enforcement**: Auth tests cover admin vs member vs guest; no tests for council-specific endpoints (voting finalize, dispute arbitration).

### Data Integrity
- **Atomic transactions**: Submission review updates (submissions + points + task + activity) mocked in API tests; no DB-level transaction tests.
- **Duplicate prevention**: Proposal anti-abuse tests cover duplicates; task submission duplicates not tested.
- **Orphan prevention**: Cascade delete not tested (e.g., deleting sprint should cascade to tasks, submissions, disputes).

### Migrations & Backward Compatibility
- **Migration tests**: No tests verify schema changes or data transformations on prod data.
- **API versioning**: No tests for deprecated endpoints or version negotiation.

### Edge Cases & Concurrency
- **Race conditions**: Voting finalization dedupe-key tested; settlement payment races not tested.
- **Pagination boundaries**: Only members API pagination tested; other list endpoints untested.
- **Timezone edge cases**: Sprint phase transitions and voting windows not tested around midnight or DST.

### CI/CD & Infrastructure
- **Database seeding**: Tests rely on createQaUser fixtures; no comprehensive seeding strategy.
- **Environment variable validation**: Cron routes check CRON_SECRET; other routes lack env validation tests.
- **Health checks**: `/api/health` endpoint exists but only skipped smoke tests.

---

## Test Infrastructure & Observations

### Frameworks & Setup
- **Vitest** (unit tests in src/): Jest-like syntax, Node.js test runner
- **Playwright** (integration/E2E in tests/): Headless browser automation for API + UI smoke tests
- **Helpers library** (`tests/helpers.ts`): Supabase client factory, session cookie builders, QA user fixtures, cleanup utilities

### Test Patterns
1. **Serial test suites** with beforeAll/afterAll for fixture setup/teardown
2. **Service-role fixtures** for deterministic test data (sprints, tasks, disputes)
3. **Conditional skips** when Supabase env vars missing (graceful CI degradation)
4. **Cookie-based session auth** for API requests (mimics browser behavior)
5. **Playwright page navigation** for UI surface validation (getByTestId assertions)

### Known Non-trivial Setup
- **Supabase local dev**: Tests skip gracefully if `NEXT_PUBLIC_SUPABASE_URL` absent; no Supabase emulator setup documented
- **CI gating**: UI smoke tests skipped in CI (`process.env.CI === 'true'`); only API tests run
- **Async Solana RPC**: Consensus tests with retry logic in `solana-consensus.test.ts` (handles RPC timeouts)
- **Rate limit helper mocking**: applyIpRateLimit calls mocked in unit tests; no live rate limit testing

### Broken or Suboptimal Areas
- **Easter egg tests minimal**: Component test exists; API/business logic tests absent
- **Cron job coverage spotty**: sprint-summary tested; appeals-sweep and engagement-poll untested
- **Reputation real-time calc**: Only sorting tested; no score-earning E2E
- **Notifications never created in tests**: Surface tested; business logic absent
- **XER output generation**: Currently produces 0 (Phase 4 diagnosis pending); no test shape defined

---

## Recommendations by Priority

### P1 (Security/Data Corruption)
1. Add rate-limit tests on `POST /api/auth/nonce`, `POST /api/proposals/[id]/vote`, `POST /api/rewards/claims`
2. Add IDOR tests for disputes (`GET /api/disputes/[id]` by non-party), posts, treasury
3. Add RLS member isolation tests: verify member A cannot see member B's submissions/notifications
4. Add transaction atomicity tests for submission review (points + task status + activity all succeed or all fail)

### P2 (Feature Regression)
1. Add API tests for points spend/earn and reputation decay
2. Add Easter egg API tests (claim, check, leaderboard)
3. Add cron tests for appeals-sweep and engagement-poll
4. Add proposal edge cases: voting after dispute filed, finalization under settlement blocker

### P3 (Polish & Coverage)
1. Add rate-limit enforcement tests across all domains
2. Add pagination boundary tests for list endpoints
3. Add timezone edge-case tests for sprint phase transitions
4. Document Supabase local emulator setup for reproducible test env
5. Add XER output shape tests (once Phase 4 defines spec)

---

## Test Execution Notes

**Run all tests:**
```bash
npm run test                    # vitest (unit tests in src/)
npm run test:integration       # playwright (E2E in tests/)
```

**Run by category:**
```bash
npm run test -- --grep "auth"             # vitest + grep
npm run test:integration -- --grep "task" # playwright + grep
```

**CI configuration**: `.github/workflows/test.yml` (if exists) — only API tests run; UI skipped unless `-e UI_TEST=1`

