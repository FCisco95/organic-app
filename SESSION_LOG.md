# Session Log

Add newest entries at the top.

## 2026-03-23 (Session: QA Revamp — 4.19 Ideas Incubator)

### Summary

Ran prototype-executor for section 4.19 Ideas Incubator. Built 3 competing UI prototypes in parallel worktrees, user selected Proto C (Stripe/Vercel) with Reddit vote rail cards from Proto A and app-wide style consistency (dark hero matching Analytics/Treasury). Iterated twice, merged to main.

### What was done

- Loaded QA revamp plan from `docs/plans/2026-03-23-ideas-incubator-qa-revamp.md`
- Designed 3 directions: A (ProductHunt/Reddit), B (Linear/Notion), C (Stripe/Vercel)
- Launched 3 parallel worktree subagents, dev servers on 3001/3002/3003
- User chose Proto C base + Proto A vote rail cards + terracotta hero
- Iterated: replaced terracotta hero with dark gray gradient to match Analytics/Treasury
- Added orange underline tabs with icons (Flame for Trending) matching app-wide tab pattern
- Added stagger animations matching existing app sections
- Merged to main (`65f9722`), cleaned up all 3 worktrees
- Updated qa-dashboard: 4.19 status → REVAMPED

### Key changes

- Dark hero with 3 principle cards (Propose / Discuss / Promote)
- KPI cards with trend indicators (▲/▼ percentages) and progress bars
- Tab-based feed: All / Trending / Promoted with orange underline tabs
- Reddit-style vote rail cards (ChevronUp/Down, author avatars, relative timestamps)
- Modal composer (Dialog-based) with character counts and mobile FAB
- Detail page: activity timeline sidebar, breadcrumb nav, horizontal vote panel
- GitHub-style threaded comments with connector lines and avatars
- Extracted 5 reusable components: IdeaFeedCard, IdeaKpiCard, IdeaComposerDialog, IdeaTimeline, IdeaEmptyState
- i18n complete for en, pt-PT, zh-CN

## 2026-03-23 (Session: QA Revamp — 4.18 Twitter/X)

### Summary

Ran prototype-executor for section 4.18 Twitter/X. Built 3 competing UI prototypes in parallel worktrees, user selected Prototype A (Stripe Connected Accounts), merged to main.

### What was done

- Designed 3 radically different UI directions: A (Stripe), B (Linear), C (Vercel)
- Launched 3 parallel worktree subagents to build each prototype
- Started dev servers on ports 3001/3002/3003 for side-by-side comparison
- User chose Prototype A — cherry-picked and merged to main (`6e1b89f`)
- Added S0 launch blocker for Twitter/X OAuth production setup in qa-dashboard.md
- Added TODO checklist in `src/lib/twitter/config.ts` for production X credentials
- Updated qa-dashboard: 4.18 status → REVAMPED, completed work log updated
- Cleaned up all 3 worktrees and branches

### Key changes (Proto A — Stripe-inspired)

- Profile Twitter card: rich connected account card with avatar + X badge overlay + verified pill
- Submission form: structured card sections, color-coded engagement pills (Heart/Repeat2/MessageCircle)
- Task type badge: sky-blue X-branded pill replacing generic gray AtSign
- Review panel: styled evidence cards + blockquote comments
- Skeleton loading states throughout
- i18n keys added for all 3 locales

### Launch blocker flagged

- Twitter/X OAuth needs production credentials + callback URL before go-live (~2026-03-30)
- Currently dev relies on ngrok tunnel — must be replaced with production URL

### QA Pipeline Status

- 18/19 sections at REVAMPED or DONE
- Remaining: 4.19 Ideas Incubator (PENDING — 15 cases)

## 2026-03-22 (Session: QA Pipeline — 4.10–4.13, 4.17 Onboarding)

### Summary

Continued the QA pipeline for remaining sections: Disputes (4.10), Rewards (4.11), Notifications (4.12), Admin Ops (4.13), and Onboarding Wizard (4.17). Each went through the full test → fix → revamp cycle. 14/19 sections now DONE.

### Sections Completed

| Section | Cases | Bugs Fixed | Revamp |
|---------|-------|------------|--------|
| 4.10 Disputes | 13 | — | Linear command center |
| 4.11 Rewards | 9 | 3 (queue age, settlement color, claim validation) | Proto B GitHub — tabs, timeline chips, filter pills |
| 4.12 Notifications | 6 | 3 (bell overflow, dispute href, mark-all-read stale) | Proto C Vercel — timeline, card items, Sheet prefs |
| 4.13 Admin Ops | 8 | 3 (toast, key prop, governance warnings) | C+A combined — Stripe KPI + Linear settings nav |
| 4.17 Onboarding | 10 | 0 (all PASS) | Proto B Notion — progress bar, slide transitions, XP badges |

### Key Decisions
- Onboarding had no functional bugs (10/10 PASS) — skipped qa-fixer, went straight to prototype-executor
- User chose Proto B (Notion Cards) for onboarding: warm tone, full-width cards, rich empty states

## 2026-03-21 (Session: QA Pipeline — 4.4–4.9 batch)

### Summary

Batch-processed 6 sections through the full QA pipeline: Community (4.4), Profile (4.5), Quests (4.6), Tasks (4.7), Sprints (4.8), and revisited Proposals (4.9). All completed with fixes and revamps merged to main.

### Sections Completed

| Section | Cases | Bugs Fixed | Revamp |
|---------|-------|------------|--------|
| 4.4 Community | 12 | 6 i18n fixes | Heatmap, keyboard nav, command search, stat cards |
| 4.5 Profile | 11 | 4 (quest i18n, Twitter, community keys) | Executive dashboard, tabbed profile |
| 4.6 Quests | 11 | 1 (resolveQuestTitle) | Duolingo — progress rings, tier stepper, color-coded cards |
| 4.7 Tasks | 17 | 3 (silent errors, locale, emoji) | Mono stats, priority stripes, segmented tabs |
| 4.8 Sprints | 11 | 1 i18n fix | GitHub milestones + phase stepper/burndown, orange theme |
| 4.9 Proposals | 17 | 5 (from prior session) | Proto C — inline accordions, vote FAB, numbered stepper |

## 2026-03-19 (Session: Full Proposals QA Pipeline — test + fix + revamp)

### Summary

Ran the complete 3-step QA pipeline for section 4.9 Proposals in a single session (1M context). Re-tested all 17 PROP cases with 3 headed browsers, implemented 5 functional fixes, designed 3 competing visual prototypes in parallel worktrees, user selected Proto C (Inline Accordion), merged to main.

### Step 1: QA Tester — Full re-test

Re-tested PROP-01 through PROP-17 with 3 viewport sessions:
- Session A: Mobile 375x812, QA Member
- Session B: Desktop 1440x900, QA Admin
- Session C: Desktop 1440x900, QA Council

Results: 15 PARTIAL S2, 2 PASS S3, 1 SKIP (templates). Overall severity S2.

Key findings:
- Sticky Vote button visible on mobile when voting closed
- Garbage localhost:3003 test data polluting proposals list
- Decision Rail hidden/buried on mobile
- No execution deadline displayed for finalized proposals
- Freeze banner missing max attempt count
- Comment authors show only initials + Organic ID (no display name)
- No stage transition history visible
- Admin CTAs shown to members on mobile
- Wizard tab labels truncate on mobile

### Step 2: QA Fixer — Track 1 functional fixes

Branch: `fix/4.9-proposals-functional-fixes`

1. **Vote button visibility** — FAB only shows when `voting_ends_at > now`
2. **Garbage data cleanup** — SQL script at `scripts/cleanup-qa-garbage.sql`
3. **Execution deadline** — surfaced in Decision Rail for all finalized proposals
4. **Freeze attempt limit** — shows "2 of 3" in freeze banner (3 locales updated)
5. **Onboarding persistence** — already implemented via localStorage (QA artifact from Playwright in-memory sessions)

### Step 3: QA Revamper — Track 2 visual/UX (Proto C won)

3 prototypes built in parallel worktrees:
- **Proto A (Contextual Drawer)**: Bottom-sheet governance drawer, icon-only wizard tabs
- **Proto B (Tabbed Detail)**: 3-tab mobile structure, pill wizard tabs
- **Proto C (Inline Accordion)**: Accordion cards in flow, floating Vote FAB, numbered stepper wizard ← **SELECTED**

Proto C changes:
- Inline accordion cards on mobile for governance status, version/provenance, delegation
- Floating Vote FAB replaces sticky bar (terracotta accent, only when voting active + window open)
- Numbered stepper wizard with connected circles and Lucide icons
- Icon + short label category filters on mobile
- Comment display names: "Name · Organic #ID" format
- Stage transition history as horizontal chips below stepper
- Role-aware CTAs — admin-only buttons hidden from members

Fix applied post-selection: Preview FAB moved from `bottom-6` to `bottom-20` to avoid overlapping the sticky Next button.

### Files changed

- `src/app/[locale]/proposals/[id]/page.tsx` — detail page: inline accordions, vote FAB, stage history, display names, execution deadline in rail
- `src/app/[locale]/proposals/page.tsx` — list page: role-aware CTAs, icon category filters
- `src/components/proposals/wizard-tabs.tsx` — numbered stepper with icons
- `src/components/proposals/proposal-wizard.tsx` — Preview FAB position fix
- `src/components/voting/admin-voting-controls.tsx` — freeze attempt limit messaging
- `src/features/proposals/hooks.ts` — display_name in comments query
- `src/features/proposals/types.ts` — display_name type
- `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json` — new i18n keys
- `scripts/cleanup-qa-garbage.sql` — garbage data cleanup script
- `docs/qa-runbook.md` — section 4.9 updated with re-test results
- `docs/qa-dashboard.md` — section 4.9 → REVAMPED
- `docs/plans/2026-03-19-proposals-qa-revamp.md` — 12-task plan (all tasks complete)

### Next step

Section 4.9 is DONE (merged to main). Next priorities from dashboard:
1. 4.1 Auth — write plan from runbook feedback (S1)
2. 4.7 Tasks — plan exists, execute Phase B
3. 4.4 Members — next PENDING section to QA

---

## 2026-03-14 (Session: QA 4.9 Proposal Detail — manual QA + revamp plan)

### Summary

Ran the full manual-tester skill for section 4.9 Proposals (PROP-03 to PROP-17), testing the proposal detail page across 3 headed browser sessions with admin/council/member QA fixture accounts. All 15 cases tested — 13 PARTIAL S2, 1 SKIP (templates), 1 PASS S3 (source-idea badge). Wrote implementation plan for the revamp.

### QA findings (section 4.9, detail page)

- S2: "Voting" badge shown on proposals with expired voting windows — no closed indicator
- S2: Anti-abuse guards (threshold, cooldown, max-live) server-side only — users fill 4-step wizard before server rejection
- S2: No recovery path from frozen finalization state — dead end for operators
- S2: Two-column layout doesn't render side-by-side until xl (1280px) breakpoint
- S2: No execution deadline visible for passed proposals
- S2: No stage progress visualization across the proposal lifecycle
- S2: Mobile actions not sticky, hard to reach on long proposals
- Severity: S2, Confidence: 4/5

### Plan written

`docs/plans/2026-03-14-proposal-detail-revamp.md` — 8 tasks across 2 tracks:

**Track 1 — Functional fixes:**
1. Voting closed indicator (VotingPanel + detail page condition)
2. Pre-flight eligibility API + wizard gate
3. Freeze recovery button (admin-voting-controls)
4. Execution deadline surface (detail page + sidebar)

**Track 2 — Visual/UX revamp:**
5. Two-column layout breakpoint fix (xl → lg)
6. Stage progress stepper component
7. Mobile sticky action bar
8. Voting bar tracks + comment avatar initials

### Files changed

- `docs/qa-runbook.md` — Section 4.9 PROP-03 to PROP-17 marked with results + full feedback block
- `docs/plans/2026-03-14-proposal-detail-revamp.md` — **NEW**: 8-task implementation plan
- `docs/plans/4.9-proposals-revamp-progress.md` — Updated Round 3 status to QA complete + plan written
- `BUILD_PLAN.md` — Added section 4.9 progress entry
- `SESSION_LOG.md` — This entry

### Next step

`/clear` → execute the plan via `executing-plans` or `prototype-executor` skill.

---

## 2026-03-08 (Session: QA 4.7 Tasks visual revamp — prototype workflow)

### Summary

Ran the full QA prototype workflow for the Tasks surface (section 4.7): headed Playwright QA audit of all 17 TASK test cases, built 3 competing visual prototypes in isolated worktrees, opened side-by-side headed browser comparison for user selection, and combined user's picks into prototype D — merged as PR #18.

### QA findings (section 4.7)

- S0: Silent error handling throughout tasks page (console.error only, no user feedback)
- S1: Emoji icons violating design system (💬📤👥 instead of Lucide)
- S1: Missing loading/empty states for task list
- S2: Accessibility gaps (no column headers, no focus indicators)
- Severity: S1, Confidence: 4

### Prototype workflow

- **Alt A** (Clean List Focus): compact stats strip, accessible headers, polished list
- **Alt B** (Dark Hero + Pipeline): dark gradient hero, 5-step status pipeline with chevrons, 4px status left-border
- **Alt C** (Contributor-First): personal stats strip, recommended tasks scroll, progress bars, earnings emphasis

### User selections for combined prototype D

- Dark gradient hero from Alt B (visible to ALL users, not auth-gated)
- Original 4 KPIs (open execution, pending review, needs assignee, community queue) with Lucide icons in colored boxes (Alt C style)
- Orange hover left-border on task rows (user invention, inspired by Alt B highlight)
- Progress bars per task with status-colored fills (from Alt C)
- 4-column grid — removed redundant status column (replaced by inline progress bar)
- Emoji → Lucide icon replacement in task board
- Tighter filter bar layout

### Files changed (PR #18)

- `src/app/[locale]/tasks/page.tsx` — dark hero with 4 KPIs, removed conditional auth rendering
- `src/components/tasks/task-list-section.tsx` — orange hover border, progress bars, 4-col grid
- `src/components/tasks/task-board.tsx` — Lucide icons replacing emoji
- `src/components/tasks/task-filters-bar.tsx` — tighter layout
- `docs/qa-runbook.md` — section 4.7 QA feedback

### Cleanup

- All 4 prototype worktrees removed
- All prototype branches deleted (local + remote)
- Dev servers stopped, browser sessions closed

---

## 2026-03-08 (Session: Console error audit + InfoButton revamp)

### Summary

Fixed post-login redirect (AUTH-04), eliminated ~40-50 console errors (AUTH-10), enhanced the InfoButton component with bold text support, and added/rewrote InfoButton copy across 5 pages using engaging copywriter-style explanations.

### Implementation highlights

- Auth fixes:
  - OAuth/magic-link callback redirects to Home (`/`) instead of `/profile`, with `returnTo` param support
  - CSP updated to allow EU Sentry endpoint (`ingest.de.sentry.io`)

- Console error elimination:
  - Hydration mismatches fixed: `formatTimeAgo` wrapped in client-only `<TimeAgo>`, trust pulse timestamp in `<ClientTime>`, sprint countdown gated behind `mounted` state
  - Unhandled promise rejections fixed: `.catch()` on wallet adapter imports, auth `getSession()`, notification `getUser()`
  - Realtime callbacks wrapped in try/catch with `.maybeSingle()` for actor lookups (activity + notifications)
  - Leaderboard #1 avatar given `priority` for LCP optimization
  - Playwright verification: 0 errors across 4 pages (Home, Analytics, Leaderboard, Treasury)

- InfoButton enhancement + copy:
  - Component now supports `**bold**` markers parsed into `<strong>` elements
  - Tasks list page (`/tasks`): new InfoButton with "What Are Tasks?", "The Task Flow", "Earning & Reputation"
  - Task Detail page (`/tasks/[id]`): new InfoButton with "Reading This Task", "Claiming & Submitting", "After Submission"
  - Analytics, Leaderboard, Treasury: all copy rewritten with engaging bold-section explanations
  - All 3 locales updated (en, pt-PT, zh-CN)

- Planning:
  - Created `docs/plans/2026-03-08-tasks-qa-revamp.md` for full 3-prototype QA workflow (Workstream B, next session)

### Files changed

- `next.config.js` — CSP connect-src for EU Sentry
- `src/app/[locale]/auth/callback/route.ts` — redirect to Home + returnTo support
- `src/app/[locale]/page.tsx` — ClientTime + mounted guard for hydration
- `src/app/[locale]/tasks/page.tsx` — InfoButton added
- `src/app/[locale]/tasks/[id]/page.tsx` — InfoButton added
- `src/app/[locale]/leaderboard/page.tsx` — avatar priority
- `src/components/dashboard/activity-item.tsx` — TimeAgo client-only component
- `src/components/ui/info-button.tsx` — bold text parser
- `src/features/activity/hooks.ts` — try/catch + maybeSingle in realtime
- `src/features/auth/context.tsx` — catch on getSession
- `src/features/auth/wallet-provider.tsx` — catch on adapter imports
- `src/features/notifications/hooks.ts` — catch on getUser + try/catch in realtime
- `messages/{en,pt-PT,zh-CN}.json` — InfoButton copy for 5 pages

### Next session

- Execute Workstream B: QA section 4.7 (Tasks) full 3-prototype revamp
- Plan at `docs/plans/2026-03-08-tasks-qa-revamp.md`, Tasks 5-8
- Process: headed Playwright QA → 3 worktree prototypes → user comparison → combine → merge

## 2026-03-07 (Session: Auth QA revamp + auth boundary S1 fixes)

### Summary

Completed the manual-tester skill Phase 2 for QA section 4.1 (Auth flows). Generated 3 coded design alternatives in parallel worktrees, collected user feedback, created a combined version (Alt B's split panel + Alt C's card shadow + Alt A's card styling), and merged to main. Then fixed the two S1 auth boundary issues identified during QA testing.

### Implementation highlights

- Auth page visual revamp:
  - New `AuthSplitPanel` component with branded left panel and mouse-follow radial glow
  - Split-panel layout for `/login`, `/signup`, `/auth/error` (desktop: branding left, form right)
  - Card styling: subtle 2px terracotta accent line, warm shadow, `rounded-lg`
  - Auth-specific CSS animations (`auth-fade-in` stagger classes, `auth-shake` keyframe)
  - AppShell conditionally hidden on auth routes via `isAuthRoute()` in `layout-client.tsx`
  - New i18n keys across all 3 locales for auth page copy

- Auth boundary S1 fixes:
  - Server-side route protection added to `middleware.ts` for protected routes (`/profile`, `/notifications`, `/rewards`, `/quests`, `/disputes`, `/sprints`, `/admin`)
  - `returnTo` query param: unauthenticated users redirected to `/login?returnTo=/original-path`, login page redirects back after success
  - Profile page blank-state fix: shows loading spinner with "Redirecting..." instead of `return null`

- Housekeeping:
  - Created `manual-tester` skill at `.agents/skills/manual-tester/` with SKILL.md + 5 reference files
  - Cleaned up 4 prototype worktrees and 41 QA screenshot files
  - Added `.gitignore` entries for QA artifacts (`qa-*.png`, `alt-*.png`, `.playwright*`)
  - Updated `docs/qa-runbook.md` with section 4.1 feedback block

### Files changed

- `src/middleware.ts` — route protection + `returnTo` redirect
- `src/app/[locale]/login/page.tsx` — split panel + `returnTo` support
- `src/app/[locale]/signup/page.tsx` — split panel + card styling
- `src/app/[locale]/auth/error/page.tsx` — split panel + card styling
- `src/app/[locale]/profile/page.tsx` — blank-state fix
- `src/app/[locale]/globals.css` — auth stagger animation classes
- `src/components/auth/auth-split-panel.tsx` — new shared component
- `src/components/layout-client.tsx` — auth route shell bypass
- `tailwind.config.ts` — auth animation keyframes
- `messages/{en,pt-PT,zh-CN}.json` — auth page i18n keys + Profile.redirecting
- `docs/qa-runbook.md` — section 4.1 feedback
- `.gitignore` — QA artifact patterns

## 2026-03-01 (Session: documentation deep-dive sync + QA coverage expansion)

### Summary

Performed a full documentation truth-sync pass across operating guidance, roadmap/status docs, project context, and QA runbook coverage so docs match current implementation reality (including partial Phase 20 onboarding delivery, launch-gate blockers, and the in-repo Phase 28 app-layer work).

### Implementation highlights

- Cross-agent guidance alignment:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `GEMINI.md`
  - Added/strengthened references for `PROJECT_CONTEXT.md` and `docs/qa-runbook.md` as living docs that must be maintained with workflow changes.

- Roadmap/status normalization:
  - `BUILD_PLAN.md`
  - Added explicit `Phase 20a — Onboarding Foundation` partial-delivery status.
  - Marked implemented onboarding DB/API/UI checklist items as complete; left cohort-oriented scope pending.
  - Updated members remaining scope to cohort onboarding expansion.
  - Preserved and integrated existing `Phase 28` addition; linked to `docs/phase-28-ideas-incubator-plan.md`.
  - Added `Phase 28a` partial-delivery status and updated Phase 28 API/UI/feature-flag checklist progress.

- Product-context truth sync:
  - `PROJECT_CONTEXT.md`
  - Removed stale open-item references that are now implemented (proposal threshold/anti-abuse).
  - Reframed onboarding as partially delivered (wizard/progress) with cohorts/polish pending.

- README accuracy refresh:
  - `README.md`
  - Replaced outdated scaffold/planned-feature statements with current platform status and open priorities.
  - Updated key-feature and schema summaries to include integrity controls, quests/referrals, and onboarding foundation.

- Manual QA coverage expansion:
  - `docs/qa-runbook.md`
  - Added fixture guidance for onboarding-incomplete users and Twitter/X engagement tasks.
  - Expanded profile/task/proposal sections with Twitter/onboarding/threshold/cooldown/degraded execution-window checks.
  - Added new workflow packs:
    - `4.17 Onboarding Wizard and Progress APIs`
    - `4.18 Twitter/X Linking and Engagement Verification Workflow`
    - `4.19 Ideas Incubator Workflow (Feature-Flagged)`
  - Extended page-audit matrix with onboarding, Twitter, and ideas-specific flows.

- Included in-flight Phase 28 app-layer files and build hardening:
  - Ideas app surfaces and feature module were retained in this branch (`src/app/[locale]/ideas/**`, `src/app/api/ideas/**`, `src/features/ideas/**`, `src/config/feature-flags.ts`, nav updates).
  - Included Ideas DB/type plumbing already present in workspace (`supabase/migrations/20260301230000_phase28_ideas_incubator.sql`, `src/types/database.ts`, and proposal source-idea UI badge wiring).
  - Fixed Ideas vote type narrowing regression in `src/app/api/ideas/[id]/vote/route.ts`.
  - Fixed client/server boundary issue in `src/app/[locale]/ideas/[id]/page.tsx` (removed client import of server-only module).

### Validation evidence

- `npm run lint`: PASS.
- `npm run build`: PASS.

## 2026-03-01 (Session: Supabase environment + pipeline sync hardening)

- Clarified operational DB ownership:
  - Main DB (`dcqfuqjqmqrzycyvutkn`) is source-of-truth runtime DB.
  - CI DB (`rrsftfoxcujsacipujrr`) is GitHub Actions automation/testing DB.
- Added migration sync utility: `scripts/qa/sync-supabase-migrations.mjs`.
  - Supports dry-run checks, apply mode, drift-equivalent error tolerance, migration-history recording, and PostgREST schema reload.
- Added new workflow: `.github/workflows/supabase-migration-sync.yml`.
  - Triggers on `main` pushes affecting migrations (and manual dispatch).
  - Applies/records local migrations on both main and CI projects.
- Hardened `.github/workflows/ci.yml`:
  - Added `supabase-ci-target-check` guard job.
  - Switched E2E/audit jobs to prefer `CI_*` Supabase secrets with fallback.
  - Added config guard to prevent CI/main project-ref collision when both refs are provided.
- Updated documentation:
  - `README.md` with explicit Main vs CI DB strategy, required secrets, and sync commands.
  - `docs/qa-runbook.md` setup matrix with manual QA target clarification.

## 2026-03-01 (Session: execution-window hardening + operational-controls CI gate)

### Summary

Implemented release-readiness follow-up work for execution-window resilience and CI evidence automation by introducing a DB-backed execution-window RPC path and a dedicated operational-controls CI gate with audit artifact export.

### Implementation highlights

- Proposal execution-window hardening:
  - `supabase/migrations/20260301170000_proposal_execution_window_rpc.sql`
  - Added `apply_proposal_execution_window(UUID)` RPC:
    - enforces finalized+passed eligibility,
    - computes deadline from `voting_config.execution_window_days`,
    - writes `execution_status='pending_execution'` and `execution_deadline` in Postgres.
  - Added grants for `authenticated` and `service_role`.
- Finalize API integration:
  - `src/app/api/proposals/[id]/finalize/route.ts`
  - On passed proposals, route now calls `apply_proposal_execution_window` via RPC.
  - Added compatibility fallback: when RPC is missing from PostgREST cache (`PGRST202` / `42883`), route falls back to legacy direct write path and logs warnings.
- Supabase type updates:
  - `src/types/database.ts`
  - Registered `apply_proposal_execution_window` in typed function map.
- CI operational-controls gate + evidence artifacts:
  - `.github/workflows/ci.yml`
  - Added `e2e-operational-controls` job:
    - runs `tests/voting-integrity.spec.ts` + `tests/rewards-settlement-integrity.spec.ts`,
    - captures test output to `test-results/operational-controls-playwright.log`,
    - exports audit snapshot JSON and uploads artifacts.
  - `e2e-full-evidence` now depends on both `e2e-integrity` and `e2e-operational-controls`.
- Audit export utility:
  - `scripts/qa/export-operational-controls-audit.mjs`
  - Queries `reward_settlement_events` + `proposal_stage_events` since run start and writes `test-results/operational-controls-audit.json`.

### Validation evidence

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `CI=true npx playwright test tests/voting-integrity.spec.ts tests/rewards-settlement-integrity.spec.ts --workers=1 --reporter=list` (escalated CI-mode): PASS (`4 passed`, `~1.5m`).
- Runtime note: target environment still reports PostgREST schema-cache drift:
  - `PGRST202` for new `apply_proposal_execution_window` (migration not yet visible in cache),
  - fallback legacy write path still hits `PGRST204` for `execution_deadline`.
  - Finalization flow remains successful and non-blocking under this fallback posture.

## 2026-03-01 (Session: launch-gate closure pass - operational-controls rerun + evidence attachment)

### Summary

Executed the phase-19b launch-gate closure pass by fixing transient voting-start RPC failures, hardening finalize behavior for schema-cache drift, rerunning operational-controls suites in escalated CI-mode, and attaching fresh audit evidence to the release-gate artifact.

### Implementation highlights

- Proposal start-voting transient RPC resilience:
  - `src/app/api/proposals/[id]/start-voting/route.ts`
  - Added bounded retry wrapper (`max=3`) for retryable RPC error code `42P07` (`tmp_snapshot_holders_agg` collision path).
  - Added structured warning logs for transient retries with attempt count and proposal id context.
- Proposal finalize schema-cache drift handling:
  - `src/app/api/proposals/[id]/finalize/route.ts`
  - Added explicit non-fatal handling for `PGRST204` on execution-window writes (`execution_deadline` path), preserving finalize success while surfacing drift as warning.
- Release-gate documentation and status updates:
  - `docs/plans/2026-02-20-core-features-revamp-release-gate.md`
  - Added 2026-03-01 evidence log rows, marked operational-controls evidence artifact checklist complete, and attached latest reward/proposal audit row snapshots.
  - Added explicit schema-cache drift verification subsection and updated residual-risk/decision rationale.
- Roadmap status refresh:
  - `BUILD_PLAN.md`
  - Updated latest revalidation snapshot to 2026-03-01 with current targeted-suite and blocker posture.

### Validation evidence

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `CI=true npx playwright test tests/voting-integrity.spec.ts tests/rewards-settlement-integrity.spec.ts --workers=1 --reporter=list` (escalated CI-mode):
  - pre-fix rerun: partial failure (`2 passed`, `1 failed`, `1 flaky`) due transient `42P07`.
  - post-fix rerun: PASS (`4 passed`, `1.6m`).
- Supabase audit evidence extraction (escalated networking):
  - Command output archived to `/tmp/phase19b_audit_snapshot.json`.
  - Captured latest `reward_settlement_events` (`integrity_hold`, `kill_switch`) and `proposal_stage_events` (`finalization_kill_switch`, `finalization_manual_resume`) rows tied to the post-fix run.

## 2026-02-25 (Session: operational controls evidence hardening - rewards hold/kill-switch + voting freeze recovery)

### Summary

Implemented non-manual launch-readiness hardening for operational controls by extending integrity specs with audit-event assertions and documented recovery evidence procedures.

### Implementation highlights

- Rewards settlement integrity assertions expanded:
  - `tests/rewards-settlement-integrity.spec.ts`
  - Added fixture precondition guard for missing org fixture.
  - Added assertions for:
    - `settlement_blocked_reason` semantics,
    - kill-switch timestamp posture,
    - `reward_settlement_events` rows (`integrity_hold` and `kill_switch`) including idempotency key, reason, actor, and metadata source.
  - Added `/api/rewards` assertions for settlement reason/timestamp visibility (`held` and `killed` paths).

- Voting finalization freeze/recovery assertions expanded:
  - `tests/voting-integrity.spec.ts`
  - Added finalized-state persistence checks (dedupe key, attempts, frozen flag) for idempotent finalize path.
  - Added freeze-path audit assertions against `proposal_stage_events` (`finalization_kill_switch`) including dedupe key/attempt metadata.
  - Added audited manual recovery simulation:
    - manual unfreeze update,
    - explicit `finalization_manual_resume` audit event insert,
    - resumed finalize success assertions.

- Runbook and release-gate documentation updates:
  - `docs/qa-runbook.md`
  - Added section `4.16 Operational Controls (Automated Evidence)` with:
    - reproducible CI-mode command,
    - expected assertions checklist,
    - SQL audit queries for rewards and proposal freeze/resume evidence.
  - `docs/plans/2026-02-20-core-features-revamp-release-gate.md`
  - Updated operational-controls criteria to automated evidence semantics and added explicit artifact requirements checklist.

### Validation evidence

- Targeted operational-controls command:
  - `CI=true npx playwright test tests/voting-integrity.spec.ts tests/rewards-settlement-integrity.spec.ts --workers=1 --reporter=list`
  - Result: FAIL in this environment due transient Supabase DNS resolution (`getaddrinfo EAI_AGAIN ...supabase.co`) while creating/fetching QA fixtures.
- `npm run lint`: PASS.
- `npm run build`: PASS.

## 2026-02-23 (Session: quests + referrals rollout, admin gamification controls, and QA runbook update)

### Summary

Finalized and packaged the full quests/referrals revamp session into a single delivery, including DB-backed quests, referral program, burn-to-level mechanics, admin gamification controls, new `/quests` experience, navigation rewiring, and documentation updates.

### Implementation highlights

- Quests and referrals platform foundation:
  - `supabase/migrations/20260223100000_quests_referrals_burns.sql`
  - Added `quests`, `referral_codes`, `referrals`, `referral_rewards`, `point_burns`.
  - Extended `orgs.gamification_config` and updated `award_xp` trigger for `manual_burn` mode.
- Gamification engines and contracts:
  - `src/features/gamification/quest-engine.ts`
  - `src/features/gamification/referral-engine.ts`
  - `src/features/gamification/burn-engine.ts`
  - `src/features/gamification/types.ts`
  - `src/features/gamification/schemas.ts`
  - `src/features/gamification/hooks.ts`
  - Refactored quest loading to DB-driven objectives and added referral/burn query + mutation hooks.
- API surfaces:
  - `src/app/api/referrals/route.ts`
  - `src/app/api/referrals/validate/route.ts`
  - `src/app/api/referrals/complete/route.ts`
  - `src/app/api/gamification/burn-cost/route.ts`
  - `src/app/api/gamification/burn/route.ts`
  - `src/app/api/admin/quests/route.ts`
  - `src/app/api/admin/quests/[id]/route.ts`
  - `src/app/api/admin/gamification/config/route.ts`
- Quests + referral UX delivery:
  - `src/app/[locale]/quests/page.tsx`
  - `src/components/gamification/quests-page.tsx`
  - `src/components/gamification/referral-section.tsx`
  - `src/components/gamification/quest-level-sidebar.tsx`
  - `src/components/gamification/quest-grid.tsx`
  - `src/components/gamification/quest-card.tsx`
  - `src/components/gamification/burn-confirm-dialog.tsx`
- Route and navigation rewiring:
  - `src/app/[locale]/join/page.tsx`
  - `src/app/[locale]/signup/page.tsx`
  - `src/app/[locale]/profile/progression/page.tsx` (legacy redirect to `/quests`)
  - `src/components/layout/nav-config.ts`
  - `src/components/layout/sidebar.tsx`
  - `src/components/layout/mobile-sidebar.tsx`
  - `src/components/layout/top-bar.tsx`
  - `src/components/settings/settings-tabs.tsx`
  - `src/app/[locale]/admin/settings/page.tsx`
  - `src/components/settings/gamification-tab.tsx`
- i18n and docs:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
  - `docs/qa-runbook.md` updated with a dedicated manual test section for referrals/quests/admin-gamification (`4.15`).

### Post-implementation hardening (same session)

- Referral completion authorization guard added to prevent unauthorized completion calls.
- Referral link origin generation aligned to request origin / app URL fallback instead of hardcoded domain.
- Referral code generation race-condition handling added for parallel requests.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/gamification-quests-api.spec.ts`: blocked in this environment due Supabase DNS resolution error (`EAI_AGAIN`).
- Local dev runtime smoke from this environment was also constrained by sandbox port binding (`EPERM` on `0.0.0.0` bind), so live HTTP route checks were limited.

## 2026-02-21 (Session: gamification revamp checkpoint - progression source context + navigation wiring)

### Summary

Completed the follow-up implementation pass for progression usability by wiring source-aware navigation, source-context messaging, and quest CTA fallback coverage across the app shell.

### Implementation highlights

- Progression source context + routing:
  - `src/app/[locale]/profile/progression/page.tsx`
  - Parses `from` query param (`tasks | proposals | profile`) and passes source context into progression UI.
- Progression shell enhancements:
  - `src/components/gamification/progression-shell.tsx`
  - Added source-context banner + return CTA.
  - Added default quest CTA fallback for unmapped quest IDs.
- Navigation wiring:
  - `src/components/layout/sidebar.tsx`
  - `src/components/layout/mobile-sidebar.tsx`
  - `src/components/layout/top-bar.tsx`
  - `src/components/navigation.tsx`
  - Progression links now append `?from=` based on current section and preserve active-state matching by normalizing query-bearing hrefs.
- Profile quick action:
  - `src/app/[locale]/profile/page.tsx`
  - Progression shortcut now deep links with `?from=profile`.
- Quest data freshness:
  - `src/features/gamification/hooks.ts`
  - Added optional live refetch interval to `useQuestProgress`.
- Localization + tests:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - Added source-context/fallback CTA translation keys.
  - `tests/profile.spec.ts` now asserts progression deep link query and source-context banner visibility.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/profile.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - grouped quest objectives in progression UI)

### Summary

Wired grouped quest objectives into the progression shell with cadence buckets, reset timers, and context-aware CTA hints, using the new quests API payload.

### Implementation highlights

- Progression quest UI revamp:
  - `src/components/gamification/progression-shell.tsx`
  - Added grouped quest columns (`daily`, `weekly`, `long_term`) with:
    - cadence completion counters,
    - per-objective progress bars and remaining counts,
    - relative reset timers (`Intl.RelativeTimeFormat`),
    - quest-level CTA links to relevant flows (`tasks`, `proposals`, `profile`),
    - fallback rendering from overview summary if detailed quest endpoint data is unavailable.
- Localization coverage for new quest UI:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
  - Added cadence labels, status labels, fallback notice, CTA labels, and per-quest localized title/description copy.
- Quest summary i18n hygiene:
  - `src/features/gamification/quest-engine.ts`
  - Removed hard-coded English summary note (`note` now `null`) so UI remains locale-controlled.
- Test updates:
  - `tests/profile.spec.ts`
  - Added progression assertions for cadence quest sections.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/profile.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - quest model + quest progress API)

### Summary

Implemented the quest model and authenticated quest progress API for daily, weekly, and long-term objectives, using existing activity/reputation data sources.

### Implementation highlights

- Quest model and evaluator:
  - `src/features/gamification/quest-engine.ts`
  - Added static objective catalog (`daily | weekly | long_term`) and server evaluator to compute progress, completion, remaining, progress percent, and reset timestamps.
  - Progress data derives from `activity_log`, `xp_events`, `user_activity_counts`, `user_profiles`, and `user_achievements`.
- Gamification contracts:
  - `src/features/gamification/types.ts`
  - `src/features/gamification/schemas.ts`
  - Added typed/schematized quest cadence, quest progress item payload, grouped objective response, and summary shape.
- New API endpoint:
  - `src/app/api/gamification/quests/route.ts`
  - Authenticated `GET` route returning quest progress payload with private cache headers.
- Overview integration:
  - `src/app/api/gamification/overview/route.ts`
  - Replaced static quest summary placeholder with quest-engine summary (graceful fallback if quest computation fails).
- Client hook:
  - `src/features/gamification/hooks.ts`
  - Added `useQuestProgress` and query key for `/api/gamification/quests`.
- Tests:
  - `tests/gamification-quests-api.spec.ts`
  - Added authenticated payload-shape and unauthenticated `401` checks.
- Plan artifact:
  - `docs/plans/2026-02-21-gamification-quest-model-api.md`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/gamification-quests-api.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: gamification revamp checkpoint - members/profile readability + privacy)

### Summary

Completed the next gamification revamp checkpoint focused on making member/profile progression surfaces easier to read and safer for private profiles.

### Implementation highlights

- Member detail readability and navigation:
  - `src/app/[locale]/members/[id]/page.tsx`
  - Added section jump nav (`overview`, `reputation`, `achievements`) and stable test anchor.
  - Improved private-profile state copy and added a direct link to profile privacy settings for the owner.
  - Achievements section now renders an explicit empty state when no unlocks exist.
- Member card privacy clarity:
  - `src/components/members/member-card.tsx`
  - Added explanatory private-profile copy and retained high-signal stats preview.
- Profile privacy controls:
  - `src/app/[locale]/profile/page.tsx`
  - Integrated `useUpdatePrivacy` mutation to let users toggle profile visibility directly from profile.
  - Added dedicated privacy panel with status, hints, action CTA, and success/error toasts.
- API privacy hardening:
  - `src/app/api/achievements/route.ts`
  - Added unlock-status gating for `?userId=` requests so private profiles do not leak achievement unlock status.
- i18n coverage:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - Added copy for profile visibility controls, private-profile explanations, and member section navigation labels.
- Tests:
  - `tests/members-profile-surface-revamp.spec.ts`
  - Added assertions for member section navigation and profile privacy panel/toggle.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/members-profile-surface-revamp.spec.ts`: all skipped in this environment due missing required Supabase env vars/fixtures.

## 2026-02-21 (Session: UI/UX revamp wave 2 - slices 6–8 + sign-off)

### Summary

Completed the remaining three feature-vertical UI/UX revamp slices (Members & Profile, Notifications & Auth, Admin Ops) plus the cross-feature consistency pass, closing Wave 2.

### Slice 6 — Members and Profile

- Task 1 (failing tests):
  - Created `tests/members-profile-surface-revamp.spec.ts` with three serial tests: members directory filters/trust-cues, member profile header/stats/reputation, profile page identity/activity/preferences sections.
  - Extended `tests/profile.spec.ts` with new `Profile section layout` describe block asserting section test IDs.
- Task 2 (members directory and member profile revamp):
  - `src/components/members/member-filters.tsx`: added `data-testid="members-filter-search"` and `data-testid="members-filter-role"`.
  - `src/components/members/member-grid.tsx`: added `data-testid="members-grid"` and `data-testid="members-pagination"`.
  - `src/components/members/member-card.tsx`: added `data-testid="member-card-${id}"`, `data-testid="member-role-badge"`, `data-testid="member-level-badge"`.
  - `src/app/[locale]/members/page.tsx`: added `data-testid="members-page"` wrapper.
  - `src/app/[locale]/members/[id]/page.tsx`: added `data-testid="member-profile-page"`, `member-profile-header`, `member-stats-grid`, `member-reputation-section`, `member-achievements-grid`.
- Task 3 (profile page structure and preferences flows):
  - `src/app/[locale]/profile/page.tsx`: imported `ReputationSummary`; added `data-testid="profile-page"`, `profile-identity-section`, `profile-reputation-section` (new section using `ReputationSummary`), `profile-activity-section`, `profile-preferences-section`.
  - `src/components/reputation/reputation-summary.tsx`: added `data-testid="reputation-summary"`.
  - `src/components/notifications/notification-preferences.tsx`: added `data-testid="notification-preferences"`.

### Slice 7 — Notifications and Auth

- Task 1 (failing tests):
  - Created `tests/notifications-auth-surface-revamp.spec.ts` with four serial tests: notifications filter tabs/preferences toggle, login page form, signup page form, auth error page recovery actions.
  - Extended `tests/proposals.spec.ts` with `Auth page structure` describe block.
- Task 2 (notifications page revamp):
  - `src/app/[locale]/notifications/page.tsx`: added `data-testid="notifications-page"`, `notifications-preferences-toggle`, `notifications-filter-tabs`, `notifications-list`.
- Task 3 (auth pages revamp):
  - `src/app/[locale]/login/page.tsx`: added `data-testid="login-page"` and `login-form`.
  - `src/app/[locale]/signup/page.tsx`: added `data-testid="signup-page"` and `signup-form`.
  - `src/app/[locale]/auth/error/page.tsx`: added `data-testid="auth-error-page"`.

### Slice 8 — Admin Ops

- Task 1 (failing tests):
  - Created `tests/admin-ops-surface-revamp.spec.ts` with two serial tests: admin settings page tabs/content panel, admin submissions page.
  - Extended `tests/admin-config-audit.spec.ts` with `Admin settings page structure` describe block.
  - Extended `tests/tasks.spec.ts` with `Admin submission review page structure` describe block.
- Task 2 (admin revamp):
  - `src/app/[locale]/admin/settings/page.tsx`: added `data-testid="admin-settings-page"`, `admin-settings-tabs` wrapper, `admin-settings-content`.
  - `src/app/[locale]/admin/submissions/page.tsx`: added `data-testid="admin-submissions-page"` wrapper.
  - `src/components/tasks/task-review-panel.tsx`: added `data-testid="task-review-panel"`.

### Cross-feature consistency pass

- `src/app/[locale]/globals.css`: added Wave 2 consistency token block (`--transition-ui`, `--section-radius`, `--section-padding`) and documenting comment for section card pattern and type scale conventions.

### Validation

- `npm run lint`: passed (no ESLint warnings or errors).
- `npm run build`: passed (production build clean, all pages compiled successfully).

### Sign-off document

- `docs/plans/2026-02-20-ui-ux-revamp-wave2-signoff.md`

## 2026-02-20 (Session: UI/UX revamp wave 2 - disputes slice)

### Summary

Executed the disputes vertical slice for Wave 2, shipping a triage-first queue and a detail-page integrity rail focused on SLA urgency, evidence chronology, and explicit escalation posture.

### Implementation highlights

- Queue and command posture revamp:
  - `src/app/[locale]/disputes/page.tsx`: command deck framing, queue/mine control anchors.
  - `src/components/disputes/DisputeQueue.tsx`: triage deck counters, SLA/tier filters, escalation controls.
  - `src/components/disputes/DisputeCard.tsx`: SLA urgency chip + escalation cue per dispute row.
  - `src/components/disputes/DisputeStats.tsx`: operational snapshot framing + stats anchors.
- Detail integrity rail revamp:
  - `src/app/[locale]/disputes/[id]/page.tsx`: detail page anchors and comments panel anchoring.
  - `src/components/disputes/DisputeDetail.tsx`: two-column casefile + integrity rail with explicit deadline/evidence/response/mediation panels.
  - `src/components/disputes/DisputeTimeline.tsx`: timeline + deadline chip anchors.
- Action ergonomics:
  - `src/components/disputes/RespondPanel.tsx`: response guardrail copy and submission i18n.
  - `src/components/disputes/ResolvePanel.tsx`: neutralized resolution panel theme and resolution guardrail copy.
  - `src/components/disputes/CreateDisputeModal.tsx`: filing guardrail, localized eligibility/cancel copy, and modal anchors.
- Shared SLA helpers:
  - `src/features/disputes/sla.ts`: added urgency and escalation-candidate helpers used across queue/detail UI.
- Tests:
  - Added `tests/disputes-surface-revamp.spec.ts`.
  - Updated `tests/disputes.spec.ts` and `tests/dispute-sla.spec.ts` with additional transparency assertions.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/disputes-surface-revamp.spec.ts tests/disputes.spec.ts tests/dispute-sla.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: UI/UX revamp wave 2 - sprints slice)

### Summary

Executed the sprints vertical slice for Wave 2, adding phase-first command context on the list surface and an operator-focused detail rail for sprint execution/readiness.

### Implementation highlights

- Sprints command deck revamp (`src/app/[locale]/sprints/page.tsx`):
  - Added phase rail with explicit stage posture, countdown chip, settlement status panel, and stable test anchors.
  - Added view-tab and page-level anchors for resilient UI checks.
- Sprint board/list/timeline surface updates:
  - `src/components/sprints/sprint-board-view.tsx`: stronger sprint selection context, status chips, settlement state panel, and backlog anchor surfaces.
  - `src/components/sprints/sprint-list-view.tsx`: phase rail section + per-card anchors for active/planning/completed rows.
  - `src/components/sprints/sprint-timeline.tsx`: timeline-level anchors for UI integrity checks.
- Sprint detail operator layout (`src/app/[locale]/sprints/[id]/page.tsx`):
  - Added two-column operator grid with explicit phase timeline, settlement blocker panel, and readiness checklist.
  - Added stable anchors for all operator zones.
- Lifecycle dialog clarity:
  - `src/components/sprints/sprint-start-dialog.tsx`: start checklist context.
  - `src/components/sprints/sprint-complete-dialog.tsx`: completion checklist context.
- Tests:
  - Added `tests/sprints-surface-revamp.spec.ts`.
  - Extended `tests/sprints.spec.ts` and `tests/sprint-phase-engine.spec.ts` with sprint surface anchors.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/sprints-surface-revamp.spec.ts tests/sprints.spec.ts tests/sprint-phase-engine.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: UI/UX revamp wave 2 - proposals slice)

### Summary

Executed the first vertical slice of the wave-2 UI/UX revamp plan for proposals, covering list trust framing, detail decision rail architecture, creation wizard feedback improvements, and test-anchor hardening.

### Implementation highlights

- Proposals list trust framing (`src/app/[locale]/proposals/page.tsx`):
  - Added governance signal strip with stage chips and action hierarchy.
  - Added lifecycle/category filter test anchors and result anchors.
- Proposal card hierarchy (`src/components/proposals/ProposalCard.tsx`):
  - Added explicit decision-context row and stable `data-testid` per card.
- Proposal detail decision rail (`src/app/[locale]/proposals/[id]/page.tsx`):
  - Introduced two-column layout with right-side decision rail.
  - Added vote window panel, version context panel, immutable provenance callout.
  - Added stable anchors: `proposal-showcase`, `proposal-decision-rail`, `proposal-vote-window`, `proposal-version-context`, `proposal-provenance-callout`, `proposal-comments`, `proposal-task-list`.
- Proposal sections and creation flow updates:
  - Added structured/legacy section anchors in `src/components/proposals/ProposalSections.tsx`.
  - Updated creation header and lifecycle hint in `src/app/[locale]/proposals/new/page.tsx`.
  - Added wizard workflow context + validation summary + action anchors in `src/components/proposals/ProposalWizard.tsx`.
- Tests:
  - Added `tests/proposals-surface-revamp.spec.ts`.
  - Extended `tests/proposals.spec.ts` and `tests/proposals-lifecycle.spec.ts` with revamp anchors.
- i18n updates:
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/proposals-surface-revamp.spec.ts tests/proposals.spec.ts tests/proposals-lifecycle.spec.ts --workers=1`: all skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 9 implementation)

### Summary

Implemented Task 9 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (trust-surface revamps for homepage, treasury, analytics), including UX trust widgets, treasury/analytics trust metadata payloads, i18n coverage, and new Playwright checks.

### Implementation highlights

- Homepage trust pulse revamp:
  - `src/app/[locale]/page.tsx` now shows sprint countdown, proposal stage mix, leaderboard snapshot, and recent activity with freshness metadata.
- Treasury trust transparency revamp:
  - `src/app/api/treasury/route.ts` now returns trust metadata (`emission_policy`, `latest_settlement`, audit link, refresh cadence).
  - `src/components/treasury/treasury-hero.tsx` and `src/app/[locale]/treasury/page.tsx` now surface policy/settlement posture and update cadence.
- Analytics liveness revamp:
  - `src/app/api/analytics/route.ts` now returns 30-day trust aggregates (proposal throughput, dispute aggregate, vote participation, active contributor signals).
  - `src/components/analytics/kpi-cards.tsx` and `src/app/[locale]/analytics/page.tsx` now render governance health + trust panel/freshness metadata.
- Domain/schema updates:
  - Added trust typings/schemas in `src/features/treasury/{types,schemas}.ts` and `src/features/analytics/{types,schemas}.ts`.
  - Tightened freshness cadence in `src/features/treasury/hooks.ts` and `src/features/analytics/hooks.ts`.
- Tests added:
  - `tests/home-trust-surface.spec.ts`
  - `tests/treasury-transparency.spec.ts`
  - `tests/analytics-liveness.spec.ts`
- i18n updates:
  - Added Task 9 copy in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Follow-up runtime fix:
  - `src/components/analytics/kpi-cards.tsx` now passes `{ symbol }` to `kpi.orgHolders` translation to avoid `FORMATTING_ERROR`.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/home-trust-surface.spec.ts tests/treasury-transparency.spec.ts tests/analytics-liveness.spec.ts --workers=1`: pass (3/3).
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/profile.spec.ts --workers=1`: skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 8 implementation)

### Summary

Implemented Task 8 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Admin Configurability and Audit Trail Expansion), including required-change-reason enforcement, new admin policy knobs, append-only settings audit events, and admin settings UI updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220123000_admin_config_and_audit_events.sql`
  - new org policy config fields: `governance_policy`, `sprint_policy`,
  - append-only `admin_config_audit_events` table with immutable update/delete guards,
  - RLS policies for admin insert and admin/council read access.
- Expanded settings domain validation/types:
  - `src/features/settings/schemas.ts` now validates governance/sprint policy knobs and extended rewards settlement knobs.
  - `PATCH /api/settings` payload now requires `reason` and at least one mutable field.
  - `src/features/settings/types.ts` now includes `GovernancePolicyConfig`, `SprintPolicyConfig`, and extended `RewardsConfig`.
- Updated settings API orchestration:
  - `src/app/api/settings/route.ts` now:
    - enforces required `reason`,
    - applies org/voting config updates,
    - writes per-scope append-only audit rows (`org`, `voting_config`, `governance_policy`, `sprint_policy`, `rewards_config`) with previous/new payload snapshots.
- Updated settings UI:
  - `src/components/settings/settings-field.tsx` save bar now requires reason input before save.
  - `src/components/settings/{general,token,treasury,governance,sprints,rewards}-tab.tsx` now submit `reason`; governance/sprints/rewards include new policy controls.
  - `src/app/[locale]/admin/settings/page.tsx` passes governance policy to governance tab.
  - i18n updates in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added tests:
  - `src/features/settings/__tests__/config-validation.test.ts`
  - `tests/admin-config-audit.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/settings/__tests__/config-validation.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/admin-config-audit.spec.ts --workers=1`: skipped in this environment due missing required Supabase env vars.

## 2026-02-20 (Session: Governance integrity Task 7 implementation)

### Summary

Implemented Task 7 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (XP-first leaderboard revamp), including DB ranking semantics, API-level deterministic ranking fallback, leaderboard hook/type additions, and XP-priority UX copy updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220120000_xp_leaderboard_view_refresh.sql`
  - refreshed `leaderboard_view` ranking to XP-first ordering with deterministic tie-breakers (`xp_total`, `total_points`, `tasks_completed`, `id`)
  - refreshes `leaderboard_materialized` when present.
- Updated leaderboard API:
  - `src/app/api/leaderboard/route.ts` now:
    - orders leaderboard rows by XP-first posture,
    - computes rank deterministically in server code,
    - falls back from `leaderboard_materialized` to `leaderboard_view` on query failure,
    - supports `?fresh=1` to bypass `unstable_cache` for deterministic test runs.
- Updated reputation domain layer:
  - `src/features/reputation/types.ts` now includes `LeaderboardEntry` types and XP-first ranking helpers.
  - `src/features/reputation/hooks.ts` now includes `useLeaderboard`.
- Updated leaderboard/reputation UI:
  - `src/app/[locale]/leaderboard/page.tsx` now consumes `useLeaderboard` and presents XP as primary metric, points as secondary context.
  - `src/components/reputation/reputation-summary.tsx` now includes points-as-tie-break context and XP-priority hint.
  - i18n updates in `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`.
- Added tests:
  - `src/features/reputation/__tests__/leaderboard-ordering.test.ts`
  - `tests/leaderboard-xp-priority.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/leaderboard-xp-priority.spec.ts --workers=1`: blocked in this environment due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 6 implementation)

### Summary

Implemented Task 6 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Rewards Settlement and Emission Safety), including DB-level settlement integrity controls, append-only reward settlement ledger events, payout idempotency hardening, sprint settlement orchestration updates, and rewards UX integrity visibility.

### Implementation highlights

- Added migration: `supabase/migrations/20260220113000_rewards_settlement_integrity.sql`
  - new settlement integrity metadata fields on `sprints`,
  - append-only `reward_settlement_events` with immutable update/delete guards,
  - distribution idempotency fields on `reward_distributions`,
  - settlement commit RPC: `commit_sprint_reward_settlement` (emission cap, carryover policy, debt prohibition, integrity hold, kill-switch).
- Updated sprint completion orchestration:
  - `src/app/api/sprints/[id]/complete/route.ts` now commits reward settlement integrity before closure and returns explicit settlement hold payloads.
- Updated reward APIs:
  - `src/app/api/rewards/route.ts` now returns latest settlement posture fields for UI.
  - `src/app/api/rewards/distributions/route.ts` now enriches epoch rows with settlement integrity status/reason.
  - `src/app/api/rewards/distributions/manual/route.ts` now applies deterministic dedupe keys and returns `409` for duplicate inserts.
  - `src/app/api/rewards/claims/[id]/pay/route.ts` now blocks duplicate payout distributions per claim.
- Updated rewards domain and UI:
  - Added settlement policy helpers: `src/features/rewards/settlement.ts`.
  - Added unit coverage: `src/features/rewards/__tests__/settlement.test.ts`.
  - Added e2e coverage scaffold: `tests/rewards-settlement-integrity.spec.ts`.
  - `src/components/rewards/rewards-overview.tsx` now surfaces settlement status/cap/carryover/hold reason.
  - `src/components/rewards/distributions-table.tsx` now displays settlement posture for epoch payouts.
- Updated supporting surfaces:
  - `src/features/rewards/schemas.ts`, `src/features/rewards/types.ts`, `src/features/rewards/index.ts`
  - `src/features/sprints/hooks.ts`, `src/app/api/sprints/route.ts`, `src/app/api/sprints/[id]/route.ts`, `src/app/api/sprints/[id]/start/route.ts`
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `npx playwright test tests/rewards-settlement-integrity.spec.ts tests/rewards.spec.ts --workers=1`: pass with partial execution (6 passed, 2 skipped due in-flight sprint guard in the Task 6 integrity spec).

### Follow-up fix (same day)

- Added migration `supabase/migrations/20260220114500_rewards_settlement_integrity_lock_fix.sql` to update `commit_sprint_reward_settlement` from `FOR UPDATE` to `FOR UPDATE OF s`, resolving Postgres error `0A000: FOR UPDATE cannot be applied to the nullable side of an outer join`.

## 2026-02-20 (Session: Governance integrity Task 5 implementation)

### Summary

Implemented Task 5 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Review and Disputes SLA Hardening), including DB SLA sweep automation, dispute-window filing gates, late-evidence lifecycle tracking, and disputes timeline transparency updates.

### Implementation highlights

- Added migration: `supabase/migrations/20260220110000_dispute_sla_and_evidence_rules.sql`
  - new append-only `dispute_evidence_events` table with late markers (`is_late`, `late_reason`)
  - deadline integrity constraints on `disputes`
  - overdue reviewer sweep RPC: `sweep_overdue_dispute_reviewer_sla`
  - pg_cron schedule: `sweep-overdue-dispute-reviewer-sla` (every 15 minutes)
- Updated dispute APIs:
  - `src/app/api/disputes/route.ts` now enforces dispute filing only during sprint `dispute_window` and uses fixed 72h reviewer response SLA.
  - `src/app/api/disputes/evidence/route.ts` now enforces PNG/JPG/PDF uploads, per-dispute max files, hard-close checks, and dispute-bound late-evidence events.
  - `src/app/api/disputes/[id]/respond/route.ts` now rejects responses after response deadline or window close.
  - `src/app/api/disputes/[id]/resolve/route.ts` now enforces window-close guard (admin override retained).
  - `src/app/api/disputes/[id]/route.ts` now returns signed evidence event timeline data.
- Added domain/test helpers:
  - `src/features/disputes/sla.ts` and `src/features/disputes/__tests__/sla-rules.test.ts`
  - `tests/dispute-sla.spec.ts`
  - `tests/helpers.ts` now supports dispute-window sprint fixture provisioning.
- Updated disputes UI:
  - `src/components/disputes/DisputeTimeline.tsx` now surfaces response due/overdue and dispute-window open/closed state.
  - `src/components/disputes/DisputeDetail.tsx` now shows evidence timeline + late badges and supports post-file evidence uploads.
  - `src/components/disputes/CreateDisputeModal.tsx` upload accept list aligned with API policy.
- Updated supporting surfaces:
  - `src/features/disputes/schemas.ts`, `src/features/disputes/types.ts`, `src/features/disputes/hooks.ts`
  - `src/types/database.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`
  - `tests/disputes.spec.ts`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `npx playwright test tests/dispute-sla.spec.ts tests/disputes.spec.ts --workers=1`: blocked by external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 4 implementation)

### Summary

Implemented Task 4 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Sprint Phase Engine Revamp), including DB phase transitions, settlement safety gates, reviewer-SLA automation, phased sprint APIs, and phase-aware sprint UI.

### Implementation highlights

- Added migration: `supabase/migrations/20260220103000_sprint_phase_engine.sql`
  - extended sprint phases: `planning`, `active`, `review`, `dispute_window`, `settlement`, `completed`
  - new sprint phase timestamps + settlement integrity metadata
  - forward-only DB trigger: `trg_sprints_enforce_phase_rules`
  - settlement blocker RPC: `get_sprint_settlement_blockers`
  - reviewer SLA RPC: `apply_sprint_reviewer_sla` (+24h extension + admin notifications)
- Updated sprint APIs:
  - `src/app/api/sprints/[id]/start/route.ts` now blocks starts when any sprint is in an execution phase.
  - `src/app/api/sprints/[id]/complete/route.ts` now advances phase-by-phase and only snapshots/closes during `settlement -> completed`.
  - `src/app/api/sprints/[id]/route.ts` and `src/app/api/sprints/route.ts` now return phase metadata fields.
- Updated dispute linkage:
  - `src/app/api/disputes/route.ts` now attaches new disputes to current in-flight sprint phases, not only `active`.
- Updated sprint UI:
  - `src/app/[locale]/sprints/page.tsx` and `src/app/[locale]/sprints/[id]/page.tsx` now support phase advance actions and phase feedback.
  - `src/components/sprints/sprint-timeline.tsx` now shows phase badges, countdowns, and settlement blocked reasons.
  - `src/components/sprints/sprint-list-view.tsx` now renders dynamic phase badges.
- Added/updated tests:
  - `tests/sprint-phase-engine.spec.ts`
  - `src/features/sprints/__tests__/phase-engine.test.ts`
  - `tests/sprints.spec.ts` updated for phased completion flow
  - `tests/helpers.ts` updated to resolve current in-flight sprint across new phases
- Updated typing/i18n surfaces:
  - `src/features/sprints/types.ts`, `src/features/sprints/schemas.ts`, `src/features/sprints/hooks.ts`
  - `src/types/database.ts`, `src/types/index.ts`
  - `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass (non-fatal existing leaderboard revalidation warning appears during build in this environment).
- `node --test src/features/sprints/__tests__/phase-engine.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/sprint-phase-engine.spec.ts tests/sprints.spec.ts tests/disputes.spec.ts`: failed due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`), not due local phase-engine assertions.

## 2026-02-20 (Session: Governance integrity Task 3 implementation)

### Summary

Implemented Task 3 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Proposal-Task Linkage Revamp), including immutable DB provenance constraints, API creation gating, provenance UI surfaces, and new linkage tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220100000_proposal_task_linkage.sql`
  - new `tasks.proposal_version_id` column
  - composite provenance constraints from `tasks(proposal_id, proposal_version_id)` to `proposal_versions(proposal_id, id)`
  - immutable proposal-link trigger: `trg_tasks_enforce_proposal_provenance`
  - creation gate in trigger: proposal-linked tasks require finalized/passed proposal state (legacy `approved` handled as finalized/passed compatibility)
- Updated task APIs and schemas:
  - `src/app/api/tasks/route.ts` validates proposal lifecycle gate and current-version binding before insert.
  - `src/app/api/tasks/[id]/route.ts` includes proposal/proposal-version provenance in response payloads.
  - `src/app/api/tasks/[id]/subtasks/route.ts` inherits proposal provenance from parent tasks.
  - `src/features/tasks/schemas.ts` adds `proposal_version_id` to create schema and removes proposal-link fields from update schema.
  - `src/features/tasks/types.ts` and `src/types/database.ts` updated for new provenance types/relationships.
- Updated UI surfaces:
  - `src/components/tasks/task-detail-summary.tsx` now shows governance source + immutable version badge.
  - `src/app/[locale]/tasks/[id]/page.tsx` fetch/update queries now include provenance relations.
  - `src/app/[locale]/proposals/[id]/page.tsx` now creates tasks via `/api/tasks`, enforces finalized/passed creation path, and shows linked execution tasks with source version badges.
- Added tests:
  - `tests/proposal-task-flow.spec.ts`
  - `src/features/tasks/__tests__/proposal-linkage.test.ts`
- Added provenance i18n keys in:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/tasks/__tests__/proposal-linkage.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/proposal-task-flow.spec.ts tests/tasks.spec.ts`: skipped in this environment because required Supabase env vars are not loaded.

## 2026-02-20 (Session: Governance integrity Task 2 implementation)

### Summary

Implemented Task 2 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Voting Snapshot and Finalization Integrity), including DB migration, API hardening, voting UI updates, and new integrity-focused tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220093000_voting_snapshot_integrity.sql`
  - new proposal integrity metadata:
    - `server_voting_started_at`
    - `finalization_dedupe_key`
    - `finalization_attempts`
    - `finalization_last_attempt_at`
    - `finalization_failure_reason`
    - `finalization_frozen_at`
  - new immutable effective-power snapshot table:
    - `proposal_voter_snapshots`
  - new RPCs:
    - `resolve_proposal_snapshot_delegate` (deterministic cycle break to self-power)
    - `start_proposal_voting_integrity` (atomic snapshot + transition to `voting`)
    - `finalize_proposal_voting_integrity` (idempotent lock + dedupe + retry + freeze)
- Updated voting APIs:
  - `src/app/api/proposals/[id]/start-voting/route.ts` now uses transactional snapshot RPC.
  - `src/app/api/proposals/[id]/finalize/route.ts` now uses idempotent finalize RPC and returns idempotency/freeze metadata.
  - `src/app/api/proposals/[id]/vote/route.ts` now reads weight from `proposal_voter_snapshots` first (legacy fallback to `holder_snapshots`).
  - `src/app/api/proposals/[id]/effective-power/route.ts` now uses snapshot power once voting starts/finalizes.
- Updated voting domain/UI:
  - `src/features/voting/schemas.ts` and `src/features/voting/types.ts` expanded for dedupe/freeze/snapshot payloads.
  - `src/features/voting/hooks.ts` now propagates API error codes.
  - `src/components/voting/AdminVotingControls.tsx` now surfaces frozen-finalization state.
  - `src/components/voting/VotingPanel.tsx` now fetches user voting weight from `/api/proposals/[id]/vote`.
- Added tests:
  - `tests/voting-integrity.spec.ts`
  - `src/features/voting/__tests__/snapshot-integrity.test.ts`
- Updated i18n keys for frozen finalization messaging:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `node --test src/features/voting/__tests__/snapshot-integrity.test.ts`: blocked (`.ts` test runner wiring not configured for `node --test`).
- `npx playwright test tests/voting-integrity.spec.ts`:
  - first run skipped (missing env vars).
  - env-loaded run attempted, but failed in this environment due external DNS/network resolution to Supabase (`getaddrinfo EAI_AGAIN ...supabase.co`).

## 2026-02-20 (Session: Governance integrity Task 1 implementation + migration execution)

### Summary

Completed Task 1 from `docs/plans/2026-02-20-core-features-revamp-test-implementation-plan.md` (Proposal Lifecycle Stage Engine), including DB schema/RPC/trigger work, proposal domain/API/UI updates, lifecycle i18n additions, and dedicated lifecycle tests.

### Implementation highlights

- Added migration: `supabase/migrations/20260220090000_proposal_stage_engine.sql`
  - lifecycle status extensions for `proposal_status`
  - proposal versioning model (`proposal_versions`)
  - append-only transition ledger (`proposal_stage_events`)
  - override TTL expiry RPC (`expire_proposal_override_promotions`)
  - comment-to-version linkage via `comments.proposal_version_id`
- Added tests:
  - `src/features/proposals/__tests__/lifecycle.test.ts`
  - `tests/proposals-lifecycle.spec.ts`
- Updated proposal surfaces:
  - domain schemas/types/hooks
  - proposal API routes (`/api/proposals`, `/api/proposals/[id]`, `/api/proposals/[id]/status`, comments + start-voting compatibility)
  - proposal detail/list UI and status badge
  - voting admin controls start condition (`discussion` compatibility)
- Added/updated proposal lifecycle copy in:
  - `messages/en.json`
  - `messages/pt-PT.json`
  - `messages/zh-CN.json`
- Updated generated DB types in `src/types/database.ts`.

### Migration execution chronology

- Migration A (enum-only step) applied successfully.
- Migration B initially failed in SQL editor with:
  - `cannot ALTER TABLE "proposal_versions" because it has pending trigger events`
- Resolution:
  - run enum additions in separate committed step (A)
  - in B, flush deferred constraints before RLS table alteration (`SET CONSTRAINTS ALL IMMEDIATE;`)
- Result: Migration B applied successfully after fix.

### Validation evidence

- `npm run lint`: pass.
- `npm run build`: pass.
- `npx playwright test tests/proposals-lifecycle.spec.ts`:
  - initially skipped (missing env vars)
  - then failed with `ECONNREFUSED` until app server was running
  - final run passed with env loaded and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`.

### Environment/setup note

- `.env.local` sourcing error (`tweet.read: command not found`) traced to unquoted `TWITTER_OAUTH_SCOPE`.
- Local fix used: quote scope value so shell `source` works.

### Related non-governance adjustment

- Build validation surfaced an unrelated strict-cast issue in `src/app/[locale]/admin/submissions/page.tsx`; applied minimal type-cast compatibility fix to unblock production build validation during this workstream.

