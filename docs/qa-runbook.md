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
Routes: `/login`, `/signup`, `/join?ref=CODE`, `/auth/error`, `/auth/callback`.

Use cases:
- [x] `AUTH-01` Guest opens `/login`; form renders and is usable. **PASS, S3**
- [x] `AUTH-02` Guest opens `/signup`; form renders and is usable. **PARTIAL, S3**
- [x] `AUTH-03` Invalid credentials show understandable error copy. **PARTIAL, S2**
- [x] `AUTH-04` Member login succeeds and lands on authenticated app surface. **PARTIAL, S2**
- [x] `AUTH-05` Session persists across refresh. **PASS, S3**
- [x] `AUTH-06` Sign-out clears session and protects private routes. **PARTIAL (priority fix), S1**
- [x] `AUTH-07` Protected route redirect works for guest users. **PARTIAL (priority fix), S1**
- [x] `AUTH-08` `/join?ref=CODE` redirects to `/signup?ref=CODE`. **PARTIAL, S3**
- [ ] `AUTH-09` Signup with `ref` param preserves referral context. **SKIP — referral not yet wired to signup flow. Placeholder for when referral integration is built.**
- [x] `AUTH-10` `/auth/error` recovery links (login/home) work. **PARTIAL, S3**
- [x] `AUTH-11` `/auth/callback` does not dead-end or blank-screen when callback params are missing/invalid. **PARTIAL, S3**
- [x] `AUTH-12` Mobile auth forms have no clipping or unreachable controls. **PARTIAL, S2**

### QA Accounts (permanent fixtures for QA skill)

| Account | Email | Password | Role | Organic ID |
|---|---|---|---|---|
| QA Admin | `qa-admin@organic.test` | `QaAdmin2026!` | admin | 900001 |
| QA Council | `qa-council@organic.test` | `QaCouncil2026!` | council | 900002 |
| QA Member | `qa-member@organic.test` | `QaMember2026!` | member | 900003 |

### Feedback

**What works well:**
- Login form renders correctly with all expected fields and clear CTAs (AUTH-01)
- Session persistence across refresh works reliably (AUTH-05)
- Sign-out clears session and redirects to `/login` (AUTH-06 core action)
- `/join?ref=CODE` redirect preserves referral param to `/signup?ref=CODE` (AUTH-08)
- `/auth/error` page provides two clear recovery links that both work (AUTH-10)
- `/auth/callback` never dead-ends — missing params redirect to login, invalid params redirect to error page (AUTH-11)
- Admin route `/admin/settings` shows proper "Access Denied" message with clear copy — gold standard for role gating (AUTH-07)
- Mobile hamburger menu works correctly, sidebar collapses as expected (AUTH-12)
- Touch targets on mobile are adequate for thumb tapping (AUTH-12)
- Signup form has good inline validation hints for password and username upfront (AUTH-02)
- "New to Organic? Create an account" link on login is present and functional (AUTH-01)
- Empty-state copy on profile is helpful: "No bio yet. Click Edit Profile to add one!" (AUTH-05)

**What does not work:**
- Protected route `/profile` shows blank page after sign-out instead of redirecting to `/login` or showing a message (AUTH-06, AUTH-07) — **priority fix**
- Inconsistent auth boundary: `/profile` silently fails, `/tasks` and `/proposals` are fully public with no action gating, `/admin/settings` properly denies — no unified protection model (AUTH-07) — **priority fix**
- Error message "Invalid login credentials" appears in DOM but lacks visual prominence — easy to miss (AUTH-03)
- Post-login redirect goes to `/profile` instead of Home dashboard (AUTH-04)
- Onboarding modal blocks Sign Out — overlay intercepts pointer events, trapping users who want to sign out (AUTH-06)
- Onboarding modal reappears on every page load even after clicking "Skip for now" — skip state not persisted (AUTH-06)
- Onboarding step 1 tells user to "Use the wallet button in the top bar" but the modal blocks access to that button (AUTH-04)
- Page title shows "Next.js" instead of proper page name on authenticated pages (AUTH-04, AUTH-05)
- No visible referral context on signup page when arriving via `/signup?ref=CODE` (AUTH-02, AUTH-08)
- No referral code validation — invalid codes are silently accepted (AUTH-08)
- `/auth/callback` with no params briefly flashes `/profile` before redirecting to `/login` — intermediate redirect flicker (AUTH-11)
- Error param from OAuth provider (`?error=access_denied`) is ignored — same generic message shown (AUTH-11)
- Scroll is trapped in nested container on mobile — `window.scrollBy()` does nothing, only `main` element scrolls (AUTH-12)
- Hero image takes ~50% of mobile viewport, pushing form below fold (AUTH-12)
- Signup "Create account" button requires significant scrolling on mobile (AUTH-12)
- 78 console errors on home page — **separate investigation task needed** (AUTH-10)
- 10-25 console errors on most pages including protected routes and callback flows (AUTH-05, AUTH-06, AUTH-11)

**UI improvements requested:**
- **Login/signup background:** Replace static dark background with interactive blockchain-themed layer — chain links with lighting that follows cursor movement. Premium protocol feel, not animated cartoon. (AUTH-01, AUTH-02)
- **Split layout for auth pages:** Illustration/branding on left, form on right — form always fully visible without scrolling on desktop. (AUTH-02)
- **"Already have an account?" link on signup:** Must be visible near form header, not buried below the fold. (AUTH-02)
- **Live password validation checklist:** Replace static hint text with a dynamic checklist that ticks off requirements as user types (length, number, lowercase). (AUTH-02)
- **Username validation as bullet list:** Break dense hint sentence into short, scannable bullet points or show inline validation as user types. (AUTH-02)
- **Referral landing experience:** `/join` should be a dedicated referral landing page with inviter profile/avatar, pitch about Organic, and "Join Now" CTA. Show "Invited by @username" or "Referral code applied" banner on signup form. (AUTH-08)
- **Error message prominence:** Invalid credentials error should be an inline banner (red/orange, icon) directly above/below form fields, not a fleeting toast. Include recovery path: "The email or password you entered is incorrect. Please try again or [reset your password]." (AUTH-03)
- **Field state change on error:** Add red border or subtle shake animation on email/password fields after failed login. (AUTH-03)
- **Show/hide password toggle:** Let users verify what they typed before retrying. (AUTH-03)
- **Rate-limiting feedback:** After repeated failures, show "Too many attempts. Please wait X seconds or reset your password." (AUTH-03)
- **Post-login redirect to Home:** Land authenticated users on `/` (Home dashboard) not `/profile`. Let onboarding wizard overlay there. (AUTH-04)
- **Onboarding wallet connect inside the step:** Put the wallet connect action inside the onboarding modal step, not as a reference to the top bar button. (AUTH-04)
- **Sidebar grouping:** 17 nav items for admin is dense. Group into sections (e.g., "Admin" section for Submissions/Manage Rewards/Settings) or use collapsible sections. (AUTH-04)
- **Sign-out confirmation:** Show a brief "You've been signed out successfully" message on the login page after sign-out. (AUTH-06)
- **Session expiry handling:** Implement session-expiry interceptor that redirects to `/login` with message "Your session has expired. Please sign in again." (AUTH-06)
- **Protected route redirect with returnTo:** When guest is bounced from protected route, capture destination (e.g., `/login?returnTo=/profile`) so user lands where they wanted after signing in. (AUTH-06, AUTH-07)
- **Guest action gating on public pages:** Tasks and proposals are intentionally public (FOMO/transparency for the coin), but hide action buttons (claim, submit, create proposal) for guests. Show "Sign in to participate" prompts instead. (AUTH-07)
- **Proposals page premium revamp:** Better flow, remove duplicate filters (Public/Qualified/Discussion appear twice), better box highlights, professional look matching organic-ux design system. Tier-one project UX/UI. (AUTH-07)
- **3 parallel design alternatives:** Use frontend-design skill to generate three independent UI designs for key public pages (login, signup, proposals, tasks, home). Pick the best. (AUTH-07)
- **Auth error page warmth:** Add icon/illustration, warmer copy, contextual help ("Common reasons: expired link, cookies blocked"). Parse and display specific error codes from OAuth providers. (AUTH-10, AUTH-11)
- **Callback loading spinner:** Show "Completing sign-in..." with spinner during callback processing instead of page flashes. (AUTH-11)
- **Mobile: hide or shrink hero image:** On mobile viewports, either hide the hero image entirely or cap it at ~120px height so the form is front and center. (AUTH-12)
- **Mobile: consider two-step signup:** Email + Password on step 1, Username on step 2, to reduce scroll length. (AUTH-12)
- **Mobile: auth error excessive white space:** Center error card near top, remove large empty areas above/below. (AUTH-12)
- **Mobile: fix scroll trap:** Ensure page-level scroll works naturally on mobile, not just on a nested overflow element. (AUTH-12)
- **Overall premium look:** Match all auth pages to organic-ux design system colors. Create a style that is more professional, tier-one project quality. Every page that isn't perfect gets revamped. (ALL)
- **Locale prefix in shared URLs:** For referral links shared externally (Twitter, Discord), consider auto-detect locale or cleaner URLs without `/en/` prefix. (AUTH-08)

**Standalone tasks identified:**
- **TASK: Investigate 78 console errors on home page** — Critical performance/stability finding. Likely broken API calls, missing data for unauthenticated users, or hydration issues. Directly impacts the public-facing FOMO experience since guests hit this page first. (AUTH-10)
- **TASK: Console error audit across all pages** — 10-25 errors per page on most routes. Audit, categorize, and fix critical ones before release. (AUTH-05, AUTH-06, AUTH-11)

**Top 3 highest-impact changes:**
1. **Fix protected route blank page + implement unified auth boundary** — `/profile` blank page and inconsistent protection model across routes is the single biggest auth UX issue. Implement proper redirect-to-login with `returnTo` param, and unify which routes are public vs. authenticated vs. role-gated. (AUTH-06, AUTH-07, S1)
2. **Premium auth page revamp with blockchain-themed background** — Login, signup, and error pages need a complete visual uplift: interactive blockchain background, split layout, improved form UX (live validation, error prominence, show/hide password), and organic-ux color system. Generate 3 parallel design alternatives to pick from. (AUTH-01, AUTH-02, AUTH-03, AUTH-12)
3. **Fix onboarding modal blocking + persistence** — Modal traps users, doesn't persist skip state, and references UI it blocks access to. Redesign so sidebar is always accessible, skip state persists across session, and wallet connect action is embedded in the step. (AUTH-04, AUTH-06)

**Section severity:** S1 (due to AUTH-06 and AUTH-07 priority fixes)
**Confidence score:** 4/5 (thorough test of all 12 cases except AUTH-09 which was skipped)

## 4.2 Global Navigation, Layout, and i18n
Routes: global shell across all authenticated pages.

Use cases:
- [x] `NAV-01` Sidebar items render correctly by role (`admin`, `council`, `member`). **PARTIAL, S2**
- [x] `NAV-02` Mobile sidebar exposes the same essential navigation. **PARTIAL, S2**
- [x] `NAV-03` Active route state is visible and accurate. **PASS, S3**
- [x] `NAV-04` Locale switch updates labels/content in current page. **PARTIAL, S2**
- [x] `NAV-05` Query-bearing links (for example progression source context) keep expected behavior. **PARTIAL, S3**
- [x] `NAV-06` Top-bar actions are discoverable and keyboard reachable. **PASS, S3**
- [x] `NAV-07` No overlap/collision in nav at 375px and 768px. **PASS, S3**
- [x] `NAV-08` Role-restricted pages are not discoverable through unauthorized nav paths. **PASS, S3**

### Feedback

**What works well:**
- Active route state is clear and accurate — orange highlight on current page in sidebar (NAV-03)
- Locale switcher works flawlessly: dropdown with flag icons, all content/sidebar/modals translate correctly, URL updates to correct locale prefix (NAV-04)
- Top bar has all essential actions discoverable: hamburger toggle, ID badge with role label, Connect Wallet, notifications bell, search icon, locale switcher (NAV-06)
- No overlap or collision in nav at 375px mobile or 768px tablet viewports (NAV-07)
- Admin pages properly blocked for member role with clear "Access Denied" message (NAV-08)
- Admin nav items (Submissions, Manage Rewards, Settings) correctly hidden from member sidebar (NAV-08)
- Mobile sidebar opens via hamburger, shows all main nav items with icons (NAV-02)
- `/profile/progression?from=tasks` preserves query param in URL correctly (NAV-05)

**What does not work:**
- Onboarding modal reappears on every page navigation and after locale switch — skip state not persisted across pages or locale changes (NAV-02, NAV-04) — **priority fix (cross-cutting, also flagged in 4.1)**
- Admin section (Submissions, Manage Rewards, Settings) visible to both admin AND council roles — Settings should likely be admin-only (NAV-01)
- 17 sidebar items for admin role is very dense — no grouping, no collapsible sections, all items have equal visual weight (NAV-01)
- Council sees Templates nav item but regular member does not — role boundary is correct but undocumented (NAV-01)
- Progression page (`/profile/progression?from=tasks`) shows only skeleton placeholders with no actual content — may be stuck loading or data-empty with no fallback message (NAV-05)
- Page title shows "Next.js" on progression page instead of proper page name (NAV-05)
- Mobile sidebar requires scrolling past Notifications to reach admin section items — admin items are below the fold (NAV-02)
- At 768px tablet, sidebar stays expanded and onboarding modal overlaps partially behind it (NAV-07, minor)
- 72-132 console errors across all 3 role sessions on home page (NAV-01)

**UI improvements requested:**
- **Collapsible sidebar sections:** Group 17 admin items into collapsible sections (e.g., "Main" for Home/Analytics/Treasury/Members, "Work" for Tasks/Templates/Sprints, "Governance" for Proposals/Ideas/Disputes, "You" for Rewards/Quests/Leaderboard/Notifications, "Admin" for Submissions/Manage Rewards/Settings). Consider making the admin section collapsible by default. (NAV-01)
- **Settings route restricted to admin only:** Move Settings out of the council-visible section. Council should see Submissions and Manage Rewards but not Settings. (NAV-01)
- **Onboarding modal skip persistence:** When user clicks "Skip for now", persist skip state in localStorage or cookie so the modal doesn't reappear on every navigation or locale switch. (NAV-02, NAV-04)
- **Progression page empty state:** When no progression data exists, show a helpful message instead of perpetual skeleton loading (e.g., "Complete tasks and proposals to see your progression here"). (NAV-05)
- **Page titles:** All pages should have proper titles instead of "Next.js". Use the page heading or route name. (NAV-05)
- **Mobile admin nav visibility:** On mobile, consider moving admin items into a collapsible "Admin" section that starts collapsed, so members see Profile + Sign Out without scrolling past admin items. (NAV-02)

**Standalone tasks identified:**
- **TASK: Persist onboarding modal skip state** — Cross-cutting issue affecting every authenticated page. Skip state must survive page navigation, locale switches, and session refreshes. Flagged in both 4.1 and 4.2. (NAV-02, NAV-04)
- **TASK: Console error audit** — 72-132 errors per role on home page alone. Overlaps with 4.1 standalone task. (NAV-01)

**Top 3 highest-impact changes:**
1. **Persist onboarding modal skip state** — Modal blocking every page navigation is the single most disruptive nav issue. Affects all roles, all viewports, all locale switches. Fix: persist skip in localStorage, check before showing. (NAV-02, NAV-04, S2)
2. **Collapsible sidebar sections** — 17 flat items is overwhelming for admin. Group into logical sections with collapse/expand. Reduces cognitive load and scroll distance, especially on mobile. (NAV-01, S2)
3. **Settings restricted to admin only + progression empty state** — Tighten role boundary for Settings. Fix progression page to show content or a helpful empty state instead of permanent skeleton. (NAV-01, NAV-05, S3)

**Section severity:** S2 (onboarding modal persistence is the worst issue, no S0/S1 blockers)
**Confidence score:** 5/5 (all 8 cases tested across 3 roles)

**Execution status:** _not started_

## 4.3 Home, Analytics, Leaderboard, and Treasury Readability
Routes: `/`, `/analytics`, `/leaderboard`, `/treasury`.

Use cases:
- [x] `INSIGHT-01` Home dashboard loads with trust/summary surfaces. **FAIL, S1**
- [x] `INSIGHT-02` `/analytics` charts/metrics load without blocking UI. **PARTIAL, S2**
- [x] `INSIGHT-03` `/leaderboard` ranking appears stable and understandable. **PARTIAL, S2**
- [x] `INSIGHT-04` `/treasury` shows settlement posture and transparency metadata. **PARTIAL, S2**
- [x] `INSIGHT-05` Empty/loading states are informative, not confusing. **PARTIAL, S2**
- [x] `INSIGHT-06` Units and labels are understandable (percent, totals, balances). **PASS, S3**
- [x] `INSIGHT-07` Mobile chart/card readability is acceptable. **PARTIAL, S2**
- [x] `INSIGHT-08` User can identify a clear “what to do next” action. **PARTIAL, S3**

### Feedback

**What works well:**
- Leaderboard ranking table is clear and scannable with trophy icon, alternating rows, role badges, and comma-formatted XP values (INSIGHT-03)
- “How Ranking Works” transparency section explains tiebreaker logic clearly (INSIGHT-03)
- Treasury dark gradient hero with trust badges (Secure Custody, Community Governed, Fully Transparent) is visually distinctive and creates a trust/seriousness tone (INSIGHT-04)
- Treasury wallet address with copy button and Solscan link works well (INSIGHT-04)
- Analytics page loads charts progressively without blocking UI (INSIGHT-02)
- Home hero banner is personalized per user with Organic ID and clear CTAs (INSIGHT-01)
- 30-day Trust Signals on analytics show useful governance data (INSIGHT-02)
- Units and labels are well-formatted across all routes — comma formatting, currency symbols, abbreviations (INSIGHT-06)

**What does not work:**
- Activity feed on home shows raw i18n key `dashboard.activity.dispute_escalated` as literal text — missing translation key (INSIGHT-01) -- **priority fix**
- “Open audit trail” link on treasury goes to `/admin/settings` which is now admin-only — non-admin users get Access Denied (INSIGHT-04) -- **priority fix**
- Analytics “Updated Not available” timestamp is confusing — should say “Last updated: —“ or “Not yet refreshed” (INSIGHT-02)
- $ORG Price and Market Cap show “—“ with no explanation on analytics (INSIGHT-02)
- Treasury Emission Policy all “—“ values and “Latest Settlement: Unknown” with no context (INSIGHT-04)
- Sprint countdown “0h” on home with no differentiation between no sprint and 0 hours remaining (INSIGHT-01)
- Home mobile: below the hero is blank — trust pulse, action cards, activity feed, member status sections not visible (INSIGHT-07)
- Analytics mobile: key metric cards show as skeleton placeholders — data may not load at mobile viewport (INSIGHT-07)
- Leaderboard mobile: shows “Loading leaderboard...” indefinitely — table may not render on narrow viewport (INSIGHT-07)
- 48 console errors on home (Sentry CSP + missing i18n keys), 12 on analytics, 8 on leaderboard, 17 on treasury (INSIGHT-01, cross-cutting)

**UI improvements requested:**
- **Floating info (“i”) button on every page (except home):** A persistent, semi-transparent floating icon that opens a detailed popup/sheet explaining the current section — what it does, how it works, step-by-step workflows. User can swipe/drag sideways to see more detail (e.g., for Tasks: “Create a task” → “Submit” → “Comment” → etc.). Replaces verbose on-page explanations, especially important for mobile. (INSIGHT-02, INSIGHT-03, INSIGHT-04, INSIGHT-05)
- **Consistent page structure:** Every page should follow the same structural template — dark hero section (like treasury), consistent card shadows (floating cards from auth revamp), consistent spacing and typography per organic-ux. (All INSIGHT cases)
- **Home dashboard as FOMO-creating landing page:** Horizontal card carousel with dot indicators and swipe-on-mobile for feature cards (Proposals, Governance, Analytics, Tasks, Sprints). Each card is large, floating with shadow, explains the feature. “Organic” word animates like a tree growing with roots. Key sections get glowing flare border animation. Dashboard should create urgency and showcase what the DAO is doing. (INSIGHT-01, INSIGHT-08)
- **Treasury reveal animations:** Lock icon hiding wallet → click to unlock and reveal treasury address. Similar interactive reveal animations for other key data. (INSIGHT-04)
- **Dark hero sections replicated:** Treasury's dark gradient hero should be the pattern for other page headers (analytics, leaderboard, etc.). Creates visual consistency and premium feel. (INSIGHT-02, INSIGHT-03, INSIGHT-04)
- **Professional custom icons:** Plan specific icons for each feature card — more distinctive than generic Lucide icons. Agent to recommend what icons to create and how. (INSIGHT-01, INSIGHT-08)
- **Leaderboard avatars:** Add profile images/avatars to leaderboard table rows for scannability. Highlight top 3 with podium treatment. (INSIGHT-03)

**Standalone tasks identified:**
- **TASK: Fix missing i18n key `dashboard.activity.dispute_escalated`** — Raw translation key showing in activity feed on home dashboard. Quick fix in message files. (INSIGHT-01)
- **TASK: Fix treasury “Open audit trail” link** — Links to `/admin/settings` which is admin-only after the QA 4.2 fix. Change to a public-facing audit page or conditionally show based on role. (INSIGHT-04)
- **TASK: Console error audit (CSP + Sentry)** — 48-132 errors across pages, mostly Sentry CSP violations. Need to update Content Security Policy to allow `ingest.de.sentry.io`. Cross-cutting with 4.1 and 4.2. (All cases)
- **TASK: Design floating info button component** — New cross-cutting component for all pages. Needs design spec, mobile gesture support (swipe/drag), content model for step-by-step workflows. (INSIGHT-02-08)

**Top 3 highest-impact changes:**
1. **Home dashboard full revamp** — FOMO-creating landing page with floating card carousel, “Organic” tree animation, glowing card borders, professional icons, horizontal swipe. Fix broken i18n feed. This is the front door of the app. (INSIGHT-01, INSIGHT-08, S1)
2. **Consistent page structure with dark hero + floating info** — Every page gets treasury-style dark hero header, consistent card shadows, and the floating “i” button for contextual help. Eliminates verbose on-page text, especially on mobile. (INSIGHT-02, INSIGHT-03, INSIGHT-04, INSIGHT-05, S2)
3. **Mobile rendering fixes** — Home blank below fold, analytics skeleton cards, leaderboard table not loading. These are usability blockers on mobile. (INSIGHT-07, S2)

**Section severity:** S1 (broken i18n key on home is visible to all users, mobile rendering issues)
**Confidence score:** 5/5 (all 8 cases tested across 3 roles + mobile viewport)

**Execution status:** _not started_

## 4.4 Members Directory and Member Profile Privacy
Routes: `/members`, `/members/[id]`.

Use cases:
- [ ] `MEM-01` Members directory loads with cards and key trust cues.
- [ ] `MEM-02` Search/filter/pagination interactions are stable.
- [ ] `MEM-03` Public profile displays expected data.
- [ ] `MEM-04` Private profile hides restricted data correctly.
- [ ] `MEM-05` Owner-facing private profile messaging is clear.
- [ ] `MEM-06` Section navigation inside member detail works.
- [ ] `MEM-07` Invalid member id route shows safe fallback.
- [ ] `MEM-08` Mobile member cards and profile sections remain scannable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.5 My Profile, Privacy Toggle, and Progression Hub
Routes: `/profile`, `/profile/progression`.

Use cases:
- [ ] `PROF-01` Profile identity/activity/preferences sections render.
- [ ] `PROF-02` Privacy toggle updates state and message correctly.
- [ ] `PROF-03` Progression page opens from profile quick action.
- [ ] `PROF-04` Progression source context (`?from=tasks|proposals|profile`) behaves correctly.
- [ ] `PROF-05` XP/level/next-step context is understandable.
- [ ] `PROF-06` Fallback messaging is useful when progression data is sparse.
- [ ] `PROF-07` Mobile layout keeps cards/actions usable.
- [ ] `PROF-08` Twitter/X account link/unlink controls in profile work and persist state.
- [ ] `PROF-09` OAuth callback return parameters (`twitter_linked`, `twitter_error`) surface clear feedback on profile.
- [ ] `PROF-10` Onboarding progress shortcut in top bar dropdown appears only for incomplete users.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.6 Quests, Referrals, and Gamification Controls
Routes: `/quests`, `/join?ref=CODE`, `/signup?ref=CODE`, `/admin/settings` (Gamification tab), `/profile/progression`.

Pre-flight:
- [ ] Migration `supabase/migrations/20260223100000_quests_referrals_burns.sql` applied.
- [ ] At least one active quest exists.
- [ ] Referral test accounts available (inviter + invitee).

Use cases:
- [ ] `GAM-01` Member opens `/quests` and sees referral + quests surfaces.
- [ ] `GAM-02` Quest tabs (`in_progress`, `done`, `all`) filter correctly.
- [ ] `GAM-03` Referral code/link generation and copy actions work.
- [ ] `GAM-04` Referral link redirect flow works via `/join?ref=...`.
- [ ] `GAM-05` Referral completion updates stats/cards.
- [ ] `GAM-06` Burn-level flow handles enabled/disabled modes correctly.
- [ ] `GAM-07` Burn confirm dialog math (from level/to level/points) is correct.
- [ ] `GAM-08` Quests data remains coherent with progression context.
- [ ] `GAM-09` Admin gamification settings and quest controls are accessible to admin only.
- [ ] `GAM-10` Localized copy for quests/referrals is valid in `en`, `pt-PT`, `zh-CN`.
- [ ] `GAM-11` Mobile quest cards/filters/referral surface remain usable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.7 Tasks End-to-End Workflow (Creation -> Claim -> Submit -> Review)
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

Feedback:
- What works well:
  - `TASK-02` Search, filter, sort all function correctly on the list page. Tab bar (All/Active Sprint/Completed) shows live counts. Sort options (newest, oldest, due soonest, highest points, most liked) all work. "More filters" reveals category, contributor, sprint, and date-range filters.
  - `TASK-04` Task detail page shows status, priority, points, assignee, due date, sprint context, description, and acceptance criteria. InfoButton popup now renders 3 rich sections with bold formatting.
  - `TASK-10` Dependency picker renders with search, shows up to 20 matching tasks, and supports add/remove. Blocked badge displays with blocker count.
  - `TASK-11` Subtask list renders with progress bar and individual subtask links. Subtask creation form is functional.
  - `TASK-12` Template manager loads with create/edit/delete functionality. Templates have recurrence badge support.
  - Execution cockpit hero section shows 4 key metrics: open execution, pending review, needs assignee, community queue.
  - Sprint context banner shows active sprint name and status, or helpful fallback text.
  - InfoButton (floating info) works correctly with 3 scrollable sections, dot navigation, and bold text rendering via `**markers**`.
  - Task list rows display: title, priority badge, status, due date, points, and activity counts (likes, comments, submissions, contributors).
  - Pagination works (Page 1 of 2 with 14 tasks, 12 per page).

- What does not work:
  - **S0 — Silent error handling on task detail**: Task fetch, comment fetch, and dependency fetch all use empty `catch {}` blocks. If Supabase returns an error (RLS, network, etc.), user sees "Not found" with no way to distinguish from a genuinely missing task. (TASK-04)
  - **S0 — Hardcoded locale in date formatting**: `formatDate()` in task detail uses `'en-US'` locale instead of the current app locale. PT-PT and ZH-CN users see English date formats. (TASK-04)
  - **S1 — No confirmation dialog for leaving task**: Claim button's "Leave Task" action has no confirmation. User can accidentally abandon a claimed task. (TASK-03)
  - **S1 — Emoji icons in board view**: Task board uses 💬📤👥 emojis for activity counts instead of Lucide icons. Violates design system (no emojis in UI surfaces). (TASK-02, TASK-15)
  - **S1 — Native `confirm()` dialog in template manager**: Delete confirmation uses browser-native dialog, which isn't i18n-aware. Shows in browser language, not app language. (TASK-12)
  - **S1 — Missing loading states for submissions section**: No skeleton/spinner while submissions load. Appears empty during network delay. (TASK-05, TASK-06)
  - **S1 — Empty state for submissions is generic**: "No submissions yet" with no context about what submissions are or CTA to guide the user. (TASK-05)
  - **S2 — Dependency picker silently caps at 20 items**: Shows `.slice(0, 20)` results with no "showing 20 of N" indicator. User may miss tasks. (TASK-10)
  - **S2 — No date range validation in filters**: User can set dateTo < dateFrom with no error feedback, producing zero results silently. (TASK-02)
  - **S2 — Task list column headers are `<p>` tags**: Should be semantic table headers (`<th>`) for accessibility. Screen readers don't announce them as column headers. (TASK-15)
  - **S2 — Overdue indicator is color-only**: Uses `text-destructive` with no icon or non-color cue. Fails WCAG for color-blind users. (TASK-15)
  - **S2 — Comments section has no pagination or max height**: Unlimited comments loaded at once, can create very long pages. (TASK-04)
  - **S2 — Like button has no debounce/loading state**: Users can spam-click; potential race condition for duplicate likes. (TASK-04)
  - **S2 — Content submission form doesn't enforce required fields**: Shows "Content link or text required" warning but doesn't disable submit. (TASK-05)
  - **S3 — Task board grid doesn't handle tablet landscape well**: Only `md:grid-cols-2`, cramped for 5 status lanes. (TASK-15)
  - **S3 — "+X more" blockers text is hardcoded English**: Not i18n-aware. (TASK-10)
  - **S3 — Mobile column labels missing**: List headers are `hidden md:grid`, no mobile fallback labels. (TASK-15)

- UI improvements requested:
  - Replace emoji activity icons (💬📤👥) with Lucide icons throughout board view
  - Add proper error states to task detail page (retry button, error message) instead of silent catch
  - Add confirmation dialog (shadcn AlertDialog) for leave-task and delete-template actions
  - Add loading skeletons for submissions section, comments section, and dependency data
  - Improve empty states: add icons, context text, and CTA ("Be the first to submit work")
  - Use current locale for date formatting instead of hardcoded 'en-US'
  - Add semantic table markup (`<table>`, `<th>`) for task list, or at least `role="columnheader"`
  - Add debounce to like button to prevent race conditions
  - Add max-height + scroll to comments section
  - Mobile: show inline labels on task cards since column headers are hidden
  - Filter UX: validate date range, show "20 of N" in dependency picker
  - Replace native `confirm()` with shadcn AlertDialog throughout
  - Board view: add sm: breakpoint for better tablet layout

- Top 3 highest-impact changes:
  1. **Fix error handling in task detail** — Silent catch blocks hide real errors from users. Add error state UI with retry, distinguishable from "not found". Affects TASK-03/04/05/06/07/08.
  2. **Replace emoji icons with Lucide + fix board accessibility** — Emoji in board view breaks design system consistency and accessibility. Using proper icons with aria-labels fixes both. Affects TASK-02/15.
  3. **Add loading/empty states across submission and comment sections** — Missing loading skeletons make the app feel broken on slow connections. Generic empty states don't guide users. Affects TASK-04/05/06.

- Section severity (`S0/S1/S2/S3`): **S1** (multiple high-priority UX issues; no data loss bugs, but significant usability gaps)
- Confidence score (`1-5`): **4** (thorough code analysis + live browser QA of list page; task detail could not be loaded live due to WSL2 memory constraints, but code review covers all paths)

## 4.8 Sprints End-to-End Workflow (Planning -> Completed)
Routes: `/sprints`, `/sprints/[id]`, `/sprints/past`.

Use cases:
- [ ] `SPR-01` Admin creates a sprint.
- [ ] `SPR-02` Admin starts sprint from planning.
- [ ] `SPR-03` Sprint transitions to `review` via completion action.
- [ ] `SPR-04` Sprint transitions to `dispute_window`.
- [ ] `SPR-05` Dispute-window timing constraints are communicated.
- [ ] `SPR-06` Sprint transitions to `settlement` only when valid.
- [ ] `SPR-07` Settlement blockers and reasons are visible/understandable.
- [ ] `SPR-08` Sprint transitions to `completed` when integrity conditions are satisfied.
- [ ] `SPR-09` Sprint detail timeline/rail surfaces current phase clearly.
- [ ] `SPR-10` Past sprints page is navigable and understandable.
- [ ] `SPR-11` Mobile sprint list/detail remain usable.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.9 Proposals and Governance Workflow
Routes: `/proposals`, `/proposals/new`, `/proposals/[id]`.

Use cases:
- [ ] `PROP-01` Member creates proposal draft/public submission.
- [ ] `PROP-02` Proposal list shows governance signal/context correctly.
- [ ] `PROP-03` Proposal detail renders structured sections clearly.
- [ ] `PROP-04` Proposal comments can be posted and read.
- [ ] `PROP-05` Stage transitions are forward-only and clearly communicated.
- [ ] `PROP-06` Start voting works for authorized role only.
- [ ] `PROP-07` Vote eligibility and effective power are understandable.
- [ ] `PROP-08` Casting vote succeeds/fails with clear feedback.
- [ ] `PROP-09` Finalize voting behaves idempotently.
- [ ] `PROP-10` Freeze and resume semantics are understandable to operators.
- [ ] `PROP-11` Execution-window messaging for passed proposal is clear.
- [ ] `PROP-12` Proposal templates are usable (if enabled/configured).
- [ ] `PROP-13` Mobile readability and action placement are acceptable.
- [ ] `PROP-14` Proposal threshold gate blocks under-threshold proposers with clear reason.
- [ ] `PROP-15` Anti-abuse cooldown/one-live-proposal guard is enforced and explained.
- [ ] `PROP-16` Passed proposal finalize path remains usable under execution-window degraded mode (`PGRST204`) with non-blocking warning behavior.
- [ ] `PROP-17` Proposal detail shows source-idea badge/link when `source_idea_id` is present.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.10 Disputes Workflow (File -> Evidence -> Resolve/Appeal)
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
| `/leaderboard` | 4.3 | | | | | |
| `/treasury` | 4.3 | | | | | |
| `/login` | 4.1 | | | | | |
| `/signup` | 4.1 | | | | | |
| `/join?ref=CODE` | 4.1 / 4.6 | | | | | |
| `/auth/error` | 4.1 | | | | | |
| `/auth/callback` | 4.1 | | | | | |
| `/members` | 4.4 | | | | | |
| `/members/[id]` | 4.4 | | | | | |
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
