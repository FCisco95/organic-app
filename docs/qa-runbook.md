# QA Runbook — Organic App (Manual QA + UX Revamp Input)

Manual QA workflow for full-product testing and UX/UI feedback collection.
Use this runbook to test, document friction, and generate structured redesign input.

---

## 1) Setup

| Item | Value |
|------|-------|
| Desktop browser | Chrome or Firefox, latest stable |
| Mobile browser | Chrome (Android 12+) or Safari (iOS 16+) |
| Accounts needed | 1 admin, 1 council, 1 member, 1 guest (no organic_id) |
| Locale coverage | English + at least one of pt-PT or zh-CN |
| Suggested screen sizes | 1440 px desktop, 768 px tablet, 375 px mobile |

---

## 2) Session Header (fill before testing)

- Date:
- Tester:
- Environment URL:
- Branch/commit:
- Locales tested:
- Devices tested:
- Roles tested:
- Session objective (release validation / UX revamp / both):

---

## 3) Manual Testing Method

- P0 (Smoke): critical path works end-to-end with no blockers.
- P1 (Core UX): user can understand flow, status, and next action.
- P2 (Edge + Accessibility + Mobile): error handling, keyboard support, responsive behavior.

Severity for findings:
- S0 = blocker, cannot complete flow.
- S1 = major UX break or high confusion risk.
- S2 = noticeable friction, still usable.
- S3 = polish or consistency issue.

---

## 4) Feature QA Sections

## 4.1 Auth and Onboarding
Routes: `/login`, `/signup`, `/auth/error`, protected page redirects.

P0 checks:
- [ ] Guest can access public pages and is redirected from protected pages.
- [ ] Member can sign in and sign out successfully.
- [ ] Session persists on refresh and clears on sign-out.

P1 checks:
- [ ] Login/signup errors are understandable.
- [ ] Wallet linking feedback is clear (start, success, fail).
- [ ] Organic ID visibility after assignment is clear.

P2 checks:
- [ ] Keyboard navigation works on auth forms and modals.
- [ ] Mobile login/signup forms are usable without clipping.

Your Thoughts:
1. What part of login/signup felt least clear?
2. Was the next step after sign-in obvious?
3. Which error message (if any) was hard to understand?
4. What one onboarding improvement would reduce confusion the most?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.2 Navigation and Layout
Routes: global layout surfaces across all pages.

P0 checks:
- [ ] Sidebar/mobile sidebar show correct items by role.
- [ ] All primary nav links work.
- [ ] Locale switcher updates language correctly.

P1 checks:
- [ ] Current location in navigation is obvious.
- [ ] Top bar actions are discoverable and predictable.
- [ ] Labels are concise and understandable.

P2 checks:
- [ ] Keyboard-only navigation reaches all nav actions.
- [ ] No overflow/collision in mobile navigation.

Your Thoughts:
1. Which navigation label or grouping was confusing?
2. Did you ever feel lost about where to go next?
3. Which area of the layout feels crowded or too empty?
4. What nav change would speed up daily usage most?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.3 Home and Analytics
Routes: `/`, `/analytics`.

P0 checks:
- [ ] Dashboard loads without errors.
- [ ] Core metric cards and charts render.
- [ ] Empty/loading states do not block navigation.

P1 checks:
- [ ] Metric names and meaning are understandable.
- [ ] Visual hierarchy makes key stats obvious.
- [ ] The page communicates what action to take next.

P2 checks:
- [ ] Data refresh/loading behavior is clear.
- [ ] Mobile chart readability is acceptable.

Your Thoughts:
1. Which metric was hardest to interpret and why?
2. Did the page help you decide what to do next?
3. What visual element felt noisy or distracting?
4. What dashboard change would improve decision-making most?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.4 Members Directory and Privacy
Routes: `/members`, `/members/[id]`.

P0 checks:
- [ ] Directory loads and member cards are visible.
- [ ] Public/private member behavior matches privacy settings.
- [ ] Invalid member ID shows a safe fallback.

P1 checks:
- [ ] Member card information is scannable.
- [ ] Private profile messaging is clear and respectful.
- [ ] Section navigation inside member profile is clear.

P2 checks:
- [ ] Pagination/search/filter interactions are stable.
- [ ] Mobile member cards are readable.

Your Thoughts:
1. Is it obvious what is public vs private profile data?
2. Which profile section felt hard to parse quickly?
3. Did any term/label feel ambiguous?
4. What would improve member discoverability and trust?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.5 My Profile and Progression
Routes: `/profile`, `/profile/progression`.

P0 checks:
- [ ] Profile page loads personal stats and controls.
- [ ] Privacy toggle updates state and messaging correctly.
- [ ] Progression page loads quests, level context, and recent XP.

P1 checks:
- [ ] Quest progress and next-level distance are understandable.
- [ ] CTA to related areas (tasks/proposals/rewards) is clear.
- [ ] Rewards readiness messaging is understandable.

P2 checks:
- [ ] Progression still communicates value when data is sparse.
- [ ] Mobile layout keeps progression cards readable.

Your Thoughts:
1. Could you quickly understand your current level and next target?
2. Which progression card felt unclear or low-value?
3. Was it clear what action increases XP the fastest?
4. What single change would make progression more motivating?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.6 Tasks and Review Operations
Routes: `/tasks`, `/tasks/[id]`, `/admin/submissions`, `/tasks/templates`.

P0 checks:
- [ ] Admin can create task; member can view and submit.
- [ ] Submission moves to review flow.
- [ ] Reviewer can approve/reject with required inputs.
- [ ] Template CRUD works for admin.

P1 checks:
- [ ] Task detail clearly explains status, points, and expected output.
- [ ] Estimated XP and review impact summary are understandable.
- [ ] Post-review “what changed” feedback is useful and specific.

P2 checks:
- [ ] Edge errors (missing fields/invalid actions) show actionable messages.
- [ ] Mobile submission/review interactions remain usable.

Your Thoughts:
1. Which step in task submission/review felt most confusing?
2. Did XP/points feedback clearly explain the outcome?
3. Were rejection and dispute paths easy to understand?
4. What change would improve completion rate most?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.7 Sprints
Routes: `/sprints`, `/sprints/[id]`, `/sprints/past`.

P0 checks:
- [ ] Admin can create/start/complete sprint.
- [ ] Sprint detail renders status and task data.
- [ ] Conflict handling works for invalid sprint transitions.

P1 checks:
- [ ] Sprint health/progress is easy to understand.
- [ ] Lifecycle actions are clearly explained.

P2 checks:
- [ ] Historical sprint context remains understandable.
- [ ] Mobile sprint detail is readable.

Your Thoughts:
1. Was sprint status and timing easy to understand?
2. Which sprint action felt risky or unclear?
3. Did you understand the impact of “complete sprint” before clicking?
4. What would make sprint operations safer and clearer?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.8 Proposals and Voting
Routes: `/proposals`, `/proposals/new`, `/proposals/[id]`.

P0 checks:
- [ ] Member can draft and submit proposal.
- [ ] Public can read proposal detail.
- [ ] Voting state and actions work for eligible users.

P1 checks:
- [ ] Proposal structure (summary/motivation/solution) is readable.
- [ ] Voting eligibility and constraints are understandable.
- [ ] Status transitions communicate what changed.

P2 checks:
- [ ] Deadline behavior is clear before and after close.
- [ ] Mobile proposal reading experience is acceptable.

Your Thoughts:
1. Which proposal field or instruction felt unclear?
2. Was the voting process easy to trust and verify?
3. Did status labels communicate stage changes clearly?
4. What would improve governance participation most?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.9 Disputes
Routes: `/disputes`, `/disputes/[id]`.

P0 checks:
- [ ] Member can file dispute from rejected submission.
- [ ] Council/admin can triage and resolve dispute.
- [ ] Mediate/withdraw/respond actions work by role.

P1 checks:
- [ ] Status/tier/timeline explain current dispute posture.
- [ ] Impact estimate and post-action summary are understandable.
- [ ] Evidence chronology clearly communicates late evidence.

P2 checks:
- [ ] Unauthorized viewers are blocked from restricted information.
- [ ] Mobile detail page keeps critical controls readable.

Your Thoughts:
1. Was the dispute timeline easy to understand at a glance?
2. Did XP impact messaging feel fair and clear?
3. Which action (mediate/resolve/withdraw) felt least intuitive?
4. What would increase trust in dispute outcomes?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.10 Rewards and Claims
Routes: `/rewards`, `/admin/rewards`.

P0 checks:
- [ ] Member can view claimable balance and submit valid claim.
- [ ] Admin can review and approve pending claim.

P1 checks:
- [ ] Readiness criteria and thresholds are understandable.
- [ ] Wallet requirements are explained clearly before submit.
- [ ] Claim status progression is easy to track.

P2 checks:
- [ ] Error states provide recovery steps.
- [ ] Mobile claims surface remains usable.

Your Thoughts:
1. Was claim eligibility clear before starting the claim?
2. Which part of claim flow felt most uncertain?
3. Did status updates reduce anxiety during waiting?
4. What would make rewards feel more transparent?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.11 Notifications
Routes: `/notifications`, notification actions/preferences.

P0 checks:
- [ ] Notifications list loads.
- [ ] Mark-as-read and follow actions work.
- [ ] Preferences can be updated and saved.

P1 checks:
- [ ] Notification copy is actionable.
- [ ] Priority and recency are easy to understand.

P2 checks:
- [ ] Empty and error states are informative.
- [ ] Mobile notification cards are readable.

Your Thoughts:
1. Which notifications felt useful vs noisy?
2. Did notification actions feel safe and reversible?
3. Was it clear why each notification appeared?
4. What change would make notifications more valuable?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.12 Leaderboard and Treasury
Routes: `/leaderboard`, `/treasury`.

P0 checks:
- [ ] Both pages load and display data.
- [ ] No critical rendering failures with missing data.

P1 checks:
- [ ] Ranking and treasury figures are easy to interpret.
- [ ] Labels, units, and context are clear.

P2 checks:
- [ ] Refresh behavior and stale-data cues are understandable.
- [ ] Mobile readability is acceptable.

Your Thoughts:
1. Which stat or ranking element felt hardest to trust?
2. Did the page explain where values come from?
3. What visual change would improve clarity most?
4. What would make these pages more decision-useful?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.13 Admin Settings and System Controls
Routes: `/admin/settings` and relevant admin control flows.

P0 checks:
- [ ] Admin can open settings and save valid config updates.
- [ ] Non-admin users cannot access admin settings.

P1 checks:
- [ ] Setting names and side effects are understandable.
- [ ] Dangerous actions are clearly signposted.

P2 checks:
- [ ] Validation errors are actionable.
- [ ] Mobile/tablet presentation remains usable.

Your Thoughts:
1. Which setting had unclear consequences?
2. Did any admin control feel risky to click?
3. Was confirmation/warning language sufficient?
4. What would make admin operations safer?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.14 Error Resilience and Health
Routes: invalid routes, degraded network states, `/api/health`.

P0 checks:
- [ ] Invalid routes show proper fallback (not blank crash).
- [ ] API health endpoint returns expected status.

P1 checks:
- [ ] User-facing errors explain what to do next.
- [ ] Recovery actions are obvious.

P2 checks:
- [ ] Connectivity interruption does not hard-crash UI.
- [ ] Mobile error surfaces remain readable.

Your Thoughts:
1. Which error state was hardest to recover from?
2. Did errors explain next steps clearly?
3. Where did the app feel fragile under degraded conditions?
4. What one resilience improvement should be prioritized?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.15 Referrals, Quests, and Gamification Controls
Routes: `/quests`, `/join?ref=CODE`, `/signup?ref=CODE`, `/admin/settings` (Gamification tab), `/profile/progression` (legacy redirect).

Pre-flight checks:
- [ ] Migration `supabase/migrations/20260223100000_quests_referrals_burns.sql` is applied.
- [ ] At least one active quest exists in `quests`.
- [ ] One admin account and at least two member accounts are available for referral testing.

P0 checks:
- [ ] Authenticated member can open `/quests` and see referral + quests sections.
- [ ] `/profile/progression` redirects to `/quests` without blank/error page.
- [ ] Member referral link/code is generated and copy actions work.
- [ ] `in_progress / done / all` quest tabs load and filter cards.
- [ ] `Burn Points to Level Up` button behavior matches mode:
- [ ] `auto` mode: disabled with auto-level hint.
- [ ] `manual_burn` mode: enabled only when points are sufficient.
- [ ] Referral join flow works end-to-end:
- [ ] Open `/join?ref=CODE` and verify redirect to `/signup?ref=CODE`.
- [ ] Complete signup with referral code present in metadata.
- [ ] Admin can open Settings > Gamification tab and load quests/config sections.

P1 checks:
- [ ] Referral stats update after referral completion (pending/completed/xp/points/tier).
- [ ] Burn confirmation dialog shows correct level transition and points math.
- [ ] Quest rewards and progress values match API payload (`/api/gamification/quests`).
- [ ] Navigation label is `Ref & Quests` and links to `/quests` (desktop + mobile + top-bar profile menu).
- [ ] i18n keys render correctly in `en`, `pt-PT`, and `zh-CN`.

P2 checks:
- [ ] Empty states are clear when no quests/referrals exist.
- [ ] Referral and quest cards remain readable on 375 px mobile width.
- [ ] Copy/link actions gracefully handle clipboard denial.
- [ ] Unauthorized access to admin quest/config APIs returns 401/403.

Your Thoughts:
1. Was the relationship between referral rewards, quests, and level progression clear?
2. Was the burn-to-level mechanic understandable before confirming the action?
3. Which part of `/quests` felt visually dense or unclear?
4. What single change would improve conversion from invite to completed referral?
5. Severity for this section: `S0/S1/S2/S3`
6. Confidence score (1-5):

Action Candidates:
- Candidate 1:
- Candidate 2:

## 4.16 Operational Controls (Automated Evidence)

Goal: verify governance/rewards safety controls without relying on manual UI walkthroughs.

Pre-flight:
- [ ] `.env.local` includes Supabase URL/anon key/service role key.
- [ ] CI-mode base URL is reachable.
- [ ] At least one admin and council fixture can be created by tests.

Execution command:

```bash
set -a; source .env.local; set +a
CI=true npx playwright test \
  tests/voting-integrity.spec.ts \
  tests/rewards-settlement-integrity.spec.ts \
  --workers=1 --reporter=list
```

Fallback when CI webServer startup exceeds timeout in local environments:

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

Expected assertions from suite output:
- [ ] Rewards hold path returns `EMISSION_CAP_BREACH` and sprint status `held`.
- [ ] Rewards kill-switch path returns `SETTLEMENT_KILL_SWITCH` and sprint status `killed`.
- [ ] `reward_settlement_events` contains `integrity_hold` and `kill_switch` rows with metadata.
- [ ] Voting finalization failure path returns `FINALIZATION_FROZEN`.
- [ ] `proposal_stage_events` contains `finalization_kill_switch` with dedupe key + attempt metadata.
- [ ] Manual recovery simulation (audited resume event + unfreeze) can finalize proposal successfully.

Evidence capture checklist:
- [ ] Attach Playwright command output (or CI job URL).
- [ ] Record proposal id used for frozen-finalization validation.
- [ ] Record sprint id used for hold/kill-switch validation.
- [ ] Export the latest matching audit rows (queries below) with timestamp.

Audit queries:

```sql
-- Rewards settlement events for one sprint.
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
-- Proposal freeze + manual-resume audit trail for one proposal.
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

Pass criteria for this section:
- [ ] Both targeted integrity specs pass in CI-mode.
- [ ] Reward and proposal audit rows are present and match expected event semantics.
- [ ] Captured evidence is linked in the release gate artifact.

---

## 5) UX Finding Ticket Template (copy per issue)

- Feature:
- Route:
- Tier found (P0/P1/P2):
- Severity (S0/S1/S2/S3):
- Problem statement:
- User impact:
- Repro steps:
- Suggested fix:
- Effort estimate (XS/S/M/L):
- Owner:
- Target sprint:

---

## 6) End-of-Session Synthesis (mandatory)

- Top 5 friction points:
- Repeated patterns across sections:
- Highest-priority redesign opportunities:
- Quick wins (low effort, high impact):
- Sections that need full redesign:
- Final UX score (1-10):
- Release recommendation: `Go / Go with fixes / No-go`

Structured package for UX skill:
- Paste all "Your Thoughts" answers by section.
- Paste all finding tickets grouped by severity.
- Paste top 5 friction points and quick wins.
