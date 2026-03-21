# QA Runbook — Organic App (Full Feature Coverage + Revamp Intake)

Manual QA workbook for validating all current features and collecting redesign-ready feedback.
Use this document to run workflow tests, page audits, and capture what works, what does not, and UI improvements.

---

## 1) Setup

| Item | Value |
|---|---|
| Desktop browsers | Chrome + Firefox (latest stable) |
| Mobile browsers | Chrome (Android 12+) + Safari (iOS 16+) |
| Locales | `en`, `pt-PT`, `zh-CN` |
| Recommended viewports | 1440x900 desktop, 768x1024 tablet, 375x812 mobile |
| Required accounts | 1 admin, 1 council, 2 members, 1 guest |
| Optional fixtures | At least 1 active sprint, 1 proposal in each major status, 1 rejected submission for disputes, rewards-enabled org, 1 onboarding-incomplete user, 1 Twitter/X engagement task |
| Supabase target | Manual QA should run against **Main DB** (`dcqfuqjqmqrzycyvutkn`). CI automation runs against **CI DB** (`rrsftfoxcujsacipujrr`). |

---

## 2) Session Header (fill before testing)

- Date:
- Tester:
- Environment URL:
- Branch/commit:
- Locales tested:
- Devices tested:
- Roles tested:
- Session objective: `Release validation / UX revamp / Both`

---

## 3) Scoring + Feedback Capture Rules

### 3.1 Severity
- `S0` = blocker (cannot complete workflow)
- `S1` = major break or severe confusion
- `S2` = moderate friction, workaround exists
- `S3` = polish/consistency issue

### 3.2 QA outcome tags
- `PASS` = expected behavior observed
- `FAIL` = behavior incorrect/broken
- `PARTIAL` = usable but degraded
- `SKIP` = cannot test due fixture/env precondition

### 3.3 Required feedback block for each workflow section

- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

---

## 4) Workflow QA Packs

## 4.1 Auth, Session, and Entry Flows
<!-- qa-status: DONE | severity: S3 | plan: none -->
Routes: `/login`, `/signup`, `/join?ref=CODE`, `/auth/error`, `/auth/callback`.

Use cases:
- [x] `AUTH-01` Guest opens `/login`; form renders and is usable. **PASS, S3**
- [x] `AUTH-02` Guest opens `/signup`; form renders and is usable. **PASS, S3**
- [x] `AUTH-03` Invalid credentials show understandable error copy. **PASS, S3** — fixed: friendly i18n message with recovery guidance replaces raw Supabase error
- [x] `AUTH-04` Member login succeeds and lands on authenticated app surface. **PASS, S3** — fixed: redirect to Home, onboarding skip persisted
- [x] `AUTH-05` Session persists across refresh. **PASS, S3**
- [x] `AUTH-06` Sign-out clears session and protects private routes. **PASS, S3** — fixed: server-side middleware redirect
- [x] `AUTH-07` Protected route redirect works for guest users. **PASS, S3** — fixed: returnTo param support
- [x] `AUTH-08` `/join?ref=CODE` redirects to `/signup?ref=CODE`. **PASS, S3** — re-tested: ref param correctly preserved in redirect
- [x] `AUTH-09` Signup with `ref` param preserves referral context. **PARTIAL, S3** — ref is sent in Supabase signup metadata but no visible UI indicator that referral is applied
- [x] `AUTH-10` `/auth/error` recovery links (login/home) work. **PASS, S3** — re-tested: both CTAs navigate correctly
- [x] `AUTH-11` `/auth/callback` does not dead-end or blank-screen when callback params are missing/invalid. **PASS, S3** — re-tested: gracefully redirects to home
- [x] `AUTH-12` Mobile auth forms have no clipping or unreachable controls. **PASS, S3** — fixed: top-aligned on mobile, centered on desktop

### QA Accounts (permanent fixtures for QA skill)

| Account | Email | Password | Role | Organic ID |
|---|---|---|---|---|
| QA Admin | `qa-admin@organic.test` | `QaAdmin2026!` | admin | 900001 |
| QA Council | `qa-council@organic.test` | `QaCouncil2026!` | council | 900002 |
| QA Member | `qa-member@organic.test` | `QaMember2026!` | member | 900003 |

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-07 | **Re-tested:** 2026-03-21 | **Fixed:** 2026-03-19 | **Cases:** 12/12 (0 skipped) | **Severity:** S3
**Priority fixes:** All prior S1 fixes confirmed working. No functional bugs remaining.
**Top revamp:** Wallet-based auth option, split panel product showcase, real-time username validation
**Plan:** none — recorded only, no plan needed

## 4.2 Global Navigation, Layout, and i18n
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-navigation-qa-revamp.md -->
Routes: global shell across all authenticated pages.

Use cases:
- [x] `NAV-01` Sidebar items render correctly by role (`admin`, `council`, `member`). **PASS, S3** — all 3 roles verified (2026-03-21 re-test)
- [x] `NAV-02` Mobile sidebar exposes the same essential navigation. **PASS, S3** — 2 a11y errors (DialogTitle missing)
- [x] `NAV-03` Active route state is visible and accurate. **PASS, S3** — orange indicator + accent bg consistent
- [x] `NAV-04` Locale switch updates labels/content in current page. **PASS, S3** — EN/PT/ZH all verified
- [x] `NAV-05` Query-bearing links (for example progression source context) keep expected behavior. **PASS, S3** — source context preserved
- [x] `NAV-06` Top-bar actions are discoverable and keyboard reachable. **PASS, S3** — all actions have a11y labels
- [x] `NAV-07` No overlap/collision in nav at 375px and 768px. **PASS, S3** — clean at both breakpoints
- [x] `NAV-08` Role-restricted pages are not discoverable through unauthorized nav paths. **PASS, S3** — proper denial messages

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Re-tested:** 2026-03-21 | **Cases:** 8/8 PASS | **Severity:** S3
**Priority fixes:** Mobile sidebar DialogTitle a11y (NAV-02), settings denial copy (NAV-08)
**Top revamp:** Sidebar section grouping (Linear), Cmd+K command palette (Linear/Vercel), breadcrumbs
**Plan:** `docs/plans/2026-03-21-navigation-qa-revamp.md`

## 4.3 Home, Analytics, Leaderboard, and Treasury Readability
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-home-analytics-treasury.md -->
Routes: `/`, `/analytics`, `/treasury`.

Use cases:
- [x] `INSIGHT-01` Home dashboard loads with trust/summary surfaces. **PARTIAL, S1** — re-tested: 2 missing i18n keys render raw (`Home.trustSprintNoneShort` in Trust Pulse, `dashboard.activity.viewAll` as link text)
- [x] `INSIGHT-02` `/analytics` charts/metrics load without blocking UI. **PASS, S3** — re-tested: 0 console errors, charts render with real data
- [x] `INSIGHT-03` `/leaderboard` redirects to `/community` (Rankings tab). **PASS, S3** — re-tested: redirect works
- [x] `INSIGHT-04` `/treasury` shows settlement posture and transparency metadata. **PASS, S3** — re-tested: 0 console errors, all sections render correctly
- [x] `INSIGHT-05` Empty/loading states are informative, not confusing. **PARTIAL, S3** — $ORG price/market cap show “—“ without explanation
- [x] `INSIGHT-06` Units and labels are understandable (percent, totals, balances). **PASS, S3** — re-tested: clear labels throughout
- [x] `INSIGHT-07` Mobile chart/card readability is acceptable. **PARTIAL, S3** — charts readable once focused; analytics page scroll requires tab click first
- [x] `INSIGHT-08` User can identify a clear “what to do next” action. **PASS, S3** — re-tested: multiple CTAs (Get Started, View Proposals, carousel cards, View Tasks)

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-07 | **Re-tested:** 2026-03-21 | **Cases:** 8/8 | **Severity:** S1
**Priority fixes:** 2 missing i18n keys on home: `Home.trustSprintNoneShort` (Trust Pulse card), `dashboard.activity.viewAll` (activity feed link)
**Top revamp:** Data-dense dashboard cards, time range selectors, mobile scroll fix, $ORG price empty state copy
**Plan:** `docs/plans/2026-03-21-home-analytics-treasury.md`

## 4.4 Community (Rankings + Directory + Profile)
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-community-qa-revamp.md -->
Routes: `/community`, `/community/[id]`.
Redirects: `/members` → `/community`, `/members/[id]` → `/community/[id]`, `/leaderboard` → `/community`.

Use cases:
- [x] `COMM-01` Community loads with dark hero + Rankings tab default. **PASS, S3** — FIXED: i18n keys added, 0 console errors
- [x] `COMM-02` Rankings: podium, your-position, ranked table, search bar works. **PASS, S3** — REVAMPED: keyboard nav, sortable headers, command palette search, skeleton loading
- [x] `COMM-03` Directory: filterable member grid with rank/XP enriched cards. **PASS, S3** — REVAMPED: filter chips with counts, sort dropdown, clear button
- [x] `COMM-04` Tab switching preserves per-tab state (search, filters, pagination). **PASS, S3** — CSS visibility toggle working
- [x] `COMM-05` Rankings row click → `/community/[id]` profile page. **PASS, S3**
- [x] `COMM-06` Directory card click → `/community/[id]` profile page. **PASS, S3**
- [x] `COMM-07` Profile privacy gating works (private vs public profiles). **PARTIAL, S3** — code correct but no private profile fixture
- [x] `COMM-08` `/members` redirects to `/community`. **PASS, S3**
- [x] `COMM-09` `/members/[id]` redirects to `/community/[id]`. **PASS, S3**
- [x] `COMM-10` `/leaderboard` redirects to `/community`. **PASS, S3**
- [x] `COMM-11` Rankings search filters by name, email, and Organic ID. **PASS, S3**
- [x] `COMM-12` All 3 locales (en, pt-PT, zh-CN) render Community correctly. **PASS, S3** — FIXED: all i18n keys present, 0 console errors

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-21 | **Fixed:** 2026-03-21 (81da1e1) | **Revamped:** 2026-03-21 (fb00427) | **Cases:** 12/12 | **Severity:** S3
**Priority fixes:** ~~2 missing Community i18n keys~~ DONE, ~~4 achievement description keys~~ DONE, ~~8 pt-PT/zh-CN profile tab keys~~ DONE, ~~QA script onboarding fix~~ DONE
**Top revamp:** Combined 3 prototypes — contribution heatmap + activity feed (GitHub), keyboard nav + filter counts (Linear), command search + 4-stat cards (Vercel). 25+ i18n keys.
**Plan:** `docs/plans/2026-03-21-community-qa-revamp.md`

## 4.5 My Profile, Privacy Toggle, and Progression Hub
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-profile-progression-fixes-v2.md -->
Routes: `/profile`, `/profile/progression`, `/community/[id]`.

Use cases:
- [x] `PROF-01` Profile identity/activity/preferences sections render. **PASS, S3** — all 10 sections render cleanly on mobile + desktop, 0 console errors on profile page
- [x] `PROF-02` Privacy toggle updates state and message correctly. **PASS, S3** — toggles both directions with correct text, description, and toast notification
- [x] `PROF-03` Progression page opens from profile quick action. **PASS** — opens correctly, 0 console errors. *(Fixed: 67811d2 — quest i18n resolved)*
- [x] `PROF-04` Progression source context (`?from=tasks|proposals|profile`) behaves correctly. **PASS** — correct banner text and back link, 0 i18n errors. *(Fixed: 67811d2)*
- [x] `PROF-05` XP/level/next-step context is understandable. **PASS** — stat cards, progress bar, achievements, rewards readiness all work; quest titles resolve correctly via API title fallback. Achievement name `peacemaker` also fixed. *(Fixed: 5a76747, 67811d2)*
- [x] `PROF-06` Fallback messaging is useful when progression data is sparse. **PARTIAL, S3** — good empty states: "No active streak", "No XP earned yet", "Keep contributing to reach Level 2", "You need 100 more points to submit a claim"
- [x] `PROF-07` Mobile layout keeps cards/actions usable. **PARTIAL, S3** — clean single-column layout, proper spacing, touch targets adequate
- [x] `PROF-08` Twitter/X account link/unlink controls in profile work and persist state. **PASS** — connect button opens Twitter OAuth. *(Fixed: 5a76747 — empty body replaced with `JSON.stringify({})`)*
- [x] `PROF-09` OAuth callback return parameters (`twitter_linked`, `twitter_error`) surface clear feedback on profile. **PASS, S3** — FIXED: `?twitter_linked=1` shows "Twitter/X account linked successfully!", `?twitter_linked=0&reason=auth_failed` shows "Failed to link Twitter/X account (auth_failed)". URL params cleaned after display
- [x] `PROF-10` Onboarding progress shortcut in top bar dropdown appears only for incomplete users. **PASS, S3** — avatar dropdown shows "Setup Progress 1/4", clicking opens onboarding wizard
- [x] `COMM-PROF` Community profile page renders member data correctly. **FAIL, S1** — 58 console errors, tab labels show raw keys (`Community.profileTabOverview`, `.profileTabReputation`, `.profileTabAchievements`, `.profileTabActivity`), section header `Community.quickGlance` also raw key. Missing i18n keys in Community namespace for the profile detail page

### Feedback
<!-- Re-tested: 2026-03-20 | QA accounts: qa-admin, qa-council, qa-member (created via scripts/create-qa-accounts.ts) -->
**Tested:** 2026-03-20 | **Cases:** 11/11 (10 PROF + 1 COMM-PROF) | **Severity:** S1

**What works well:**
- Profile page (/profile): all 10 sections render, 0 console errors, clean mobile + desktop layout (PROF-01)
- Privacy toggle works both directions with toast feedback (PROF-02)
- Progression stat cards, progress bar, quest grouping, achievement catalog, rewards readiness, empty states all functional (PROF-03-07)
- Source context banners adapt correctly to `?from=` param (PROF-04)
- OAuth callback params now work: success + error toasts fire and URL cleans up (PROF-09) — previously S1 FAIL, now PASS
- Onboarding shortcut in avatar dropdown works (PROF-10)
- QA accounts created and functional (admin/council/member with correct roles + organic IDs)

**What does not work:**
- **Quest i18n keys still broken (S1):** All 9 quest titles/descriptions render raw UUID-based keys on progression page. DB quests use UUIDs but locale files use slug keys. The `resolveQuestTitle` fallback to `quest.title` fires but the DB `title` field is null/empty for these quests. **38 console errors per page load.** (PROF-05)
- **Twitter/X connect still broken (S1):** Profile page sends empty POST body to `/api/twitter/link/start`. `parseJsonBody` helper rejects the empty request → 400 "Invalid request payload". Fix: send `body: JSON.stringify({})` from profile page, or make `parseJsonBody` tolerate empty bodies. (PROF-08)
- **Community profile i18n broken (S1):** `/community/[id]` page uses ~10 Community namespace keys that don't exist in locale files: `quickGlance`, `profileTabOverview`, `profileTabReputation`, `profileTabAchievements`, `profileTabActivity`, `activityComingSoon`, etc. **58 console errors.** (COMM-PROF)
- **1 achievement i18n key missing:** `Reputation.achievementNames.peacemaker` renders as raw key on progression page. (PROF-05)

**Top 3 highest-impact changes:**
1. **Fix quest i18n resolution** — populate DB quest titles OR add UUID-keyed entries to locale files. 9 quests unreadable, 38 errors/page. (PROF-05, S1)
2. **Fix Twitter/X connect** — send JSON body from profile page or tolerate empty body in parseJsonBody. (PROF-08, S1)
3. **Fix Community profile i18n** — add ~10 missing Community.* keys to all 3 locale files. 58 errors/page. (COMM-PROF, S1)

**Section severity:** S1
**Confidence score:** 5/5 (11/11 tested with live QA accounts, 3 viewports, 3 roles)

## 4.6 Quests, Referrals, and Gamification Controls
<!-- qa-status: DONE | severity: S1 | plan: docs/plans/2026-03-21-quests-qa-revamp.md -->
Routes: `/quests`, `/join?ref=CODE`, `/signup?ref=CODE`, `/admin/settings` (Gamification tab), `/profile/progression`.

Use cases:
- [x] `GAM-01` Member opens `/quests` and sees referral + quests surfaces. **PASS** — both surfaces render, 0 errors. Dark theme tokens applied throughout. *(Revamped: d736cbd)*
- [x] `GAM-02` Quest tabs (`in_progress`, `done`, `all`) filter correctly. **PASS** — tabs work, empty state uses design tokens.
- [x] `GAM-03` Referral code/link generation and copy actions work. **PASS** — copy link/code functional.
- [x] `GAM-04` Referral link redirect flow works via `/join?ref=...`. **PASS** — redirects to `/signup?ref=CODE`.
- [x] `GAM-05` Referral completion updates stats/cards. **PARTIAL, S3** — stats render (0s), can't test full flow. *(Revamped: tier stepper with Bronze→Silver→Gold)*
- [x] `GAM-06` Burn-level flow handles enabled/disabled modes correctly. **PASS** — burn button conditionally shown; auto-level info card when disabled. *(Revamped: d736cbd)*
- [ ] `GAM-07` Burn confirm dialog math (from level/to level/points) is correct. **SKIP** — burn disabled in config. *(Dialog dark-themed: d736cbd)*
- [x] `GAM-08` Quests data remains coherent with progression context. **PASS** — 0 i18n errors on progression page. *(Fixed: 67811d2 — resolveQuestTitle prefers API title)*
- [x] `GAM-09` Admin gamification settings and quest controls are accessible to admin only. **PASS** — admin-only, quest CRUD visible.
- [x] `GAM-10` Localized copy for quests/referrals is valid in `en`, `pt-PT`, `zh-CN`. **PASS** — labels translate, quest titles DB-driven.
- [x] `GAM-11` Mobile quest cards/filters/referral surface remain usable. **PASS** — dark theme tokens, progress rings, tier stepper all responsive. *(Revamped: d736cbd)*

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-21 | **Cases:** 9/11 PASS, 1 PARTIAL, 1 SKIP | **Severity:** S1
**Fixed (67811d2):** Quest UUID i18n errors — `resolveQuestTitle()` now prefers API title over i18n lookup, 0 console errors.
**Revamped (d736cbd):** Duolingo-inspired Proto A — SVG progress rings with category colors (blue/purple/amber/emerald), tier stepper (Bronze→Silver→Gold) with glow, level ring sidebar, conditional burn button, dark theme tokens throughout. All hardcoded `bg-white`/`text-gray-900` replaced.
**Plan:** `docs/plans/2026-03-21-quests-qa-revamp.md`

## 4.7 Tasks End-to-End Workflow (Creation -> Claim -> Submit -> Review)
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-08-tasks-qa-revamp.md -->
Routes: `/tasks`, `/tasks/[id]`, `/tasks/templates`, `/admin/submissions`.

Use cases:
- [ ] `TASK-01` Admin creates task from task modal/new flow.
- [ ] `TASK-02` Member can discover tasks using search/filter/sort.
- [ ] `TASK-03` Member claim/unclaim behavior is correct (respecting dependencies/rules).
- [ ] `TASK-04` Task detail explains status, acceptance criteria, points, and assignee context.
- [ ] `TASK-05` Member submission form works for expected task type.
- [ ] `TASK-06` Submission moves task toward review state.
- [ ] `TASK-07` Reviewer/admin approves submission successfully.
- [ ] `TASK-08` Reviewer/admin rejects submission with required reason.
- [ ] `TASK-09` Review queue (`/admin/submissions`) shows pending submissions and updates after actions.
- [ ] `TASK-10` Dependency picker add/remove behaves correctly.
- [ ] `TASK-11` Subtask creation/list/progress behavior is correct.
- [ ] `TASK-12` Template manager (admin/council) create/edit/delete works.
- [ ] `TASK-13` Template instantiate flow creates task for eligible members.
- [ ] `TASK-14` Proposal-linked task gate enforces finalized+passed provenance where applicable.
- [ ] `TASK-15` Mobile usability is acceptable on list, detail, submission, and review queue.
- [ ] `TASK-16` Twitter/X task creation enforces target URL + engagement config requirements.
- [ ] `TASK-17` Twitter/X task submission requires linked account and validates engagement context messaging.

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-08 | **Fixed:** 2026-03-14 (commit 3aed048) | **Cases:** 17/17 (code review + partial live) | **Severity:** S3
**Priority fixes:** ~~Silent error handling S0 (TASK-04)~~ DONE — error toasts surfaced, ~~hardcoded locale S0 (TASK-04)~~ DONE — locale-aware dates, ~~emoji icons S1 (TASK-02)~~ DONE — normalized labels with i18n display
**Top revamp:** Error states, loading skeletons, semantic table markup, confirmation dialogs
**Plan:** `docs/plans/2026-03-08-tasks-qa-revamp.md`

## 4.8 Sprints End-to-End Workflow (Planning -> Completed)
<!-- qa-status: DONE | severity: S1 | plan: docs/plans/2026-03-21-sprints-qa-revamp.md | merged: main (7ef0c54) -->
Routes: `/sprints`, `/sprints/[id]`, `/sprints/past`.

Use cases:
- [x] `SPR-01` Admin creates a sprint. **PASS, S3** — Create modal opens and has all fields (name, goal, dates, status, capacity). Form works correctly. Member/council correctly hidden.
- [x] `SPR-02` Admin starts sprint from planning. **PASS, S3** — "Start Sprint" button visible for admin/council when sprint is in planning. Start dialog exists.
- [x] `SPR-03` Sprint transitions to `review` via completion action. **PASS, S3** — "Advance to Review" button visible on active sprint for admin/council. Click triggers transition.
- [x] `SPR-04` Sprint transitions to `dispute_window`. **SKIP** — No sprint in review phase to test. Code path exists (phase engine tested).
- [x] `SPR-05` Dispute-window timing constraints are communicated. **PASS, S3** — Countdown badge with Timer icon shows "Phase time remaining" when deadline exists. Review/dispute phases supported.
- [x] `SPR-06` Sprint transitions to `settlement` only when valid. **SKIP** — No sprint in dispute_window to test. Code path exists.
- [x] `SPR-07` Settlement blockers and reasons are visible/understandable. **PASS, S3** — Settlement panel renders with "Open execution: N" and "Blocked: N" as GitHub-style badges. i18n key fixed, 0 console errors.
- [x] `SPR-08` Sprint transitions to `completed` when integrity conditions are satisfied. **PASS, S3** — Complete dialog exists with stats, incomplete task handling options (backlog/next sprint), readiness checklist on detail page.
- [x] `SPR-09` Sprint detail timeline/rail surfaces current phase clearly. **PASS, S3** — Phase timeline sidebar on detail page shows all 6 phases with clear current/complete/awaiting indicators. Readiness checklist with 4 checks.
- [x] `SPR-10` Past sprints page is navigable and understandable. **PASS, S3** — `/sprints/past` redirects to `?view=timeline`. Timeline view with vertical line, date badges, status pills. Sprint List view also shows Past Sprints section.
- [x] `SPR-11` Mobile sprint list/detail remain usable. **PASS, S3** — Board columns now horizontal-scroll with snap on mobile. i18n key fixed. All content accessible at 375px.

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-21 | **Cases:** 9/11 (2 skipped) | **Severity:** S3 (S1 fixed)
**Fixes applied:** i18n key `Sprints.metricOpenExecution` added. 0 console errors.
**Revamp applied:** Full 9-component GitHub-inspired overhaul (7ef0c54) — milestone cards, phase stepper, burndown gridlines, orange theme, muted success states, horizontal mobile board.
**Plan:** `docs/plans/2026-03-21-sprints-qa-revamp.md`

## 4.9 Proposals and Governance Workflow
<!-- qa-status: DONE | severity: S2 | plan: docs/plans/2026-03-19-proposals-qa-revamp.md | merged: main -->
Routes: `/proposals`, `/proposals/new`, `/proposals/[id]`.

Use cases:
- [x] `PROP-01` Member creates proposal draft/public submission. **PARTIAL, S2** — wizard works but tab labels truncate on mobile
- [x] `PROP-02` Proposal list shows governance signal/context correctly. **PARTIAL, S2** — garbage test data, admin CTA shown to members, count off-by-one
- [x] `PROP-03` Proposal detail renders structured sections clearly. **PARTIAL, S2** — Decision Rail hidden/buried on mobile
- [x] `PROP-04` Proposal comments can be posted and read. **PARTIAL, S2** — no display name, only avatar initial + Organic ID
- [x] `PROP-05` Stage transitions are forward-only and clearly communicated. **PARTIAL, S2** — no transition history visible
- [x] `PROP-06` Start voting works for authorized role only. **PARTIAL, S2** — works but finalize lacks attempt limit info
- [x] `PROP-07` Vote eligibility and effective power are understandable. **PARTIAL, S2** — no token holder messaging for disconnected wallet
- [x] `PROP-08` Casting vote succeeds/fails with clear feedback. **PARTIAL, S2** — sticky Vote button visible when voting closed
- [x] `PROP-09` Finalize voting behaves idempotently. **PARTIAL, S2** — no execution deadline shown
- [x] `PROP-10` Freeze and resume semantics are understandable to operators. **PARTIAL, S2** — good UX but missing max attempt count
- [x] `PROP-11` Execution-window messaging for passed proposal is clear. **PARTIAL, S2** — no execution deadline surfaced
- [x] `PROP-12` Proposal templates are usable (if enabled/configured). **SKIP** — not implemented
- [x] `PROP-13` Mobile readability and action placement are acceptable. **PARTIAL, S2** — Vote shown when closed, Decision Rail buried, Follow duplicated
- [x] `PROP-14` Proposal threshold gate blocks under-threshold proposers with clear reason. **PASS, S3**
- [x] `PROP-15` Anti-abuse cooldown/one-live-proposal guard is enforced and explained. **PASS, S3**
- [x] `PROP-16` Passed proposal finalize path remains usable under execution-window degraded mode (`PGRST204`) with non-blocking warning behavior. **PARTIAL, S2** — code exists but untestable locally
- [x] `PROP-17` Proposal detail shows source-idea badge/link when `source_idea_id` is present. **PARTIAL, S2** — code exists but no test data to verify visually

### Feedback
<!-- Full feedback archived in git history + plan file. Summary below. -->
**Tested:** 2026-03-19 | **Cases:** 15/17 (1 skipped) | **Severity:** S2
**Priority fixes:** Sticky Vote button shown when voting closed (mobile), garbage localhost:3003 test data, no execution deadline display, onboarding modal not persisting dismissal (cross-cutting S1)
**Top revamp:** Decision Rail collapsible on mobile, sticky bar rationalization, wizard tab labels, role-aware CTAs, comment display names, stage transition history
**Plan:** `docs/plans/2026-03-19-proposals-qa-revamp.md`

## 4.10 Disputes Workflow (File -> Evidence -> Resolve/Appeal)
<!-- qa-status: PENDING -->
Routes: `/disputes`, `/disputes/[id]`.

Use cases:
- [ ] `DISP-01` Eligible member can file dispute from rejected submission flow.
- [ ] `DISP-02` Queue page filters/tabs (`queue`, `mine`) work correctly.
- [ ] `DISP-03` Detail page shows status/tier/SLA/evidence chronology.
- [ ] `DISP-04` Comment thread add/list works and rejects empty content.
- [ ] `DISP-05` Evidence upload accepts allowed file types and blocks unsupported ones.
- [ ] `DISP-06` Late evidence is tagged correctly.
- [ ] `DISP-07` Uploads are blocked after dispute window closes.
- [ ] `DISP-08` Mediate/assign/respond actions enforce role constraints.
- [ ] `DISP-09` Resolve action shows XP impact estimate and summary.
- [ ] `DISP-10` Withdraw flow works for disputant when allowed.
- [ ] `DISP-11` Appeal path works for appeal-eligible outcomes.
- [ ] `DISP-12` Unauthorized users cannot access restricted dispute details.
- [ ] `DISP-13` Mobile queue/detail controls remain usable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.11 Rewards and Claim Workflow
<!-- qa-status: PENDING -->
Routes: `/rewards`, `/admin/rewards`.

Use cases:
- [ ] `RWD-01` Member rewards summary loads with claimability data.
- [ ] `RWD-02` Claim below threshold is blocked with clear reason.
- [ ] `RWD-03` Claim with invalid values is blocked with clear reason.
- [ ] `RWD-04` Valid claim submits successfully.
- [ ] `RWD-05` Claim status progression is visible and understandable.
- [ ] `RWD-06` Admin rewards page surfaces pending review/triage clearly.
- [ ] `RWD-07` Admin payout guardrails and warning copy are clear.
- [ ] `RWD-08` Held/killed settlement posture is communicated clearly on rewards surfaces.
- [ ] `RWD-09` Mobile rewards surface remains usable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.12 Notifications Workflow
<!-- qa-status: PENDING -->
Routes: `/notifications`.

Use cases:
- [ ] `NOTIF-01` Notifications page loads with expected filters/tabs.
- [ ] `NOTIF-02` Mark-as-read action updates item state.
- [ ] `NOTIF-03` Follow/unfollow notification action behaves correctly.
- [ ] `NOTIF-04` Preferences save and persist after reload.
- [ ] `NOTIF-05` Empty and error states are informative.
- [ ] `NOTIF-06` Mobile card readability and action hit targets are acceptable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.13 Admin Ops Workflow (Settings, Submission Queue, Rewards Ops)
<!-- qa-status: PENDING -->
Routes: `/admin/settings`, `/admin/submissions`, `/admin/rewards`.

Use cases:
- [ ] `ADM-01` Non-admin cannot access admin pages.
- [ ] `ADM-02` Admin settings page tabs load and switch without stale state.
- [ ] `ADM-03` Settings updates require reason where audit policy enforces it.
- [ ] `ADM-04` Settings update produces user-understandable success/failure messages.
- [ ] `ADM-05` Admin submissions queue supports daily review operations.
- [ ] `ADM-06` Admin rewards surface supports payout triage safely.
- [ ] `ADM-07` Risky controls include clear warning context.
- [ ] `ADM-08` Tablet/mobile admin usability is acceptable for critical actions.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.14 Error Resilience and Health
<!-- qa-status: PENDING -->
Routes: invalid app routes, major API-backed pages, `/api/health`.

Use cases:
- [ ] `ERR-01` Invalid route shows safe fallback (`not-found`) and navigation out.
- [ ] `ERR-02` Network/API failures show actionable UI errors (not silent failure).
- [ ] `ERR-03` Long loading states provide feedback and do not freeze interactions.
- [ ] `ERR-04` `/api/health` reports healthy status in target environment.
- [ ] `ERR-05` Unauthorized API interactions fail safely (401/403) with clear UX impact.
- [ ] `ERR-06` Mobile error states remain readable and recoverable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.15 Locale and Accessibility Pass (Cross-Workflow)
<!-- qa-status: PENDING -->
Scope: Run this pass on core routes after completing workflow checks.

Use cases:
- [ ] `L10N-01` Validate critical flows in `en`.
- [ ] `L10N-02` Validate critical flows in `pt-PT`.
- [ ] `L10N-03` Validate critical flows in `zh-CN`.
- [ ] `A11Y-01` Keyboard-only navigation works for primary workflows.
- [ ] `A11Y-02` Focus states are visible and logical.
- [ ] `A11Y-03` Modal/dialog close behavior works via keyboard.
- [ ] `A11Y-04` Form validation messages are announced/visible near fields.
- [ ] `A11Y-05` Color contrast and visual hierarchy are acceptable for dense data surfaces.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.16 Operational Controls (Automated Evidence)
<!-- qa-status: PENDING -->

Goal: verify governance and rewards safety controls with reproducible evidence.

Pre-flight:
- [ ] `.env.local` includes Supabase URL/anon key/service role key.
- [ ] CI-mode base URL can boot successfully.
- [ ] Admin and council fixture users can be created.

Execution command:

```bash
set -a; source .env.local; set +a
CI=true npx playwright test \
  tests/voting-integrity.spec.ts \
  tests/rewards-settlement-integrity.spec.ts \
  --workers=1 --reporter=list
```

Fallback (when CI webServer startup is not viable locally):

```bash
# terminal A
set -a; source .env.local; set +a
npm run dev -- --hostname 127.0.0.1 --port 3100

# terminal B
set -a; source .env.local; set +a
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test \
  tests/voting-integrity.spec.ts \
  tests/rewards-settlement-integrity.spec.ts \
  --workers=1 --reporter=list
```

Expected assertions:
- [ ] Rewards hold path returns `EMISSION_CAP_BREACH` and sprint status `held`.
- [ ] Rewards kill-switch path returns `SETTLEMENT_KILL_SWITCH` and sprint status `killed`.
- [ ] `reward_settlement_events` contains `integrity_hold` and `kill_switch` rows.
- [ ] Voting finalization freeze path returns `FINALIZATION_FROZEN` behavior.
- [ ] `proposal_stage_events` contains `finalization_kill_switch` with dedupe and attempt metadata.
- [ ] Manual recovery simulation (`finalization_manual_resume`) finalizes successfully.

Evidence capture checklist:
- [ ] Attach command output (or CI job URL).
- [ ] Record proposal id used for freeze/recovery validation.
- [ ] Record sprint id used for hold/kill-switch validation.
- [ ] Export latest matching audit rows with timestamp.

Audit queries:

```sql
select
  sprint_id,
  event_type,
  reason,
  idempotency_key,
  metadata,
  created_by,
  created_at
from reward_settlement_events
where sprint_id = '<SPRINT_ID>'
order by created_at desc;
```

```sql
select
  proposal_id,
  reason,
  from_status,
  to_status,
  actor_id,
  metadata,
  created_at
from proposal_stage_events
where proposal_id = '<PROPOSAL_ID>'
  and reason in ('finalization_kill_switch', 'finalization_manual_resume')
order by created_at desc;
```

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.17 Onboarding Wizard and Progress APIs
<!-- qa-status: PENDING -->
Routes: top-bar onboarding shortcut, onboarding modal, `/api/onboarding/steps`, `/api/onboarding/steps/:step/complete`.

Pre-flight:
- [ ] Test user has `user_profiles.onboarding_completed_at IS NULL`.
- [ ] At least one task and one active sprint exist for step completion checks.

Use cases:
- [ ] `ONB-01` Incomplete user sees onboarding wizard auto-open on first authenticated app load.
- [ ] `ONB-02` Wizard step order is `connect_wallet -> verify_token -> pick_task -> join_sprint`.
- [ ] `ONB-03` `GET /api/onboarding/steps` returns all four step keys with accurate completion state.
- [ ] `ONB-04` `connect_wallet` completion fails with clear error when wallet is not linked.
- [ ] `ONB-05` `verify_token` completion fails with clear error when Organic ID is missing.
- [ ] `ONB-06` `pick_task` completion enforces assigned-task requirement.
- [ ] `ONB-07` `join_sprint` completion enforces assigned-task-in-sprint requirement.
- [ ] `ONB-08` Completed steps remain completed after page reload and session refresh.
- [ ] `ONB-09` Re-posting completion for an already completed step is idempotent and does not duplicate XP award.
- [ ] `ONB-10` When all steps complete, onboarding shortcut disappears and profile `onboarding_completed_at` behavior is coherent.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.18 Twitter/X Linking and Engagement Verification Workflow
<!-- qa-status: PENDING -->
Routes: `/profile`, `/tasks/[id]` (Twitter task type), `/api/twitter/link/start`, `/api/twitter/link/callback`, `/api/twitter/account`.

Pre-flight:
- [ ] Twitter/X app credentials and callback URL are configured in environment.
- [ ] At least one task of type `twitter_engagement` exists.

Use cases:
- [ ] `TW-01` Profile Twitter/X linking card renders proper linked vs unlinked state.
- [ ] `TW-02` Start-link action redirects to Twitter/X auth and returns to app callback safely.
- [ ] `TW-03` Callback success state (`twitter_linked=1`) is surfaced to user with success feedback.
- [ ] `TW-04` Callback error state (`twitter_error`) is surfaced with understandable failure reason.
- [ ] `TW-05` `GET /api/twitter/account` reflects latest linked account metadata after callback.
- [ ] `TW-06` Unlink action removes account and updates profile state without stale UI.
- [ ] `TW-07` Twitter task submission blocks when account is unlinked and shows clear call-to-action.
- [ ] `TW-08` Twitter task submission context validates task config and handles missing config safely.
- [ ] `TW-09` Twitter task connect/disconnect controls inside submission form stay in sync with profile linkage.
- [ ] `TW-10` Successful Twitter task submission captures expected metadata/evidence.
- [ ] `TW-11` Role guardrails for Twitter-task review actions remain correct on admin/reviewer surfaces.
- [ ] `TW-12` Mobile behavior for link/unlink and Twitter task submission remains usable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.19 Ideas Incubator Workflow (Feature-Flagged)
<!-- qa-status: PENDING -->
Routes: `/ideas`, `/ideas/[id]`, `/api/ideas`, `/api/ideas/:id`, `/api/ideas/:id/vote`, `/api/ideas/:id/comments`, `/api/ideas/kpis`.

Pre-flight:
- [ ] Feature flag enabled (`NEXT_PUBLIC_IDEAS_INCUBATOR_ENABLED=true` or no falsey override).
- [ ] Ideas schema/tables are available in target environment.
- [ ] Test users include: member with Organic ID, member without Organic ID, admin/council.
- [ ] At least one open promotion cycle row exists for winner-selection coverage.

Use cases:
- [ ] `IDEA-01` `/ideas` loads feed, sort tabs, search, KPI strip, and weekly spotlight without layout breakage.
- [ ] `IDEA-02` Organic ID member can create an idea; title/body validation boundaries are enforced.
- [ ] `IDEA-03` Member without Organic ID is blocked from create with clear messaging.
- [ ] `IDEA-04` Vote toggle behavior is idempotent (`up/down` repeat clears to neutral) and score updates remain coherent.
- [ ] `IDEA-05` Self-vote is blocked with explicit error message.
- [ ] `IDEA-06` Comment creation requires Organic ID and rejects empty payloads.
- [ ] `IDEA-07` Idea detail page renders author, status, body, score breakdown, and comments chronology correctly.
- [ ] `IDEA-08` Author edit permissions are enforced; non-author/non-admin edits are rejected.
- [ ] `IDEA-09` Admin/council moderation capabilities behave as expected for editable idea fields.
- [ ] `IDEA-10` Feature-flag disabled posture returns safe fallback UX (`not found` / disabled panel).
- [ ] `IDEA-11` API responses fail safely when ideas backend schema is unavailable (clear error/no crash).
- [ ] `IDEA-12` Mobile usability is acceptable for feed cards, vote rail, composer, and detail discussion.
- [ ] `IDEA-13` Admin/council can promote an idea to proposal (`POST /api/ideas/:id/promote`) and receives linked proposal id.
- [ ] `IDEA-14` Promotion cycle winner selection endpoint (`POST /api/ideas/cycles/:id/select-winner`) supports explicit and auto-computed winner paths.
- [ ] `IDEA-15` Promoted proposal detail shows source-idea badge/link back to ideas detail.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

---

## 5) Page-by-Page Audit Matrix (Granular Route Review)

Use this matrix after workflow testing to capture page-specific UX observations.

Legend:
- Smoke = `PASS / FAIL / PARTIAL / SKIP`
- UX score = `1 (poor) -> 5 (excellent)`

| Route | Workflow Ref | Smoke | UX score | What works | What does not | UI improvements |
|---|---|---|---|---|---|---|
| `/` | 4.3 | | | | | |
| `/analytics` | 4.3 | | | | | |
| `/treasury` | 4.3 | | | | | |
| `/login` | 4.1 | | | | | |
| `/signup` | 4.1 | | | | | |
| `/join?ref=CODE` | 4.1 / 4.6 | | | | | |
| `/auth/error` | 4.1 | | | | | |
| `/auth/callback` | 4.1 | | | | | |
| `/community` | 4.4 | | | | | |
| `/community/[id]` | 4.4 | | | | | |
| `/members` (redirect) | 4.4 | | | | | |
| `/members/[id]` (redirect) | 4.4 | | | | | |
| `/leaderboard` (redirect) | 4.4 | | | | | |
| `/profile` | 4.5 | | | | | |
| `/profile/progression` | 4.5 | | | | | |
| `/ideas` | 4.19 | | | | | |
| `/ideas/[id]` | 4.19 | | | | | |
| `Onboarding wizard modal (global)` | 4.17 | | | | | |
| `Twitter/X link flow (profile + callback)` | 4.18 | | | | | |
| `/quests` | 4.6 | | | | | |
| `/tasks` | 4.7 | | | | | |
| `/tasks/[id]` | 4.7 | | | | | |
| `Twitter/X engagement submission in task detail` | 4.18 | | | | | |
| `/tasks/templates` | 4.7 | | | | | |
| `/admin/submissions` | 4.7 / 4.13 | | | | | |
| `/sprints` | 4.8 | | | | | |
| `/sprints/[id]` | 4.8 | | | | | |
| `/sprints/past` | 4.8 | | | | | |
| `/proposals` | 4.9 | | | | | |
| `/proposals/new` | 4.9 | | | | | |
| `/proposals/[id]` | 4.9 | | | | | |
| `/disputes` | 4.10 | | | | | |
| `/disputes/[id]` | 4.10 | | | | | |
| `/rewards` | 4.11 | | | | | |
| `/notifications` | 4.12 | | | | | |
| `/admin/settings` | 4.13 | | | | | |
| `/admin/rewards` | 4.11 / 4.13 | | | | | |

---

## 6) Workflow Findings Ticket Template (copy one per issue)

- Ticket ID:
- Workflow section:
- Route(s):
- Role used:
- Device + locale:
- Tier found (`P0/P1/P2`):
- Severity (`S0/S1/S2/S3`):
- What works currently:
- What does not work:
- UI improvement requested:
- Repro steps:
- Expected result:
- Actual result:
- Suggested fix direction:
- Effort estimate (`XS/S/M/L`):
- Owner:

---

## 7) End-of-Session Synthesis (Input for Revamp Planning)

Complete this only after sections 4 and 5 are filled.

- Total workflows run:
- Total pages audited:
- Pass/Fail summary:
- Top 5 friction points:
- Highest-value UI opportunities:
- Repeated UX anti-patterns:
- Most critical blockers (`S0/S1`):
- Quick wins (low effort, high impact):
- Sections requiring full redesign:
- Final UX score (`1-10`):
- Release recommendation: `Go / Go with fixes / No-go`

Revamp input package checklist:
- [ ] Workflow sections filled with "what works / what does not / UI improvements".
- [ ] Page-by-page matrix completed.
- [ ] Findings tickets created for all `S0` and `S1` issues.
- [ ] Top 5 friction points and redesign priorities finalized.
