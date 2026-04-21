# Mobile UX/UI Audit Report — 2026-04-21

**Author:** automated audit + synthesis
**Branch:** `docs/mobile-qa-runbook`
**Scope:** every primary route in `docs/qa-runbook.md` section 5
**Benchmarks:** Linear iOS app (as of 2026-04-21), Notion iOS app, Vercel web (`vercel.com` on mobile Safari)
**Related PRs shipped during audit window:** #61 (iter4 landscape/i18n/touch-target), #62 (sprints review→done), #63 (pulse data fixes), #64 (translation admin toggles + task translation)

---

## 0) Methodology + honesty

This report **synthesizes** four iterations of live mobile QA already committed to `docs/plans/mobile-qa-findings.md` and `docs/plans/qa-full-app-audit-2026-04-13.md`, and adds two lenses the existing work did not cover:

1. **Organic-behavior incentives** — does the screen visibly reward authentic activity?
2. **Bot-friction signals** — does the screen include friction against automation without punishing humans?

Screenshots were not re-captured for this round. Iterations 1–3 produced image artifacts (`screenshots/mobile-qa/`), and iter4 (PR #61) covered landscape, i18n stress, and a final touch-target pass. Re-screenshotting 45 routes inside this audit window would have duplicated Iter 4 without adding signal. The recommendation block calls out where a fresh screenshot pass is still needed before the next revamp cycle.

**Primary viewport:** iPhone 13 (390×844). Secondary: Pixel 7 (412×915). Spot-check: small Android (360×640).

**Severity taxonomy:** `S0` blocker · `S1` bad UX · `S2` polish · `S3` nit.

---

## 1) Scoring rubric

Each screen is scored 1–10 on eight axes. 10 = best-in-class (Linear/Notion/Vercel equivalent or better); 7 = shippable; 5 = noticeably behind peers; below 5 = needs revamp.

1. **Hierarchy** — primary action scans first; weight/size contrast present.
2. **Touch targets** — interactive elements ≥44×44 pt; no system-gesture conflicts.
3. **Density** — information-dense without cramping; not wasteful of vertical pixels.
4. **Copy clarity** — labels, empty states, errors: specific, scannable, localized.
5. **Motion** — purposeful, `prefers-reduced-motion` respected, no scroll jank.
6. **States** — loading, empty, error, success all credible.
7. **Organic-behavior incentives** — visible reward for authentic activity (XP/points feedback, streaks, referral hooks, next-action affordances).
8. **Bot-friction signals** — friction against automation (rate-limits surfaced humanely, post cost visible, flag/report accessible, wallet-gate on cheap-to-spam actions).

---

## 2) Per-screen scorecards

> Benchmark lines reference specific patterns from Linear, Notion, or Vercel as of 2026-04-21. When gap = `0` the screen already matches or exceeds the benchmark.

### 2.1 Public / pre-auth

#### `/` (home, unauthenticated)
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 7 | Trust Pulse + proposals readable; "Get Started" CTA no longer clipped (Iter 3) |
| Touch targets | 7 | CTAs now ≥44px; Launch banner dismiss fixed Iter 2 |
| Density | 6 | Proposal stage grid was clipping `Qualified:0 / Discussion:0` cells; fixed Iter 2 |
| Copy clarity | 6 | `dashboard.activity.viewAll` still raw key as of Iter 1 (S1); `$ORG price —` has no explanation |
| Motion | 7 | No janky scroll; carousel behaves |
| States | 6 | Unauthenticated state is fine; authed state has 2 missing i18n keys |
| Organic incentives | 6 | Carousel CTAs surface "View Tasks", "View Proposals" — decent, but no streak/XP preview for the signed-in peek |
| Bot-friction | 4 | No visible rate-limit or anti-bot cues on the landing; public CTAs don't hint at wallet/identity gate |
**Avg:** 6.1 · **Benchmark:** Linear's mobile landing shows a single focused CTA + product screenshot; Organic shows a dense dashboard with useful context but weaker primary-action hierarchy. **Gap:** 1 S1 (`viewAll` key), 1 S3 ($ORG empty copy). · **Status:** `shippable, needs polish`.

#### `/login`, `/signup`, `/auth/error`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 8 | Form-first, hero text supporting; top-aligned on mobile |
| Touch targets | 9 | Inputs, password toggle, CTAs, secondary links all ≥44px after Iter 2/3 |
| Density | 8 | Correct for auth |
| Copy clarity | 8 | i18n error messages replace raw Supabase output |
| Motion | 8 | None required |
| States | 7 | Loading spinner present; `twitter_linked=0&reason=...` callback covered |
| Organic incentives | 6 | Referral banner on `/join?ref=CODE` — good; signup doesn't preview what XP/Organic-ID unlocks |
| Bot-friction | 5 | No captcha, no rate-limit messaging visible; Supabase throttles upstream but UX does not surface it |
**Avg:** 7.4 · **Benchmark:** Vercel login surfaces SSO-first; Organic correctly shows email/password for DAO context. **Gap:** 0 functional. Bot-friction score low — auth surface is a cheap spam vector. · **Status:** `shippable`.

#### `/for-projects`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 7 | Hero → plan selector → pricing; correct ladder |
| Touch targets | 7 | Open menu 40×40 until Iter 2 shared fix; now 44×44 |
| Density | 7 | No overflow at 375 |
| Copy clarity | 7 | EN clean; ZH not spot-checked this iteration |
| Motion | 8 | Static |
| States | 6 | No lead-capture state surfaced inline (contact CTA opens external?) |
| Organic incentives | 5 | Marketing page — off-axis, but doesn't seed XP/founder-badge hooks |
| Bot-friction | 5 | Public form (if any) — no captcha surfaced |
**Avg:** 6.5 · **Benchmark:** Vercel Pricing. **Gap:** hero lacks motion/editorial rhythm; look template-adjacent. · **Status:** `shippable, revamp candidate`.

### 2.2 Navigate (Home group)

#### `/pulse`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 4 | Tab bar + DateRangeSelector overflowed horizontally (S1 Iter 1); fixed to flex-col Iter 3 |
| Touch targets | 5 | DexScreener / GeckoTerminal buttons were 25px tall (S1); Iter 3 status unclear |
| Density | 6 | Once fixed, charts render with reasonable density |
| Copy clarity | 6 | Chart legends + axis labels translated; distribution-summary cards missing until PR #63 |
| Motion | 7 | Chart renders once; no pathological redraws |
| States | 5 | Concentration bars missing entirely before PR #63 (empty state, no error copy) |
| Organic incentives | 5 | Personal tab shows the user's own metrics (good); no "next action" prompt from metrics ("you're 200 XP from level 4") |
| Bot-friction | 4 | Anti-bot is not the job of analytics, but distribution concentration bars are literally the anti-bot signal surface — hiding them removed the whole point |
**Avg:** 5.3 · **Benchmark:** Linear Insights (mobile) uses a sticky single segmented control + horizontally scrolling chart cards. **Gap:** 1 S1 until PR #63 merges. · **Status:** `needs revamp`.

#### `/vault` (treasury)
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 8 | Hero → emission policy → balances; clear stack |
| Touch targets | 8 | No flagged issues; Open menu now 44×44 |
| Density | 7 | Balance cards could tighten whitespace |
| Copy clarity | 7 | Emission policy readable; settlement states (held/killed/paid) need plain-language tooltip |
| Motion | 8 | None required |
| States | 7 | Explorer links present; empty balance state unclear when no activity |
| Organic incentives | 5 | Shows where treasury goes but not how the viewer earns it — weak feedback loop to task/sprint contributions |
| Bot-friction | 5 | Treasury is view-only so low direct risk; but it could surface "settlement kill-switch triggered" events to prove governance integrity and reduce trust-farming |
**Avg:** 6.9 · **Benchmark:** Notion's finance page. **Gap:** emission policy isn't editorial enough — misses a chance to tell the value story. · **Status:** `shippable, revamp candidate`.

### 2.3 Govern

#### `/proposals`, `/proposals/new`, `/proposals/[id]`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 5 | Decision Rail buried on mobile (S2); wizard tab labels truncate |
| Touch targets | 7 | Proposals list OK; sticky Vote shown when voting closed (S2) |
| Density | 6 | Listing is fine; detail overly tall |
| Copy clarity | 6 | Comment author name missing — only avatar initial + Organic ID |
| Motion | 7 | No issues |
| States | 5 | Stage transition history hidden; no execution-deadline display |
| Organic incentives | 6 | Vote action + finalize lifecycle creates clear earn-moment |
| Bot-friction | 8 | Threshold gate (`S3`) + anti-abuse cooldown (`S3`) + token-holder signatures + Organic-ID gate on composer — solid |
**Avg:** 6.3 · **Benchmark:** Linear Proposals (internal) + Snapshot.org mobile: Snapshot puts a single sticky vote bar with timeline scrubbed above. **Gap:** Decision Rail needs collapse-to-sticky at breakpoint; finalize attempt-count should be exposed. · **Status:** `revamp candidate` (already in `docs/plans/2026-03-19-proposals-qa-revamp.md`).

#### `/ideas`, `/ideas/[id]`, `/ideas/harvest`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Feed + KPI strip + weekly spotlight — loaded; mobile looks "template" |
| Touch targets | 6 | `Trending` tab 42px (2px shy); `Back to ideas` link 20px (S1) |
| Density | 6 | Feed cards fine; detail page sparse |
| Copy clarity | 7 | Empty states readable; KPI strip flashes 0 before data |
| Motion | 7 | Minimal |
| States | 6 | Skeleton persists for unauthed (S0 shared with `/posts`, `/community`) |
| Organic incentives | 8 | Vote score + promote-to-proposal is a clean progression — contributor gets a visible path |
| Bot-friction | 7 | Organic-ID gate on create, self-vote blocked explicitly, comment Organic-ID gate |
**Avg:** 6.6 · **Benchmark:** Product Hunt mobile — Organic equivalents are richer but visually generic. **Gap:** feed is the #1 revamp candidate for an organic-ux pass. · **Status:** `revamp candidate`.

#### `/disputes`, `/disputes/[id]`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 5 | Non-party members see admin triage controls (S1); queue+detail over-scroll on mobile |
| Touch targets | 7 | Queue tabs use `overflow-x-auto` correctly |
| Density | 5 | Detail single-column and extremely long |
| Copy clarity | 6 | Evidence file names display as UUIDs (S3) |
| Motion | 7 | None |
| States | 6 | "Unassigned" shown for access-denied instead of explicit block |
| Organic incentives | 5 | Resolve flow shows XP impact estimate — good; filing flow doesn't preview XP risk |
| Bot-friction | 7 | Role-gated mediate/assign; rate-limit not surfaced but path itself is high-friction |
**Avg:** 6.0 · **Benchmark:** GitHub Issues tabbed detail layout. **Gap:** role-leakage is S1 — must fix before ZH/EN parity campaign. · **Status:** `revamp candidate`.

### 2.4 Build

#### `/tasks`, `/tasks/[id]`, `/tasks/templates`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Tab bar overflow at 375 (S1 per Iter 1 — verify post-Iter 4); filter bar cramped |
| Touch targets | 7 | Action buttons generally fine after Iter 3 |
| Density | 7 | List density acceptable; detail OK |
| Copy clarity | 7 | Twitter task engagement context messaging added; templates readable |
| Motion | 8 | None |
| States | 6 | `task_assignees` 400 historically blocked join/submit flow (Iter 1 S0 cross-cutting); validate post-hotfixes |
| Organic incentives | 9 | Points per task + review→done transition + submission XP — the clearest earn loop in the app |
| Bot-friction | 8 | Proposal-linked task gate; Organic-ID gate on claim; Twitter linked-account enforcement |
**Avg:** 7.3 · **Benchmark:** Linear issues mobile. **Gap:** tab-bar S1 confirmation + mobile submission-form cleanup. · **Status:** `shippable with monitoring`.

#### `/sprints`, `/sprints/[id]`, `/sprints/past`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Sprint detail: phase timeline + readiness checklist are strong; board columns 840px wide |
| Touch targets | 7 | Start/Complete buttons adequate; horizontal scroll affordance missing for board |
| Density | 7 | Detail dense but organized |
| Copy clarity | 7 | "Phase time remaining" with Timer icon clear |
| Motion | 7 | Phase stepper transitions smooth |
| States | 8 | Settlement panel: open/blocked badges; readiness checklist; incomplete-task handling options |
| Organic incentives | 9 | Sprint completion → pool split is the points-economy heartbeat |
| Bot-friction | 8 | Integrity/kill-switch rails exist in `reward_settlement_events`; dispute-window enforced |
**Avg:** 7.4 · **Benchmark:** GitHub Projects mobile. **Gap:** board scroll-hint. · **Status:** `shippable`.

### 2.5 Engage

#### `/posts`, `/posts/[id]`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 4 | Sort + filter pills 24–28px (S1), `Organic` pill off-screen (S1) |
| Touch targets | 4 | View toggle 26×26 (S1); pills below 44 |
| Density | 6 | Feed cards OK |
| Copy clarity | 7 | Post types (`Posts`/`Threads`/`Announcements`/`Links`/`Organic`) clear |
| Motion | 7 | Minimal |
| States | 3 | Skeleton-forever for unauthed (S0); no "sign in to read" CTA |
| Organic incentives | 9 | Points cost visible on composer + XP on engage — best-practice economy surfacing |
| Bot-friction | 9 | Creation costs points (direct anti-spam), flag pipeline accessible, Organic-ID gate |
**Avg:** 6.1 · **Benchmark:** Reddit mobile filter bar (scroll-hint gradient), Twitter for Web sort pills (compact but ≥44). **Gap:** pill sizing + Organic-pill visibility + unauth fallback. · **Status:** `revamp candidate` — fix pill S1s first, then full revamp.

#### `/community`, `/community/[id]`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 7 | Hero + Rankings tab default; podium + your-position clear |
| Touch targets | 6 | Tab buttons 42×91 / 42×94 (2px shy — S2) |
| Density | 8 | Filter chip counts, sort dropdown dense + usable |
| Copy clarity | 8 | EN + ZH clean post-fix |
| Motion | 7 | Tab switching OK |
| States | 4 | Unauth skeleton-forever (S0 shared), no sign-in CTA |
| Organic incentives | 9 | Rankings, your-position, streak potential — premier earn-affordance surface |
| Bot-friction | 7 | Search filters name+email+OrganicID; no rate-limit/captcha in-view |
**Avg:** 7.0 · **Benchmark:** Strava leaderboard. **Gap:** unauth state + 2px touch targets. · **Status:** `shippable`.

#### `/earn` (quests + referrals + rewards)
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Quests/Rewards tab order clean; sub-tabs inside Rewards 32px (S1) |
| Touch targets | 4 | Quest/Rewards tabs 36px; sub-tabs 32px; "Build your streak" 32px (multiple S1s) |
| Density | 7 | Cards informative |
| Copy clarity | 8 | Tier stepper (Bronze→Silver→Gold) named + glowed |
| Motion | 8 | Progress rings, glow on active tier |
| States | 7 | Empty state text present |
| Organic incentives | 10 | Literally the incentives surface — streaks, tier progression, referral copy, quest completion all visible |
| Bot-friction | 6 | Referral copy exists; no anti-farm message (referral abuse) surfaced to viewer |
**Avg:** 7.0 · **Benchmark:** Duolingo mobile tier stepper. **Gap:** all tab/sub-tab heights + claim CTA. · **Status:** `shippable, tabs need 44px pass`.

#### `/marketplace` (flag-gated)
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 5 | Tab labels wrap to 2 lines (`Active Boosts`/`My Boosts`) — S1 |
| Touch targets | 6 | Inconsistent 32/64 tab heights |
| Density | 6 | Boost cards generic |
| Copy clarity | 6 | Tab labels too long for mobile; shorten |
| Motion | 7 | None |
| States | 6 | No empty/loading verification in existing QA |
| Organic incentives | 7 | Boosts visible reward; but boosts are purchased (points sink) not earned |
| Bot-friction | 8 | Boost creation costs points → direct anti-spam |
**Avg:** 6.4 · **Benchmark:** Vercel integrations gallery. **Gap:** tab wrap S1 + empty state verification. · **Status:** `revamp candidate`.

#### `/notifications`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Bell dropdown overflows on mobile (S1, historical) |
| Touch targets | 6 | Action buttons OK; dropdown edge clipping |
| Density | 6 | Monotone "Someone Untitled" rows |
| Copy clarity | 5 | Dispute notifications route to home (`getNotificationHref` missing dispute mapping — S1) |
| Motion | 7 | None |
| States | 7 | Empty/error present |
| Organic incentives | 7 | Follow/unfollow on items creates return loop |
| Bot-friction | 6 | Preferences exist; no spam-per-user limiting messaging |
**Avg:** 6.3 · **Benchmark:** Linear inbox. **Gap:** dropdown overflow + dispute href + visual grouping. · **Status:** `revamp candidate`.

### 2.6 Profile

#### `/profile`, `/profile/progression`, `/profile/trophies`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 5 | Stats row clips 3rd column on both profile + progression (S1) |
| Touch targets | 3 | Trophy rarity chips 23px, By Category toggles 28px (S1); Change-profile-picture button 24×24 (S1); multiple sub-44 controls |
| Density | 6 | Sections numerous; mobile single-column stack OK |
| Copy clarity | 7 | Empty states ("No active streak", "Keep contributing to reach Level 2") readable |
| Motion | 7 | Progress bar animates |
| States | 8 | Privacy toggle + toast, OAuth callback toasts all fire |
| Organic incentives | 10 | Quests, achievements, rewards readiness, streak — best on-app expression of the economy |
| Bot-friction | 7 | Privacy toggle + OAuth link gated; no unlink confirmation nudge |
**Avg:** 6.6 · **Benchmark:** Duolingo profile / Strava profile. **Gap:** touch-target sweep on trophies + stats-row clip. · **Status:** `revamp candidate` (tracked `docs/plans/2026-03-21-profile-progression-fixes-v2.md`).

### 2.7 Admin

#### `/admin`, `/admin/settings`, `/admin/submissions`, `/admin/rewards`, `/admin/users`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 6 | Settings has a dedicated mobile tab impl (horizontal scroll pills) — good pattern |
| Touch targets | 7 | Admin users action buttons now 44px (Iter 3); rewards stats ribbon collapses correctly |
| Density | 5 | Users table is 8 columns, 465px h-scroll at 375 — no card fallback (S1) |
| Copy clarity | 7 | Reason-required flows present |
| Motion | 7 | None |
| States | 6 | No save success toast on settings (S2); missing React key in ClaimsTable (S2) |
| Organic incentives | 4 | Not the audience — off-axis |
| Bot-friction | 8 | Role-gated, reason-required, audit-trail hooks |
**Avg:** 6.3 · **Benchmark:** Linear admin / Vercel team settings. **Gap:** users table mobile view; save-success toast; dangerous-control warning copy. · **Status:** `shippable with monitoring`.

### 2.8 Campaign / share

#### `/share/egg/[number]`
| Axis | Score | Note |
|---|---|---|
| Hierarchy | 7 | Public share page — OG image + CTA |
| Touch targets | 7 | CTA sized appropriately |
| Density | 7 | Minimal by design |
| Copy clarity | 6 | Unclear what prize/reward level this egg maps to |
| Motion | 8 | Reduced-motion respected (per campaign spec) |
| States | 6 | Post-campaign handling not verified |
| Organic incentives | 9 | Classic viral loop — share → claim → new user earns XP |
| Bot-friction | 5 | Claim happens post-auth; but the share page itself is a bot-scrapable trigger for automated claim attempts |
**Avg:** 6.9 · **Benchmark:** Duolingo streak-share. **Gap:** post-campaign state; anti-scrape considerations on share URLs. · **Status:** `shippable, plan post-campaign ramp-down`.

---

## 3) Cross-cutting summary

### 3.1 Averages per axis
| Axis | Avg | Worst screens |
|---|---|---|
| Hierarchy | 6.0 | `/pulse`, `/posts` |
| **Touch targets** | **5.9** | `/profile/trophies`, `/posts`, `/earn` rewards sub-tabs |
| Density | 6.5 | `/disputes/[id]`, `/admin/users` table |
| Copy clarity | 6.9 | `/notifications` (dispute href), `/posts` (pill labels) |
| Motion | 7.4 | nothing critical |
| States | 6.0 | `/posts`, `/community`, `/ideas` (shared unauth S0) |
| **Organic incentives** | **7.4** | `/pulse`, `/vault`, `/for-projects` (earn-loop not surfaced) |
| **Bot-friction** | **6.4** | `/login`, `/share/egg/*`, `/pulse` (distribution bars missing) |

**App-wide mean:** 6.6/10.

### 3.2 Top 10 S0/S1 issues (prioritized)

| # | Severity | Route(s) | Issue | Fix target |
|---|---|---|---|---|
| 1 | S0 | `/posts`, `/community`, `/ideas`, `/ideas/harvest` | Skeleton-forever for unauthenticated visitors — no sign-in fallback, hurts SEO + first-visit UX | qa-fixer |
| 2 | S1 | `/posts` | `Organic` filter pill 65px off-screen at 375; no gradient scroll hint | qa-fixer |
| 3 | S1 | `/posts` | Sort + filter pills 24–28px (well under 44) | qa-fixer |
| 4 | S1 | `/pulse` | Concentration bars + distribution summary missing | shipping in PR #63 |
| 5 | S1 | `/profile`, `/profile/progression` | 3-column stats row clips the rightmost stat invisibly (no overflow scroll) | qa-fixer |
| 6 | S1 | `/profile/trophies` | Rarity filter chips 23px, toggles 28px — primary nav unusable | qa-fixer |
| 7 | S1 | `/disputes/[id]` | Non-party members see admin triage controls (role leakage) | prototype-executor (security-adjacent revamp) |
| 8 | S1 | `/sprints`, `/tasks` board | Columns force 840px / tab bar overflow at 375 with no scroll-hint | qa-fixer |
| 9 | S1 | `/notifications` | Bell dropdown clips on mobile; dispute notifications route to home | qa-fixer |
| 10 | S1 | `/admin/users` | 8-column table requires 465px h-scroll; no mobile card fallback | qa-fixer + revamp |

### 3.3 Repeated anti-patterns

- **Sub-44px pill rows** (posts, earn sub-tabs, trophy filters). Fix by raising defaults in the shared Tabs primitive rather than per-page.
- **Horizontal overflow without affordance** (posts Organic pill, sprint board, pulse tabs historically). Add a shared `ScrollHint` component that renders a right-edge gradient + subtle chevron.
- **Skeleton-forever for unauth** (posts, community, ideas). Needs a shared `UnauthFallback` with copy + Sign-In CTA at the ideas/post/community list layer.
- **Stats rows with 3 columns at 375px**. The pattern breaks repeatedly; consider 2-col-at-mobile default with "see more" in a drawer.
- **"Open menu" mobile button**: fixed at 44 Iter 2/3. Watch for regressions in new pages.

---

## 4) Organic-behavior and anti-bot deep dive

This is the unique lens this audit adds on top of iter 1–4.

### 4.1 Where the app rewards organic behavior

| Mechanism | Location | Signal quality |
|---|---|---|
| Points per task completion | `/tasks`, `/sprints` settlement | **Strong** — pool split + visible per-task points |
| XP per engagement (like/comment/reply) | `/posts`, `/proposals`, `/ideas` detail | **Strong** — points economy rules surface cost + earn |
| Referral tier progression | `/earn` referral card | **Strong** — Bronze→Silver→Gold stepper is legible |
| Streaks | `/leaderboard` redirect → `/community`, `/profile/progression` | **Medium** — streak visible but not a motivating focal point |
| Achievements / Trophies | `/profile/trophies` | **Medium** — catalog exists, chip filters broken on mobile |
| Sprint pool payout | `/sprints/[id]` settlement panel | **Strong** — clear and auditable |
| Vote participation (governance XP) | `/proposals/[id]` | **Medium** — vote gets recorded, XP impact not previewed before the cast |
| Easter egg hunt | `/share/egg/*` + in-app eggs | **Strong** — temporary viral mechanic, clean reward loop |

### 4.2 Where bots could farm value cheaply

Prioritized by expected value per bot-action and ease of automation.

| Vector | Cheap? | Current friction | Gap |
|---|---|---|---|
| **Referral farming** (fake signups to unlock tiers) | Very cheap | Wallet-linking for Organic ID; referral tier thresholds | No Organic-ID requirement on the *referrer* side surfaced to the viewer |
| **Self-voting on ideas/proposals** | Cheap | Self-vote explicitly blocked (IDEA-05) | Covered |
| **Comment flooding on posts/proposals/ideas** | Cheap | Organic-ID gate on comment creation | No per-user rate-limit surfaced in UX |
| **Post spam** | Paid | Post creation costs points directly | Covered — the economy itself is the anti-spam (points-burn) |
| **Task claim churn** (claim-unclaim loops to look active) | Cheap | Dependency rules + submission gate | Submission rate-limit not surfaced |
| **Egg collection sybil** | Cheap | Auth required before claim | Share page is scrape-triggerable; claim endpoint should rate-limit per IP + enforce auth |
| **Engagement XP farming** (self-like from alts) | Cheap once alts exist | Organic-ID per account | Alt-account detection is out of scope for UX but could surface a "sybil risk score" in admin |

### 4.3 Existing friction (working well — keep)

1. **Wallet-linked identity** (Organic ID). The central anti-bot lever. Cost of creating a fresh Organic ID = real Solana token holding, which prices out most farms.
2. **Post creation costs points**. Direct spam tax.
3. **Self-vote explicit block** on ideas (and implicit via protected actions elsewhere).
4. **Role-gated mediate/assign** in disputes (even though non-party members currently see the controls — visibility bug, not a gate bug).
5. **Sprint integrity rails** — `reward_settlement_events` kill-switch + emission cap.
6. **Comment Organic-ID gate** on proposals and ideas.

### 4.4 Recommended friction to add

Ordered by expected lift vs. human cost.

1. **Add a soft per-user rate-limit banner** on `/posts` composer and comment threads when the user is approaching a soft cap — humane, discoverable, anti-spam. Cost: low.
2. **Surface referral source on signup**. Show "You were referred by @name" on signup / first-load confirmation — humans like it; farms have to consistently fake referrer trees. Cost: low.
3. **Rate-limit egg claims by IP + device** during campaigns, with a clear "You've reached today's egg limit" state. Cost: medium.
4. **Add a visible "flag" affordance on every post and comment** with a confirmation + cool-off window (5 min) against flag spam. Cost: low.
5. **Expose `$ORG distribution concentration`** permanently on `/pulse` (post PR #63 merge) — this *is* the public anti-manipulation dashboard; hiding it undermines the whole posture. Cost: already in flight.
6. **Require an in-product signature for "dangerous" governance actions** (finalize, kill-switch override) — cheap, high-trust. Cost: medium.
7. **Add a friction-light PoW or captcha at `/signup`** once sign-up volume justifies it (not today). Cost: deferred.

---

## 5) Prioritized follow-up backlog

### 5.1 Direct to `qa-fixer`
Fast, surgical, S0/S1 fixes with browser verification.

- Skeleton-forever unauth fallback (`/posts`, `/community`, `/ideas`, `/ideas/harvest`)
- `/posts` filter-pill overflow + sub-44 pill heights
- `/profile` stats-row 3rd-column clipping
- `/profile/trophies` filter chips + toggles to 44px
- `/notifications` bell dropdown overflow + dispute href mapping
- `/earn` rewards sub-tabs + Build-your-streak to 44px
- `/marketplace` tab-label wrap/height consistency
- Sprint board + tasks tab-bar scroll hints
- Admin users table mobile card fallback (or scroll-hint minimum)

### 5.2 Direct to `prototype-executor`
Needs 3-way benchmark-driven prototype.

- `/pulse` (post PR #63) — full analytics hub revamp, Linear Insights-benchmarked
- `/ideas` feed — organic-ux overhaul (generic vibecoded UI flagged Iter 1)
- `/proposals` detail — sticky Decision Rail, stage-history timeline, vote-preview card
- `/disputes` detail — tabbed GitHub-style layout + role-aware control set
- `/notifications` — Linear-benchmarked grouped-by-time + category icons
- `/admin` dashboard — landing page + audit-trail surface

### 5.3 New feature work
Not in existing plans.

- Public `$ORG` anti-manipulation explainer on `/pulse` or `/vault` (ties PR #63 work into a narrative surface)
- Referral "you were referred by …" persistent header during first 24h
- Soft rate-limit banners on composer + comments
- Share-page anti-scrape / daily claim limit for `/share/egg/*`
- Admin sybil-risk panel (deferred; requires data model work)

---

## 6) Verification

- [x] Every route in `docs/qa-runbook.md` section 5 has a scorecard OR is covered within a grouped scorecard (e.g., `/proposals`, `/proposals/new`, `/proposals/[id]` share a card).
- [x] Every `S0`/`S1` issue has a suggested owner (`qa-fixer` vs. `prototype-executor` vs. new feature).
- [x] Backlog is single-ranked in §5.

### Known limitations
- **No fresh screenshots this pass.** Iter 1–3 artifacts live under `screenshots/mobile-qa/`; Iter 4 (PR #61) adds landscape + i18n coverage. Fresh visual captures should be taken at the start of the next revamp cycle under `docs/images/mobile-audit-2026-04-21/`.
- **Scores are best-case estimates** based on code + documented QA findings, not live instrumentation. Treat as directional; re-score per section during the revamp pass.
- **`pt-PT` not included in mean.** Locale dropped from the production selector (see runbook §1).

---

## 7) Hand-off

This report terminates the iter1 audit series. Consume it in two passes:

1. **`qa-fixer` cycle** — work §5.1 in order. Each item is <1 day; verify in headed browser and quarantine any flakey tests.
2. **`prototype-executor` cycle** — take §5.2 one screen at a time after a `/clear`, produce 3 benchmarked prototypes, pick, merge.

Do not merge revamp branches into the same PR as this report. Do not skip the `/clear` between qa-fixer and prototype-executor phases — the context boundary matters (see `CLAUDE.md` QA-and-revamp pipeline).
