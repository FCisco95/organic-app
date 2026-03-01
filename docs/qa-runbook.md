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
| Optional fixtures | At least 1 active sprint, 1 proposal in each major status, 1 rejected submission for disputes, rewards-enabled org |
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
- [ ] `AUTH-01` Guest opens `/login`; form renders and is usable.
- [ ] `AUTH-02` Guest opens `/signup`; form renders and is usable.
- [ ] `AUTH-03` Invalid credentials show understandable error copy.
- [ ] `AUTH-04` Member login succeeds and lands on authenticated app surface.
- [ ] `AUTH-05` Session persists across refresh.
- [ ] `AUTH-06` Sign-out clears session and protects private routes.
- [ ] `AUTH-07` Protected route redirect works for guest users.
- [ ] `AUTH-08` `/join?ref=CODE` redirects to `/signup?ref=CODE`.
- [ ] `AUTH-09` Signup with `ref` param preserves referral context.
- [ ] `AUTH-10` `/auth/error` recovery links (login/home) work.
- [ ] `AUTH-11` `/auth/callback` does not dead-end or blank-screen when callback params are missing/invalid.
- [ ] `AUTH-12` Mobile auth forms have no clipping or unreachable controls.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.2 Global Navigation, Layout, and i18n
Routes: global shell across all authenticated pages.

Use cases:
- [ ] `NAV-01` Sidebar items render correctly by role (`admin`, `council`, `member`).
- [ ] `NAV-02` Mobile sidebar exposes the same essential navigation.
- [ ] `NAV-03` Active route state is visible and accurate.
- [ ] `NAV-04` Locale switch updates labels/content in current page.
- [ ] `NAV-05` Query-bearing links (for example progression source context) keep expected behavior.
- [ ] `NAV-06` Top-bar actions are discoverable and keyboard reachable.
- [ ] `NAV-07` No overlap/collision in nav at 375px and 768px.
- [ ] `NAV-08` Role-restricted pages are not discoverable through unauthorized nav paths.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

## 4.3 Home, Analytics, Leaderboard, and Treasury Readability
Routes: `/`, `/analytics`, `/leaderboard`, `/treasury`.

Use cases:
- [ ] `INSIGHT-01` Home dashboard loads with trust/summary surfaces.
- [ ] `INSIGHT-02` `/analytics` charts/metrics load without blocking UI.
- [ ] `INSIGHT-03` `/leaderboard` ranking appears stable and understandable.
- [ ] `INSIGHT-04` `/treasury` shows settlement posture and transparency metadata.
- [ ] `INSIGHT-05` Empty/loading states are informative, not confusing.
- [ ] `INSIGHT-06` Units and labels are understandable (percent, totals, balances).
- [ ] `INSIGHT-07` Mobile chart/card readability is acceptable.
- [ ] `INSIGHT-08` User can identify a clear “what to do next” action.

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

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

Feedback:
- What works well:
- What does not work:
- UI improvements requested:
- Top 3 highest-impact changes:
- Section severity (`S0/S1/S2/S3`):
- Confidence score (`1-5`):

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
| `/quests` | 4.6 | | | | | |
| `/tasks` | 4.7 | | | | | |
| `/tasks/[id]` | 4.7 | | | | | |
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
