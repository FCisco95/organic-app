# Phase 16: Dispute Resolution — Implementation Plan

## Goal

Build a task-dispute resolution system with XP staking, optional mediation, structured counter-arguments, 3-tier escalation (Peer mediation → Council arbitration → Admin final ruling), and arbitrator rewards — fully integrated with existing tasks, notifications, reputation, and activity systems.

## Design Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Dispute scope | Task submissions only (v1) |
| Arbitrators | Council + Admin roles |
| Escalation | 3-tier: Mediation → Council → Admin |
| Filing cost | XP stake (refunded if upheld, lost if frivolous) |
| Task during dispute | Stays active (not frozen) |
| Resolution outcomes | Uphold, Overturn, Compromise, Dismiss |
| Visibility | Semi-public (existence visible, evidence restricted) |
| Deadlines | Sprint-bound (auto-escalate/dismiss at sprint close) |
| Evidence | Required (text + optional attachments) |
| Reviewer impact | XP penalty if overturned |
| UI placement | Dedicated `/disputes` page + inline on task detail |
| Counter-arguments | Structured reviewer response (24-48h window) |
| Mediation | Optional 24h window before arbitration |
| Upheld effect | Full reversal (approve submission, award points, XP refund) |
| Arbitrator reward | Flat XP per resolution |

## Use Cases Covered (including edge cases)

### Core flows
1. **File dispute on rejected submission** — member disputes a reviewer's rejection
2. **File dispute on low quality score** — member disputes the score (e.g., got 2/5, believes 4/5)
3. **Optional mediation** — 24h window for disputant + reviewer to resolve privately
4. **Structured counter-argument** — reviewer responds with evidence within 48h
5. **Council arbitration** — council member reviews evidence from both sides and decides
6. **Admin escalation/appeal** — if disputant disagrees with council ruling, admin makes final call
7. **Full reversal** — overturned: submission approved, points awarded, reviewer XP penalty
8. **Compromise** — arbitrator sets new quality score, partial points
9. **Dismiss** — frivolous dispute: disputant loses XP stake

### Edge cases & safeguards
10. **Self-dispute prevention** — cannot dispute your own review
11. **Conflict of interest** — arbitrator cannot be the original reviewer
12. **Duplicate prevention** — only one active dispute per submission
13. **Withdrawal** — disputant can withdraw before resolution (XP stake returned minus small fee)
14. **Sprint auto-escalation** — unresolved disputes auto-escalate at sprint close; if at admin tier already, extend deadline by 48h
15. **Minimum XP threshold** — must have enough XP to stake (prevents brand-new members from spam-filing)
16. **Cooldown** — 7-day cooldown between disputes per user
17. **Evidence immutability** — evidence cannot be edited after submission (only new evidence can be appended)
18. **Arbitrator recusal** — arbitrator can recuse themselves, dispute reassigned
19. **Notification integration** — all parties notified at each state change
20. **Activity log audit trail** — every dispute action logged for transparency

## Dispute Lifecycle

```
Filing (member)
  │
  ├──→ Mediation (optional, 24h window)
  │      ├── Resolved → MEDIATED (both agree, XP stake returned)
  │      └── Expired/Skipped → escalate
  │
  ├──→ Response (reviewer has 48h to submit counter-argument)
  │
  ├──→ Council Arbitration (any council+ member, not the reviewer)
  │      ├── Overturn → submission approved, points awarded, reviewer XP penalty
  │      ├── Compromise → new quality score set, partial points
  │      ├── Uphold → original decision stands, disputant loses XP stake
  │      └── Dismiss → frivolous, disputant loses XP stake + cooldown extended
  │
  └──→ Appeal (48h window after council ruling)
         │
         └── Admin Final Ruling (same outcome options, decision is final)
```

## Dispute statuses

```
open → mediation → awaiting_response → under_review → resolved | appealed → appeal_review → resolved
                                                     └→ dismissed
                                                     └→ withdrawn
                                                     └→ mediated
```

## Implementation Plan

### Step 1 — Database migration

**File:** `supabase/migrations/YYYYMMDD000000_dispute_resolution.sql`

New tables:
- `disputes` — core dispute record
  - `id` UUID PK
  - `submission_id` UUID FK → task_submissions (the disputed submission)
  - `task_id` UUID FK → tasks
  - `disputant_id` UUID FK → user_profiles (who filed)
  - `reviewer_id` UUID FK → user_profiles (original reviewer)
  - `arbitrator_id` UUID FK → user_profiles (assigned council/admin, nullable)
  - `status` dispute_status enum (open, mediation, awaiting_response, under_review, resolved, appealed, appeal_review, dismissed, withdrawn, mediated)
  - `tier` dispute_tier enum (mediation, council, admin)
  - `reason` TEXT NOT NULL (category of dispute)
  - `evidence_text` TEXT NOT NULL
  - `evidence_links` TEXT[] (file URLs / links)
  - `response_text` TEXT (reviewer's counter-argument)
  - `response_links` TEXT[]
  - `response_deadline` TIMESTAMPTZ
  - `resolution` dispute_resolution enum (overturned, upheld, compromise, dismissed) NULLABLE
  - `resolution_notes` TEXT
  - `new_quality_score` INT (1-5, for compromise outcomes)
  - `xp_stake` INT NOT NULL
  - `xp_refunded` BOOLEAN DEFAULT FALSE
  - `sprint_id` UUID FK → sprints (bound to current sprint)
  - `mediation_deadline` TIMESTAMPTZ
  - `response_submitted_at` TIMESTAMPTZ
  - `resolved_at` TIMESTAMPTZ
  - `created_at` / `updated_at` TIMESTAMPTZ

- `dispute_comments` — semi-public discussion thread
  - `id` UUID PK
  - `dispute_id` UUID FK → disputes
  - `user_id` UUID FK → user_profiles
  - `content` TEXT NOT NULL
  - `visibility` ('parties_only' | 'arbitrator' | 'public')
  - `created_at` TIMESTAMPTZ

New enum types:
- `dispute_status`
- `dispute_tier`
- `dispute_resolution`
- `dispute_reason` (rejected_unfairly, low_quality_score, plagiarism_claim, reviewer_bias, other)

New activity event types:
- `dispute_created`, `dispute_response_submitted`, `dispute_escalated`, `dispute_resolved`, `dispute_withdrawn`

RLS policies:
- Disputant + reviewer + arbitrator can read their own disputes
- All authenticated users can see dispute existence (id, status, task_id, submission_id) but NOT evidence
- Evidence/comments visible only to parties + arbitrator + admin
- Only disputant can create disputes
- Only assigned arbitrator / admin can resolve

Constraints:
- UNIQUE(submission_id) WHERE status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated') — one active dispute per submission
- CHECK(disputant_id != reviewer_id) — can't dispute yourself (redundant safety)
- CHECK(arbitrator_id != reviewer_id) — conflict of interest guard
- CHECK(xp_stake > 0)

Triggers:
- ON INSERT → log to activity_log (dispute_created), auto-follow task for all parties
- ON UPDATE status → log to activity_log, fan-out notifications
- ON resolution → apply XP effects (stake refund/loss, reviewer penalty, arbitrator reward)

Config additions to `orgs.gamification_config`:
- `xp_dispute_stake`: 50 (default XP cost to file)
- `xp_dispute_arbitrator_reward`: 25 (XP per resolution)
- `xp_dispute_reviewer_penalty`: 30 (XP lost if overturned)
- `xp_dispute_withdrawal_fee`: 10 (small fee on withdrawal)
- `dispute_mediation_hours`: 24
- `dispute_response_hours`: 48
- `dispute_appeal_hours`: 48
- `dispute_cooldown_days`: 7
- `dispute_min_xp_to_file`: 100 (minimum XP to be able to file)

### Step 2 — Feature domain

**Files:**
- `src/features/disputes/types.ts` — Dispute, DisputeComment, DisputeWithRelations, status/tier/resolution/reason literals, config interface
- `src/features/disputes/schemas.ts` — Zod schemas: createDisputeSchema, respondToDisputeSchema, resolveDisputeSchema, disputeCommentSchema, disputeFilterSchema
- `src/features/disputes/hooks.ts` — React Query hooks: useDisputes, useDispute, useCreateDispute, useRespondToDispute, useResolveDispute, useWithdrawDispute, useDisputeComments, useAddDisputeComment, useRecuseArbitrator
- `src/features/disputes/index.ts` — barrel export

### Step 3 — API routes

**Files:**
- `src/app/api/disputes/route.ts` — GET (list with filters: status, tier, sprint, my-disputes) + POST (create dispute)
- `src/app/api/disputes/[id]/route.ts` — GET (detail) + PATCH (update status: withdraw, escalate)
- `src/app/api/disputes/[id]/respond/route.ts` — POST (reviewer submits counter-argument)
- `src/app/api/disputes/[id]/resolve/route.ts` — POST (arbitrator resolves: overturn/uphold/compromise/dismiss)
- `src/app/api/disputes/[id]/appeal/route.ts` — POST (disputant appeals council ruling)
- `src/app/api/disputes/[id]/assign/route.ts` — POST (assign arbitrator) + DELETE (recuse)
- `src/app/api/disputes/[id]/mediate/route.ts` — POST (both parties agree to mediated resolution)
- `src/app/api/disputes/[id]/comments/route.ts` — GET + POST (semi-public comments)

Key auth rules:
- Create: member+ role, sufficient XP, no active cooldown, no active dispute on same submission
- Respond: only the original reviewer
- Resolve: only assigned arbitrator (council/admin) who is NOT the reviewer
- Appeal: only the disputant, within 48h of council ruling
- Assign: admin, or auto-assign
- Mediate: either party can propose, both must confirm
- Comments: parties + arbitrator only

### Step 4 — UI components

**Files:**
- `src/components/disputes/DisputeQueue.tsx` — filterable list for council/admin (status tabs, sprint filter)
- `src/components/disputes/DisputeCard.tsx` — summary card in queue (task title, disputant, status, tier, deadline)
- `src/components/disputes/DisputeDetail.tsx` — full dispute view with evidence, response, timeline, resolution panel
- `src/components/disputes/DisputeTimeline.tsx` — visual status timeline (filed → mediation → response → review → resolved)
- `src/components/disputes/CreateDisputeModal.tsx` — modal opened from task detail page (reason picker, evidence text, file upload, XP stake display)
- `src/components/disputes/RespondPanel.tsx` — reviewer's counter-argument form
- `src/components/disputes/ResolvePanel.tsx` — arbitrator resolution form (outcome dropdown, quality score for compromise, notes)
- `src/components/disputes/DisputeStatusBadge.tsx` — colored status badge
- `src/components/disputes/DisputeTierBadge.tsx` — tier indicator (mediation/council/admin)
- `src/components/disputes/DisputeButton.tsx` — inline button for task submissions (shows on rejected submissions, disabled if cooldown/no XP)
- `src/components/disputes/MediationPanel.tsx` — mediation chat/agreement UI
- `src/components/disputes/DisputeStats.tsx` — stats for arbitrator dashboard (resolved count, overturn rate)

### Step 5 — Pages

**Files:**
- `src/app/[locale]/disputes/page.tsx` — Dispute queue page (council/admin see all, members see their own)
- `src/app/[locale]/disputes/[id]/page.tsx` — Dispute detail page

Navigation:
- Add "Disputes" link in sidebar (Scale/Gavel icon), visible to council+ and members with active disputes
- Badge counter for pending disputes (council/admin)

### Step 6 — Notifications integration

Update activity event types:
- `src/features/activity/types.ts` — add dispute event types
- `src/features/notifications/types.ts` — add 'disputes' notification category

New notification events:
- `dispute_created` → notify reviewer ("Your review has been disputed")
- `dispute_response_submitted` → notify disputant ("Reviewer has responded")
- `dispute_escalated` → notify arbitrator/admin ("Dispute escalated to your tier")
- `dispute_resolved` → notify both parties ("Dispute resolved: [outcome]")
- `dispute_withdrawn` → notify reviewer ("Dispute withdrawn")
- `dispute_mediated` → notify both parties ("Dispute resolved via mediation")

Auto-follow: disputant, reviewer, and arbitrator all auto-follow the dispute.

### Step 7 — Reputation/XP integration

XP effects (applied via DB trigger on resolution):
- **Overturn**: disputant gets XP stake back + reviewer loses `xp_dispute_reviewer_penalty` XP
- **Compromise**: disputant gets XP stake back (no reviewer penalty)
- **Uphold**: disputant loses XP stake (transferred to DAO/burned)
- **Dismiss**: disputant loses XP stake + extended cooldown
- **Withdrawn**: disputant loses `xp_dispute_withdrawal_fee` from stake, rest refunded
- **Mediated**: full XP stake refunded to disputant (no penalties)
- **Arbitrator**: earns `xp_dispute_arbitrator_reward` XP on any resolution

New XP event types: `dispute_filed`, `dispute_resolved_for`, `dispute_resolved_against`, `dispute_arbitrated`

New achievements:
- "First Arbiter" — resolve 1 dispute
- "Justice Keeper" — resolve 10 disputes
- "Peacemaker" — mediate 5 disputes
- "Vindicated" — win 1 dispute as disputant

### Step 8 — i18n

**Files:**
- `messages/en.json` — Disputes namespace (~80 keys)
- `messages/pt-PT.json` — Disputes namespace
- `messages/zh-CN.json` — Disputes namespace

Key namespaces: dispute statuses, tiers, resolutions, reasons, form labels, validation errors, notification copy, achievement names.

## Verification

**Commands:**
- `npm run lint` — no lint errors
- `npm run build` — clean build with new pages/routes

**Manual checks:**
1. As member: reject a submission → file dispute → see XP staked → provide evidence
2. As reviewer: see dispute notification → submit counter-argument within deadline
3. As council: see dispute in queue → assign self → review evidence → resolve (all 4 outcomes)
4. Verify XP effects: check disputant/reviewer/arbitrator XP after each outcome
5. Test mediation: file dispute → both parties agree → verify XP refunded
6. Test withdrawal: file dispute → withdraw → verify partial XP fee
7. Test cooldown: try filing again within 7 days → should be blocked
8. Test sprint-bound: verify auto-escalation logic at sprint close
9. Test conflict of interest: try to assign reviewer as arbitrator → should fail
10. Test visibility: non-party member can see dispute exists but NOT evidence text

Say 'go' to implement, or tell me what to change in the plan.
