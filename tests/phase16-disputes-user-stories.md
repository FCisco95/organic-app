# Phase 16 Disputes User-story QA Matrix

## Scope
- Feature area: `Phase 16: Dispute Resolution`
- Goal: Validate end-to-end behavior and identify remaining gaps from `BUILD_PLAN.md`
- Roles: `member`, `council`, `admin`

## Core discovery and queue

### US-DISPUTE-01: Member sees only own disputes
- Given: authenticated `member` with at least one dispute filed by them
- When: they open `/disputes`
- Then: only disputes where they are disputant/reviewer/arbitrator are listed
- Status: `Implemented`

### US-DISPUTE-02: Council/admin queue sees all disputes
- Given: authenticated `council` or `admin`
- When: they open `/disputes` and select queue tab
- Then: they can browse all disputes, with status/tier badges and filters
- Status: `Implemented`

### US-DISPUTE-03: Queue and detail should not crash on unexpected data
- Given: a dispute row with unrecognized `status`, `tier`, or partial detail payload
- When: queue/detail is rendered
- Then: page stays functional with safe fallback labels/badges
- Status: `Implemented`

## Filing and eligibility

### US-DISPUTE-04: Rejected submission owner can file dispute
- Given: a rejected submission owned by the current user
- When: user clicks `File Dispute` and submits valid reason/evidence
- Then: dispute is created and submission status moves to `disputed`
- Status: `Implemented`

### US-DISPUTE-05: Cooldown and minimum XP enforced
- Given: user below minimum XP or inside cooldown window
- When: user attempts to file a dispute
- Then: API rejects request with eligibility reason and no dispute created
- Status: `Implemented`

### US-DISPUTE-06: Evidence requirements include links and files
- Given: user filing a dispute
- When: user needs to attach evidence
- Then: evidence text is required; links supported; file upload should be supported
- Status: `Partial` (file upload pending)

## Mediation and response

### US-DISPUTE-07: Two-party mediation confirmation
- Given: dispute in open/mediation/awaiting_response state
- When: one party proposes an outcome and the other confirms same outcome
- Then: dispute becomes `mediated` and resolution notes are saved
- Status: `Implemented`

### US-DISPUTE-08: Reviewer response window
- Given: reviewer is party to open dispute
- When: reviewer submits counter-argument text + links
- Then: response is stored and visible in dispute detail
- Status: `Implemented`

## Arbitration and resolution

### US-DISPUTE-09: Council/admin can self-assign as arbitrator
- Given: open dispute without arbitrator
- When: council/admin clicks assign
- Then: arbitrator is set, conflict-of-interest rule enforced
- Status: `Implemented`

### US-DISPUTE-10: Resolution outcomes apply XP/points effects
- Given: dispute reaches review and is resolved
- When: arbitrator chooses `overturned`, `compromise`, `upheld`, or `dismissed`
- Then: dispute status and submission review fields update, XP/point effects are applied
- Status: `Implemented`

### US-DISPUTE-11: Dismissed dispute applies extended cooldown
- Given: dispute is resolved with `dismissed`
- When: disputant attempts new dispute within extended cooldown window
- Then: filing should be blocked by extended cooldown rule
- Status: `Implemented`

## Notifications and activity

### US-DISPUTE-12: Dispute lifecycle notifications fan out correctly
- Given: dispute events are created (`created`, `response`, `escalated`, `resolved`, `withdrawn`)
- When: event trigger executes
- Then: disputant/reviewer/arbitrator followers receive in-app notifications by preferences
- Status: `Implemented`

## Timing/escalation automation

### US-DISPUTE-13: Sprint-bound auto-escalation
- Given: unresolved dispute at sprint close
- When: automation job runs
- Then: dispute auto-escalates tier, with admin-tier 48h extension
- Status: `Pending`

## Accountability and achievements

### US-DISPUTE-14: Reviewer accuracy metric
- Given: reviewer has multiple disputed outcomes
- When: accuracy dashboard/report is opened
- Then: reviewer accuracy percentage is displayed and queryable
- Status: `Pending`

### US-DISPUTE-15: Dispute achievements unlock
- Given: thresholds reached for arbitrator/disputant achievements
- When: counters update and achievement checks run
- Then: achievements are awarded and visible to user
- Status: `Pending`

## Manual regression pass checklist
- [ ] Verify `/disputes` queue for member role
- [ ] Verify `/disputes` queue + stats for council/admin
- [ ] Verify `/disputes/[id]` detail render for party and non-party views
- [ ] Verify file dispute flow from rejected task submission
- [ ] Verify mediation proposal + confirmation flow
- [ ] Verify reviewer response flow
- [ ] Verify arbitrator assign + resolve flow
- [ ] Verify dispute notifications in notifications center
