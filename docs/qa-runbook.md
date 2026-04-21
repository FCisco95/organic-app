# QA Runbook — Organic App

Manual QA workbook for validating current features and collecting redesign-ready feedback.

> **Last rewrite:** 2026-04-21. Superseded the 2026-03 version that predated Pulse, Vault, Posts, Easter campaign, Translation toggles, and For-projects.
>
> **Rule of thumb:** any section that says "Last verified: 2026-04-21" has been walked in the browser against production or preview. Anything older is drift and should be re-run before release-gating.

---

## 1) Setup

| Item | Value |
|---|---|
| Production | `https://organichub.fun` |
| Preview | Vercel preview URL per PR |
| Desktop browsers | Chrome + Firefox (latest stable) |
| Mobile browsers | Chrome (Android 12+) + Safari (iOS 16+) |
| Locales | `en`, `zh-CN` (production locales). `pt-PT` retained in source but not shipping in the selector — confirm before testing. |
| Recommended viewports | 1440×900 desktop, 768×1024 tablet, 390×844 iPhone 13 mobile, 412×915 Pixel 7 |
| Required accounts | 1 admin, 1 council, 2 members, 1 guest |
| Supabase target | Manual QA runs against **Main DB** (`dcqfuqjqmqrzycyvutkn`). CI runs against ephemeral local Supabase. |

### QA accounts

| Account | Email | Password | Role | Organic ID |
|---|---|---|---|---|
| Claude test (primary) | `claude-test@organic-dao.dev` | `OrganicTest2026!` | admin | 999 |
| QA Admin | `qa-admin@organic.test` | `QaAdmin2026!` | admin | 900001 |
| QA Council | `qa-council@organic.test` | `QaCouncil2026!` | council | 900002 |
| QA Member | `qa-member@organic.test` | `QaMember2026!` | member | 900003 |

Create/refresh via `scripts/create-qa-accounts.ts`.

---

## 2) Session header (fill before testing)

- Date:
- Tester:
- Environment URL:
- Branch/commit:
- Locales tested:
- Devices tested:
- Roles tested:
- Session objective: `Release validation / UX revamp / Both`

---

## 3) Scoring and feedback capture

### 3.1 Severity
- `S0` = blocker (cannot complete workflow)
- `S1` = major break or severe confusion
- `S2` = moderate friction, workaround exists
- `S3` = polish/consistency issue

### 3.2 Outcome tags
- `PASS` = expected behavior observed
- `FAIL` = behavior incorrect/broken
- `PARTIAL` = usable but degraded
- `SKIP` = cannot test due to fixture/env precondition

### 3.3 Per-section feedback block

- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

---

## 4) Workflow QA packs

> Sections are organized by domain. Each section lists routes, prereqs, and use cases. Append `Last verified: YYYY-MM-DD` whenever you run the pack.

### 4.1 Auth, session, and entry flows
<!-- qa-status: DONE | severity: S3 | plan: none | last verified: 2026-03-21 -->
Routes: `/login`, `/signup`, `/join?ref=CODE`, `/auth/error`.

Prereqs: guest (incognito), invalid creds, valid member creds, referral code `ORG-TEST-123`.

Use cases:
- [ ] `AUTH-01` Guest opens `/login`; form renders, inputs ≥44px tall.
- [ ] `AUTH-02` Guest opens `/signup`; form renders, inputs ≥44px tall.
- [ ] `AUTH-03` Invalid credentials show understandable error copy (i18n key, not raw Supabase error).
- [ ] `AUTH-04` Member login succeeds and lands on Home.
- [ ] `AUTH-05` Session persists across refresh.
- [ ] `AUTH-06` Sign-out clears session and protects private routes via middleware.
- [ ] `AUTH-07` Protected route redirect preserves `returnTo` param.
- [ ] `AUTH-08` `/join?ref=CODE` redirects to `/signup?ref=CODE`.
- [ ] `AUTH-09` Signup with `ref` param preserves referral context in Supabase metadata.
- [ ] `AUTH-10` `/auth/error` recovery links (login/home) work.
- [ ] `AUTH-12` Mobile auth forms have no clipping at 375px and no unreachable controls.

**Last verified:** 2026-03-21 (baseline), 2026-04-13 (Iter 2 mobile fixes).

### 4.2 Global navigation, layout, and i18n
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-navigation-qa-revamp.md | last verified: 2026-04-13 -->
Routes: global shell across all authenticated pages.

Use cases:
- [ ] `NAV-01` Sidebar items render correctly by role (`admin`, `council`, `member`).
- [ ] `NAV-02` Mobile sidebar (Sheet) opens, exposes same essentials, closes without focus trap.
- [ ] `NAV-03` Active route state is visible and accurate.
- [ ] `NAV-04` Locale switch (EN ↔ ZH) updates labels/content on the current page.
- [ ] `NAV-05` Query-bearing links (progression `?from=`) retain expected behavior.
- [ ] `NAV-06` Top-bar actions discoverable + keyboard reachable.
- [ ] `NAV-07` No overlap/collision at 375px, 390px, 412px, 768px.
- [ ] `NAV-08` Role-restricted pages not discoverable via unauthorized nav paths.
- [ ] `NAV-09` Breadcrumb route → section mapping correct (see `nav-config.ts`).
- [ ] `NAV-10` Command palette (Cmd/Ctrl+K) opens, searches, dispatches actions.

**Last verified:** 2026-04-13 (Iter 3 mobile sidebar + top-bar fixes confirmed at 390 and 428).

### 4.3 Home
<!-- qa-status: DONE | severity: S2 | plan: docs/plans/2026-03-21-home-analytics-treasury.md | last verified: 2026-04-13 -->
Route: `/`.

Use cases:
- [ ] `HOME-01` Dashboard loads with trust/summary surfaces and "what to do next" CTAs.
- [ ] `HOME-02` Proposal stage count grid does not clip cell text at 375px (historical S1 — fixed Iter 2).
- [ ] `HOME-03` "Get Started" and "View Proposals" CTAs ≥44px tall (fixed Iter 3).
- [ ] `HOME-04` All i18n keys resolve (no raw `Home.*` strings).
- [ ] `HOME-05` Launch banner dismiss button ≥44px.
- [ ] `HOME-06` Empty state for $ORG price/market cap explains why value is `—`.
- [ ] `HOME-07` Activity feed link (`dashboard.activity.viewAll`) renders translated.

**Last verified:** 2026-04-13.

### 4.4 Pulse (analytics hub)
<!-- qa-status: PLANNED | severity: S1 | plan: docs/plans/2026-04-21-pulse-analytics-fixes.md | last verified: 2026-04-13 -->
Route: `/pulse` (previously `/analytics` — now a permanent redirect).

**Note:** Pulse replaces the old Analytics page. Re-verification needed after PR #63 (concentration bars + distribution summary restoration) merges.

Use cases:
- [ ] `PULSE-01` Page loads; tabs (Overview / Personal / Governance) render.
- [ ] `PULSE-02` Tab bar + DateRangeSelector do not overflow at 375px (S1 — flex-col stack fixed Iter 3).
- [ ] `PULSE-03` Charts render with real data; no console errors.
- [ ] `PULSE-04` Concentration bars render for token holders (restored in PR #63).
- [ ] `PULSE-05` Distribution summary cards visible under charts (restored in PR #63).
- [ ] `PULSE-06` DexScreener/GeckoTerminal quick-links ≥44px tall (historical S1).
- [ ] `PULSE-07` `/analytics` redirects to `/pulse` with no flash.
- [ ] `PULSE-08` Mobile: chart scroll/zoom works; no layout thrash.
- [ ] `PULSE-09` EN + ZH: labels, tooltip copy, legend all localized.

**Last verified:** 2026-04-13 (layout only — PR #63 data fixes pending merge).

### 4.5 Vault (treasury)
<!-- qa-status: PLANNED | severity: S3 | last verified: 2026-04-13 -->
Route: `/vault` (previously `/treasury` — redirect).

Use cases:
- [ ] `VAULT-01` Hero + emission policy + balance cards stack cleanly at 375px (PASS Iter 1).
- [ ] `VAULT-02` Settlement posture (held/killed/paid) labels readable.
- [ ] `VAULT-03` Transparency metadata links (Supabase, Solana explorer) open in new tab.
- [ ] `VAULT-04` Empty/loading states: clear when balances unavailable.
- [ ] `VAULT-05` `/treasury` redirects to `/vault`.
- [ ] `VAULT-06` Mobile: no horizontal scroll; touch targets ≥44px.

**Last verified:** 2026-04-13.

### 4.6 Community (rankings + directory + profile)
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-community-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/community`, `/community/[id]`. Redirects: `/members`, `/members/[id]`, `/leaderboard`.

Use cases:
- [ ] `COMM-01` Community loads with hero + Rankings tab default.
- [ ] `COMM-02` Rankings: podium, your-position, sortable table, search.
- [ ] `COMM-03` Directory: filter chips, sort dropdown, clear button.
- [ ] `COMM-04` Tab switching preserves per-tab state.
- [ ] `COMM-05/06` Rankings row / Directory card click → `/community/[id]`.
- [ ] `COMM-07` Profile privacy gating (private vs public).
- [ ] `COMM-08/09/10` `/members`, `/members/[id]`, `/leaderboard` redirect correctly.
- [ ] `COMM-11` Rankings search filters by name, email, and Organic ID.
- [ ] `COMM-12` EN + ZH render correctly — 0 raw keys.
- [ ] `COMM-PROF` Community profile (`/community/[id]`) renders member data — all tabs resolve (was S1 in March, verify before next release).

**Last verified:** 2026-04-13 (mobile skeleton persistence S0 still open for unauthenticated visitors — see audit report).

### 4.7 Profile, privacy toggle, progression, trophies
<!-- qa-status: DONE | severity: S1 | plan: docs/plans/2026-03-21-profile-progression-fixes-v2.md | last verified: 2026-04-13 -->
Routes: `/profile`, `/profile/progression`, `/profile/trophies`.

Use cases:
- [ ] `PROF-01` Profile identity/activity/preferences sections render; no raw i18n keys.
- [ ] `PROF-02` Privacy toggle updates state + toast.
- [ ] `PROF-03` Progression page opens from profile quick action.
- [ ] `PROF-04` Progression source context (`?from=tasks|proposals|profile`) adapts banner + back link.
- [ ] `PROF-05` XP/level/next-step surface readable; quest titles resolve via API title fallback.
- [ ] `PROF-06` Fallback messaging informative when progression data is sparse.
- [ ] `PROF-07` Mobile: stats row does NOT clip 3rd column (historical S1 — verify fix at 375/390/412).
- [ ] `PROF-08` Twitter/X connect/unlink works; profile + submission form both send `body: JSON.stringify({})`.
- [ ] `PROF-09` OAuth callback `twitter_linked=1|0` surfaces toast; URL cleans up.
- [ ] `PROF-10` Onboarding progress shortcut in avatar dropdown shown only for incomplete users.
- [ ] `TROPH-01` `/profile/trophies` filter chips and By Category/By Set toggles ≥44px (historical S1).
- [ ] `TROPH-02` Trophy catalog renders badges; rarity tiers (Bronze/Silver/Gold/Platinum/Secret) visible.
- [ ] `TROPH-03` Back arrow on trophies page ≥44px tap target.

**Last verified:** 2026-04-13 (stats-row clip + trophy chips still `S1 Open` per Iter 1; pending revamp).

### 4.8 Quests, referrals, gamification (via /earn)
<!-- qa-status: DONE | severity: S1 | plan: docs/plans/2026-03-21-quests-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/earn` (canonical), `/quests` and `/rewards` redirect to `/earn?tab=quests|rewards`. Related: `/join?ref=CODE`, `/signup?ref=CODE`, `/admin/settings` (Gamification tab), `/profile/progression`.

Use cases:
- [ ] `GAM-01` `/earn` shows quests + referral surfaces, 0 console errors.
- [ ] `GAM-02` Quest tabs (`in_progress`, `done`, `all`) filter correctly.
- [ ] `GAM-03` Referral code/link copy actions work.
- [ ] `GAM-04` Referral link redirect via `/join?ref=...` → `/signup?ref=CODE`.
- [ ] `GAM-05` Referral completion updates tier stepper (Bronze→Silver→Gold).
- [ ] `GAM-06` Burn-level flow handles enabled/disabled config.
- [ ] `GAM-07` Burn confirm math correct when enabled.
- [ ] `GAM-08` Quest data coherent with progression context.
- [ ] `GAM-09` Admin gamification settings/quest controls admin-only.
- [ ] `GAM-10` EN + ZH render without raw keys.
- [ ] `GAM-11` Mobile: quest cards, filters, referral copy buttons all ≥44px.

**Last verified:** 2026-04-13 (referral copy buttons still 34px — `S2 Open`).

### 4.9 Tasks end-to-end (create → claim → submit → review)
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-08-tasks-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/tasks`, `/tasks/[id]`, `/tasks/templates`, `/admin/submissions`.

Use cases:
- [ ] `TASK-01` Admin creates task from task modal/new flow.
- [ ] `TASK-02` Member search/filter/sort works.
- [ ] `TASK-03` Claim/unclaim respects dependencies/rules.
- [ ] `TASK-04` Detail explains status, acceptance criteria, points, assignee.
- [ ] `TASK-05` Submission form works for the expected task type.
- [ ] `TASK-06` Submission moves task to review state.
- [ ] `TASK-07/08` Approve / reject with required reason.
- [ ] `TASK-09` `/admin/submissions` queue updates after actions.
- [ ] `TASK-10/11` Dependency picker and subtasks work.
- [ ] `TASK-12/13` Template CRUD + instantiate.
- [ ] `TASK-14` Proposal-linked task gate enforces finalized+passed provenance.
- [ ] `TASK-15` Mobile: list, detail, submission, review queue usable at 375px (tabs ≥44px — historical S1).
- [ ] `TASK-16/17` Twitter/X task target URL + engagement config enforcement, linked-account requirement.
- [ ] `TASK-18` **Translation toggle (PR #64):** Admin Content Translation panel exposes per-type switches (post, proposal, idea, task). Toggling off hides the translate button on the corresponding detail page within one refresh.
- [ ] `TASK-19` **Task translation:** with Tasks toggle ON, task detail shows "Translate" affordance; click calls DeepL; cached translation returned on subsequent view.
- [ ] `TASK-20` **Task done transition (PR #62):** review → done transition succeeds via API route.

**Last verified:** 2026-04-13 (task done transition fix in PR #62 pending merge).

### 4.10 Sprints end-to-end (planning → completed)
<!-- qa-status: DONE | severity: S3 | plan: docs/plans/2026-03-21-sprints-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/sprints`, `/sprints/[id]`, `/sprints/past`.

Use cases:
- [ ] `SPR-01/02/03` Create → start → advance-to-review works for admin/council.
- [ ] `SPR-04` `review` → `dispute_window` transition.
- [ ] `SPR-05` Dispute-window countdown visible.
- [ ] `SPR-06/07` Settlement transitions + blockers surfaced.
- [ ] `SPR-08` `completed` transition gated on integrity conditions; incomplete-task handling options present.
- [ ] `SPR-09` Phase rail/timeline surfaces current phase clearly.
- [ ] `SPR-10` `/sprints/past` timeline view usable.
- [ ] `SPR-11` Mobile: board horizontal-scrolls with snap; phase rail labels readable (historical: `min-w-[840px]` with no scroll hint, `S1`).

**Last verified:** 2026-04-13.

### 4.11 Proposals + governance
<!-- qa-status: DONE | severity: S2 | plan: docs/plans/2026-03-19-proposals-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/proposals`, `/proposals/new`, `/proposals/[id]`.

Use cases:
- [ ] `PROP-01` Member creates proposal draft/public submission; wizard tabs readable on mobile.
- [ ] `PROP-02` List shows governance signal/context; counts accurate; no leaked admin CTA for members.
- [ ] `PROP-03` Detail renders structured sections; Decision Rail not buried on mobile.
- [ ] `PROP-04` Comments: post + read; display name shown (not just avatar initial).
- [ ] `PROP-05` Stage transitions are forward-only; history visible.
- [ ] `PROP-06` Start-voting authorized role only.
- [ ] `PROP-07/08` Vote eligibility, power, token-holder messaging; casting succeeds/fails with clear feedback.
- [ ] `PROP-09/10/11` Finalize idempotent; freeze/resume understandable; execution-window deadline surfaced.
- [ ] `PROP-13` Mobile: no duplicate sticky Vote button when voting closed; Decision Rail collapsible.
- [ ] `PROP-14/15` Threshold gate blocks under-threshold with clear reason; anti-abuse cooldown enforced.
- [ ] `PROP-17` Source-idea badge/link visible on promoted proposal.
- [ ] `PROP-18` **Translation toggle:** proposal translation respects admin toggle.

**Last verified:** 2026-04-13.

### 4.12 Ideas incubator
<!-- qa-status: DONE | severity: S2 | plan: docs/plans/2026-03-23-ideas-incubator-qa-revamp.md | last verified: 2026-04-13 -->
Routes: `/ideas`, `/ideas/[id]`, `/ideas/harvest`. APIs: `/api/ideas*`.

Prereqs: feature flag enabled, ideas schema available, at least one open promotion cycle.

Use cases:
- [ ] `IDEA-01` Feed, sort tabs, search, KPI strip, weekly spotlight load.
- [ ] `IDEA-02` Organic-ID member can create an idea; title/body validation bounded.
- [ ] `IDEA-03` Member without Organic ID blocked with clear messaging.
- [ ] `IDEA-04` Vote toggle idempotent (repeat `up/down` clears to neutral).
- [ ] `IDEA-05` Self-vote blocked with explicit error.
- [ ] `IDEA-06` Comment creation requires Organic ID; rejects empty payload.
- [ ] `IDEA-07` Detail page: author, status, body, score breakdown, comments chronology.
- [ ] `IDEA-08/09` Edit permissions + admin/council moderation enforced.
- [ ] `IDEA-10/11` Feature-flag disabled / backend unavailable return safe fallback.
- [ ] `IDEA-12` Mobile usability (feed, vote rail, composer, detail).
- [ ] `IDEA-13/14` Promote to proposal + winner selection paths work.
- [ ] `IDEA-15` Promoted proposal detail shows source-idea badge/link back.
- [ ] `IDEA-16` `/ideas/harvest` weekly promotion UI accessible; Back-to-ideas link ≥44px (historical S1).
- [ ] `IDEA-17` **Translation toggle:** idea translation respects admin toggle.

**Last verified:** 2026-04-13.

### 4.13 Posts (community feed)
<!-- qa-status: NEW-SECTION | severity: S1 | last verified: 2026-04-13 -->
Routes: `/posts`, `/posts/[id]`. See `docs/plans/phase-30-points-economy.md` for the points economy.

Prereqs: member with sufficient points to post, at least 3 existing posts (mix of types).

Use cases:
- [ ] `POST-01` Feed loads; 6 filter pills render (`All`, `Posts`, `Threads`, `Announcements`, `Links`, `Organic`).
- [ ] `POST-02` Filter row scrolls horizontally; **`Organic` pill must be reachable on 375px** (historical S1 — Organic pill was 65px off-screen with no scroll hint).
- [ ] `POST-03` Sort pills (`New`, `Popular`, `Top This Week`) ≥44px tap target (historical S1 — 28px).
- [ ] `POST-04` View toggle (grid/list) buttons ≥44px (historical S1 — 26px).
- [ ] `POST-05` Create post: modal shows post cost in points; cost deducted on submit.
- [ ] `POST-06` Post detail renders author, body, engagement counters.
- [ ] `POST-07` Engagement (like/reply) awards XP per the points-economy rules.
- [ ] `POST-08` Organic posts (ORG-emitted content) tagged + styled distinctly.
- [ ] `POST-09` Flagging: any member can flag; flag hits moderation queue; repeat flags rate-limited.
- [ ] `POST-10` Unauthenticated visitor: feed shows skeleton indefinitely (historical S0 — needs "sign in to see content" fallback).
- [ ] `POST-11` **Translation toggle:** post detail shows/hides translate button per admin config; DeepL caches translations.
- [ ] `POST-12` Mobile: composer + detail readable at 375px; no clipping.
- [ ] `POST-13` EN + ZH: empty state, filters, cost copy, flag reason modal all localized.

**Last verified:** 2026-04-13 (pill overflow + skeleton-forever still `Open`).

### 4.14 Disputes workflow
<!-- qa-status: PLANNED | severity: S1 | plan: docs/plans/2026-03-21-disputes-qa-revamp.md | last verified: 2026-03-21 -->
Routes: `/disputes`, `/disputes/[id]`.

Use cases:
- [ ] `DISP-01` Eligible member files dispute from rejected submission.
- [ ] `DISP-02` Queue tabs (`queue`, `mine`) filter correctly per role.
- [ ] `DISP-03` Detail shows status/tier/SLA/evidence chronology.
- [ ] `DISP-04` Comment thread add/list; empty content rejected.
- [ ] `DISP-05` Evidence upload accepts allowed types only.
- [ ] `DISP-06` Late evidence tagged.
- [ ] `DISP-07` Uploads blocked after window closes.
- [ ] `DISP-08` Mediate/assign/respond actions role-gated — **non-party members must NOT see admin triage controls** (historical S1).
- [ ] `DISP-09` Resolve action shows XP impact estimate.
- [ ] `DISP-10/11` Withdraw + appeal paths work for the right parties.
- [ ] `DISP-12` Unauthorized users blocked from restricted dispute detail (historical S2: non-party saw "Unassigned" instead of access-denied).
- [ ] `DISP-13` Mobile: queue + detail usable; triage deck doesn't dominate viewport.

**Last verified:** 2026-03-21.

### 4.15 Rewards + claim workflow
<!-- qa-status: PLANNED | severity: S2 | plan: docs/plans/2026-03-22-rewards-qa-revamp.md | last verified: 2026-03-22 -->
Routes: `/earn?tab=rewards` (member view, canonical), `/rewards` (redirects), `/admin/rewards` (ops).

Use cases:
- [ ] `RWD-01` Member rewards summary loads with claimability data.
- [ ] `RWD-02` Claim below threshold blocked with clear reason.
- [ ] `RWD-03` Invalid values blocked with inline validation.
- [ ] `RWD-04` Valid claim submits; status progression visible.
- [ ] `RWD-05/06` Admin rewards page triages pending review safely.
- [ ] `RWD-07` Payout guardrails + warning copy clear.
- [ ] `RWD-08` Held/killed settlement posture communicated (matches Vault).
- [ ] `RWD-09` Mobile: claim CTA not buried under 4+ scrolls of education (historical S2).

**Last verified:** 2026-03-22.

### 4.16 Notifications
<!-- qa-status: TESTED | severity: S1 | plan: docs/plans/2026-03-22-notifications-qa-revamp.md | last verified: 2026-03-22 -->
Routes: `/notifications`, bell dropdown.

Use cases:
- [ ] `NOTIF-01` Page loads with expected filters/tabs.
- [ ] `NOTIF-02` Mark-as-read updates item + counter atomically.
- [ ] `NOTIF-03` Follow/unfollow action behaves correctly.
- [ ] `NOTIF-04` Preferences save and persist after reload.
- [ ] `NOTIF-05` Empty + error states informative.
- [ ] `NOTIF-06` Mobile: bell dropdown panel does not overflow off-screen (historical S1).
- [ ] `NOTIF-07` `getNotificationHref()` maps dispute subject types correctly (historical S1 — disputes routed to home).

**Last verified:** 2026-03-22.

### 4.17 Admin ops (settings, submissions, rewards, users)
<!-- qa-status: PLANNED | severity: S2 | plan: docs/plans/2026-03-22-admin-ops-qa-revamp.md | last verified: 2026-03-22 -->
Routes: `/admin`, `/admin/settings`, `/admin/submissions`, `/admin/rewards`, `/admin/users`.

Use cases:
- [ ] `ADM-01` Non-admin cannot access admin pages (middleware + UI).
- [ ] `ADM-02` Settings page tabs switch without stale state.
- [ ] `ADM-03` Audit-policy settings require reason.
- [ ] `ADM-04` Settings updates produce success/failure toast.
- [ ] `ADM-05` Submissions queue usable for daily review.
- [ ] `ADM-06` Rewards triage safe (claims table has React `key` prop — historical S2).
- [ ] `ADM-07` Risky/dangerous controls visually distinct and warning-copy-gated.
- [ ] `ADM-08` Tablet/mobile admin usable.
- [ ] `ADM-09` Users table: warn/restrict/ban/unrestrict action buttons ≥44px (fixed Iter 3); 8-column table needs mobile card fallback (historical S1 Open).
- [ ] `ADM-10` **Translation admin panel (PR #64):** per-content-type toggles visible; saving persists and propagates (tasks, posts, proposals, ideas).

**Last verified:** 2026-04-13 (Iter 3 — admin pages were blocked live due to a prior Sentry edge-runtime 500; confirm resolved before re-QA).

### 4.18 Error resilience + health
<!-- qa-status: PLANNED | severity: S1 | plan: docs/plans/2026-03-23-error-locale-ops-qa.md | last verified: 2026-03-23 -->
Scope: invalid routes, API-backed pages, `/api/health`.

Use cases:
- [ ] `ERR-01` Invalid route shows safe fallback + nav out.
- [ ] `ERR-02` API 500s surface error + retry (historical S1 — "0 tasks" shown silently).
- [ ] `ERR-03` Long loading states provide feedback; no interaction freeze.
- [ ] `ERR-04` `/api/health` reports healthy.
- [ ] `ERR-05` Unauthorized API calls return 401/403 + clear UX impact.
- [ ] `ERR-06` Mobile error states readable + recoverable.

**Last verified:** 2026-03-23.

### 4.19 Locale + a11y cross-pass
<!-- qa-status: PLANNED | severity: S3 | last verified: 2026-03-23 -->
Run after workflow packs.

Use cases:
- [ ] `L10N-01/02` Validate critical flows in `en` and `zh-CN`.
- [ ] `A11Y-01` Keyboard-only navigation works across primary workflows.
- [ ] `A11Y-02` Focus-visible states are visible and logical.
- [ ] `A11Y-03` Modal/dialog close via Escape works.
- [ ] `A11Y-04` Form validation messages announced + visible near fields.
- [ ] `A11Y-05` Color contrast acceptable for dense surfaces.
- [ ] `A11Y-06` `prefers-reduced-motion` respected on scroll/parallax/motion-heavy screens.

**Last verified:** 2026-03-23.

### 4.20 Onboarding wizard + progress APIs
<!-- qa-status: PLANNED | severity: S3 | plan: docs/plans/2026-03-22-onboarding-qa-revamp.md | last verified: 2026-03-22 -->
Routes: avatar dropdown shortcut, onboarding modal, `/api/onboarding/steps`, `/api/onboarding/steps/:step/complete`.

Prereqs: user with `onboarding_completed_at IS NULL`; at least one task and one active sprint.

Use cases:
- [ ] `ONB-01` Incomplete user sees wizard auto-open on first authenticated app load.
- [ ] `ONB-02` Step order: `connect_wallet → verify_token → pick_task → join_sprint`.
- [ ] `ONB-03` `GET /api/onboarding/steps` returns four keys with accurate completion state.
- [ ] `ONB-04..07` Each step's completion endpoint validates its prereq and returns a readable error otherwise.
- [ ] `ONB-08` Completed steps stay completed after reload/session refresh.
- [ ] `ONB-09` Repost completion is idempotent — no duplicate XP.
- [ ] `ONB-10` Finished onboarding: shortcut disappears; `onboarding_completed_at` populated.

**Last verified:** 2026-03-22.

### 4.21 Twitter/X linking + engagement verification
<!-- qa-status: PLANNED | severity: S1 | plan: docs/plans/2026-03-23-twitter-qa-revamp.md | last verified: 2026-03-23 -->
Routes: `/profile`, `/tasks/[id]` (Twitter task type), `/api/twitter/link/*`, `/api/twitter/account`.

Prereqs: Twitter app creds + callback URL configured; one `twitter_engagement` task.

Use cases:
- [ ] `TW-01` Linked vs unlinked card renders; CTA visible on 375px.
- [ ] `TW-02` Start-link redirects to `x.com/i/oauth2/authorize` with PKCE S256 + required scopes.
- [ ] `TW-03/04` Callback success (`twitter_linked=1`) + error (`twitter_error=...`) surface toast; URL cleaned.
- [ ] `TW-05` `GET /api/twitter/account` returns current linkage state; 401 for unauthed.
- [ ] `TW-06` Unlink is idempotent.
- [ ] `TW-07/08/09` Twitter task submission form: unlinked state CTA visible; config missing renders red error; connect handler must send `body: JSON.stringify({})` (historical S1 — profile page had the fix, submission form did not).
- [ ] `TW-10` Submission captures expected metadata + evidence.
- [ ] `TW-11` Admin/reviewer Twitter-task review surface shows screenshot URL, engagement type, comment text.
- [ ] `TW-12` Mobile: Profile Social tab + task detail both usable at 375×812.

**Last verified:** 2026-03-23.

### 4.22 For-projects marketing page
<!-- qa-status: NEW-SECTION | severity: S3 | last verified: 2026-04-13 -->
Route: `/for-projects`.

Use cases:
- [ ] `FORP-01` Hero card, plan selector, pricing cards render cleanly at 375px.
- [ ] `FORP-02` CTA buttons ≥44px; contact form (if present) validates required fields.
- [ ] `FORP-03` Indexable as public marketing page (SEO meta present).
- [ ] `FORP-04` EN + ZH rendered.

**Last verified:** 2026-04-13.

### 4.23 Easter campaign (XP egg hunt)
<!-- qa-status: NEW-SECTION | severity: S2 | plan: docs/plans/2026-03-30-easter-egg-hunt.md | last verified: 2026-04-13 -->
Routes: `/share/egg/[number]` (egg share landing), eggs embedded across app pages.

Prereqs: campaign window active (launched 2026-04-05); member has 0 eggs collected in test fixture.

Use cases:
- [ ] `EGG-01` Eggs visible on designated pages (see `src/features/easter/elements.ts` for placement map).
- [ ] `EGG-02` Clicking an egg awards XP, triggers collection toast, updates egg counter.
- [ ] `EGG-03` Same egg cannot be claimed twice by same user.
- [ ] `EGG-04` Egg share page (`/share/egg/[n]`) renders public OG image + CTA to claim.
- [ ] `EGG-05` Golden egg awards bonus; announcement surfaces in notifications.
- [ ] `EGG-06` Collection UI (activity log / egg gallery) reachable from profile.
- [ ] `EGG-07` Easter campaign honors `prefers-reduced-motion` (egg bounces / spawn animations disabled).
- [ ] `EGG-08` Post-campaign: eggs hide; existing collections remain in profile history.

**Last verified:** 2026-04-13.

### 4.24 Translation toggles + content translation
<!-- qa-status: NEW-SECTION | severity: S2 | plan: docs/plans/2026-04-13-content-translation.md | last verified: 2026-04-13 -->
Routes: `/admin/settings` (Content Translation panel), `/posts/[id]`, `/proposals/[id]`, `/ideas/[id]`, `/tasks/[id]`. API: `/api/translations/*`.

Prereqs: DeepL Free API key present; admin account; at least one record of each content type with non-current-locale body text.

Use cases:
- [ ] `XLT-01` Admin sees per-type toggles for `posts`, `proposals`, `ideas`, `tasks`. Initial state matches DB.
- [ ] `XLT-02` Flipping a toggle persists immediately; detail page hides/shows translate button within one refresh.
- [ ] `XLT-03` Clicking translate calls DeepL; translated body replaces original inline (X-style toggle back to original).
- [ ] `XLT-04` Source-language detection avoids redundant translate button on same-locale content.
- [ ] `XLT-05` Second view of the same content returns cached translation (Supabase) — no second DeepL call.
- [ ] `XLT-06` Rate-limit / DeepL error surfaces a non-blocking error toast.
- [ ] `XLT-07` Comments do NOT expose a translate button (scope explicitly excluded for now).
- [ ] `XLT-08` Mobile: translate button + state toggle reachable on 375px.
- [ ] `XLT-09` Tasks translation path (new in PR #64) honors toggle + caches like posts/proposals.

**Last verified:** 2026-04-13 (PR #64 shipping).

### 4.25 Operational safety controls (automated evidence)
<!-- qa-status: PLANNED | severity: S3 | plan: docs/plans/2026-03-23-error-locale-ops-qa.md | last verified: 2026-03-23 -->

Goal: verify governance and rewards safety controls with reproducible evidence.

Pre-flight:
- [ ] `.env.local` includes Supabase URL / anon key / service role key.
- [ ] CI-mode base URL boots.
- [ ] Admin + council fixture users creatable.

Execution:

```bash
set -a; source .env.local; set +a
CI=true npx playwright test \
  tests/voting-integrity.spec.ts \
  tests/rewards-settlement-integrity.spec.ts \
  --workers=1 --reporter=list
```

Fallback:

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
- [ ] Rewards hold path returns `EMISSION_CAP_BREACH`, sprint status `held`.
- [ ] Rewards kill-switch path returns `SETTLEMENT_KILL_SWITCH`, sprint status `killed`.
- [ ] `reward_settlement_events` contains `integrity_hold` + `kill_switch` rows.
- [ ] Voting finalization freeze path returns `FINALIZATION_FROZEN`.
- [ ] `proposal_stage_events` contains `finalization_kill_switch` with dedupe + attempt metadata.
- [ ] Manual recovery (`finalization_manual_resume`) finalizes successfully.

Evidence capture:
- [ ] Command output / CI job URL attached.
- [ ] Proposal id used for freeze/recovery.
- [ ] Sprint id used for hold/kill-switch.
- [ ] Audit rows exported with timestamp.

Audit queries:

```sql
select sprint_id, event_type, reason, idempotency_key, metadata, created_by, created_at
from reward_settlement_events
where sprint_id = '<SPRINT_ID>'
order by created_at desc;
```

```sql
select proposal_id, reason, from_status, to_status, actor_id, metadata, created_at
from proposal_stage_events
where proposal_id = '<PROPOSAL_ID>'
  and reason in ('finalization_kill_switch', 'finalization_manual_resume')
order by created_at desc;
```

---

## 5) Page-by-page audit matrix

Use this matrix after workflow testing to capture page-specific UX observations. Smoke: `PASS / FAIL / PARTIAL / SKIP`. UX score: `1 (poor) → 5 (excellent)`.

| Route | Section | Smoke | UX | What works | What does not | UI improvements |
|---|---|---|---|---|---|---|
| `/` | 4.3 | | | | | |
| `/pulse` | 4.4 | | | | | |
| `/analytics` (redirect → /pulse) | 4.4 | | | | | |
| `/vault` | 4.5 | | | | | |
| `/treasury` (redirect → /vault) | 4.5 | | | | | |
| `/login` | 4.1 | | | | | |
| `/signup` | 4.1 | | | | | |
| `/join?ref=CODE` | 4.1 / 4.8 | | | | | |
| `/auth/error` | 4.1 | | | | | |
| `/community` | 4.6 | | | | | |
| `/community/[id]` | 4.6 | | | | | |
| `/members` (redirect → /community) | 4.6 | | | | | |
| `/members/[id]` (redirect) | 4.6 | | | | | |
| `/leaderboard` (redirect → /community) | 4.6 | | | | | |
| `/profile` | 4.7 | | | | | |
| `/profile/progression` | 4.7 | | | | | |
| `/profile/trophies` | 4.7 | | | | | |
| Onboarding wizard (modal, global) | 4.20 | | | | | |
| Twitter/X link flow (profile + callback) | 4.21 | | | | | |
| `/earn` | 4.8 / 4.15 | | | | | |
| `/quests` (redirect → /earn?tab=quests) | 4.8 | | | | | |
| `/rewards` (redirect → /earn?tab=rewards) | 4.15 | | | | | |
| `/ideas` | 4.12 | | | | | |
| `/ideas/[id]` | 4.12 | | | | | |
| `/ideas/harvest` | 4.12 | | | | | |
| `/posts` | 4.13 | | | | | |
| `/posts/[id]` | 4.13 | | | | | |
| `/tasks` | 4.9 | | | | | |
| `/tasks/[id]` | 4.9 | | | | | |
| Twitter/X engagement submission in task detail | 4.21 | | | | | |
| `/tasks/templates` | 4.9 | | | | | |
| `/admin/submissions` | 4.9 / 4.17 | | | | | |
| `/sprints` | 4.10 | | | | | |
| `/sprints/[id]` | 4.10 | | | | | |
| `/sprints/past` | 4.10 | | | | | |
| `/proposals` | 4.11 | | | | | |
| `/proposals/new` | 4.11 | | | | | |
| `/proposals/[id]` | 4.11 | | | | | |
| `/disputes` | 4.14 | | | | | |
| `/disputes/[id]` | 4.14 | | | | | |
| `/notifications` | 4.16 | | | | | |
| `/admin` | 4.17 | | | | | |
| `/admin/settings` | 4.17 / 4.24 | | | | | |
| `/admin/rewards` | 4.15 / 4.17 | | | | | |
| `/admin/users` | 4.17 | | | | | |
| `/marketplace` | 4.26 | | | | | |
| `/for-projects` | 4.22 | | | | | |
| `/share/egg/[number]` | 4.23 | | | | | |

> **Coverage check** (2026-04-21): every item in `src/components/layout/nav-config.ts` is represented in this matrix (cross-referenced against `mainItemDefs`, admin nav, and utility nav).

### 4.26 Marketplace (feature-flagged)
<!-- qa-status: NEW-SECTION | severity: S2 | last verified: 2026-04-13 -->
Route: `/marketplace`. Guard: `isMarketplaceEnabled()` flag.

Use cases:
- [ ] `MKT-01` Tabs (`Active Boosts`, `My Boosts`, `+ Create Boost`) render without text wrap at 375px (historical S1 — Active/My labels wrapped).
- [ ] `MKT-02` Tab label heights consistent (historical: inconsistent 32/64 heights).
- [ ] `MKT-03` Boost creation flow: form validates and posts.
- [ ] `MKT-04` Active boosts list renders with author + cost + expiry.
- [ ] `MKT-05` When flag disabled: sidebar entry hidden + route returns 404 / disabled state.
- [ ] `MKT-06` EN + ZH locale parity.

**Last verified:** 2026-04-13.

---

## 6) Workflow findings ticket template (copy one per issue)

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

## 7) End-of-session synthesis (input for revamp planning)

Fill only after sections 4 and 5 are complete.

- Total workflows run:
- Total pages audited:
- Pass/fail summary:
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

---

## 8) Change log

See `docs/qa-runbook-change-log.md` for a history of runbook revisions (what was added, removed, reorganized).
