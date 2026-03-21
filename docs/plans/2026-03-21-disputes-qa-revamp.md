# Disputes QA Revamp Plan

**Section:** 4.10 Disputes Workflow
**Tested:** 2026-03-21
**Cases:** 8 tested, 4 skipped (no test data for file/withdraw/appeal/window-close flows)
**Overall severity:** S1

---

## Functional Fixes (qa-fixer — mandatory)

### Fix 1: Hide triage deck from members (S1)

**Problem:** Members see the full admin-oriented triage deck including:
- Escalation controls (Focus escalation toggle)
- Route-to-council / Route-to-admin buttons
- SLA counters (Overdue/At risk/On track/Escalation-ready)

Members should only see their own disputes with a simple list view.

**Files:**
- `src/components/disputes/dispute-queue.tsx` — Triage deck, escalation controls, and SLA/tier filter tabs should be wrapped in a role check. Members should only see status filter tabs and the dispute list.

**Fix:** Add a `isCouncilOrAdmin` prop or derive from auth context. Hide `disputes-triage-deck`, `disputes-escalation-controls`, SLA filter tabs, and tier filter tabs when `myDisputes === true` or user role is `member`.

### Fix 2: Non-party member detail page shows misleading data (S2)

**Problem:** When a non-party member navigates to `/disputes/[id]`, they see:
- Participants section with "Unassigned" for Disputant/Reviewer/Arbitrator (misleading — these aren't unassigned, they're hidden)
- Evidence section showing "—" (stripped but rendered)
- Integrity rail showing "No reviewer response deadline has been set" (stripped data)
- 403 console error on comments API

The API correctly strips sensitive data but the UI doesn't communicate this.

**Files:**
- `src/components/disputes/dispute-detail/dispute-participants.tsx` — Show "Restricted" or hide participant names when data is null/missing due to role restrictions
- `src/app/[locale]/disputes/[id]/page.tsx` — Consider showing a "limited access" banner when non-party user views a dispute

**Fix:** When participant data returns null/missing IDs, display "Access restricted" instead of "Unassigned". Add a banner: "You are viewing limited information. Full details are available to dispute parties."

### Fix 3: SLA chip inconsistency between queue card and header (S2)

**Problem:** Dispute cards in the queue show "No deadline" SLA chip even when the triage deck counters show the dispute as "at risk" or "overdue". The card's SLA chip only shows urgency when `isReviewerResponseTracked(status)` returns true, but the triage counters use `getDisputeSlaUrgency` on all disputes regardless.

**Files:**
- `src/components/disputes/dispute-card.tsx` — `slaUrgency` computation at line 46-48
- `src/features/disputes/sla.ts` — `isReviewerResponseTracked` function

**Fix:** Either align the card SLA chip with the triage deck logic, or show a different chip for disputes where response tracking doesn't apply (e.g., "N/A" instead of "No deadline").

### Fix 4: Integrity rail duplicates response deadline info (S3)

**Problem:** The integrity rail sidebar has 4 panels. Two of them — "Response deadline posture" and "Response status" — show the exact same text (e.g., "Response due by Mar 22, 2026, 7:30 PM"). This is redundant.

**Files:**
- `src/components/disputes/dispute-detail/dispute-integrity-rail.tsx`

**Fix:** Merge "Response deadline posture" and "Response status" into a single "Response & SLA" panel, or differentiate their content (deadline panel = dates/countdown, status panel = what action is needed).

---

## Visual/UX Improvements (prototype-executor — creative)

### Direction 1: Linear-style dense dispute queue

**Benchmark:** Linear's issue list — dense, scannable, keyboard-first.

**Current gaps:**
- Queue cards are tall (5 lines each) with lots of whitespace
- All cards look identical: same status, tier, reason, XP — no visual differentiation
- Triage deck with 4 SLA counters + escalation controls + 3 rows of filter pills = massive header before any content
- Status tabs use underline style, SLA tabs use pill style, tier tabs use pill style — inconsistent filter UX

**Prototype direction:**
- Compact list rows (2-line max) with inline status/tier/SLA chips
- Collapsible triage header — show summary counts inline, expand for controls
- Unified filter bar: status + SLA + tier as composable chip filters in one row
- Keyboard navigation support
- Color-coded left border by status (like Linear's priority bars)

### Direction 2: GitHub-style tabbed detail page

**Benchmark:** GitHub issue/PR detail — tabbed content, metadata sidebar.

**Current gaps:**
- Detail page is a single long column with 8+ sections stacking vertically
- On mobile, this means 4-5 screens of scrolling
- Timeline, participants, evidence, response, original review, resolve panel, actions, integrity rail — all sequential
- No way to jump to a section or collapse irrelevant ones

**Prototype direction:**
- Tabbed detail view: Overview | Evidence | Resolution | Discussion
- Metadata sidebar (desktop): status, tier, SLA, participants, task link
- On mobile: bottom tabs or swipeable tab bar
- Collapsible sections within each tab
- Floating action bar for resolve/assign/withdraw (like proposals FAB)

### Direction 3: Mobile-first triage flow

**Benchmark:** Linear Mobile — swipe actions, bottom sheets.

**Current gaps:**
- On 375px mobile, the triage deck + filters consume the entire viewport before any dispute content
- Cards stack vertically with no visual priority signal
- Detail page is an infinite scroll
- Touch targets are fine but information density is too low

**Prototype direction:**
- Mobile queue: swipe-right to assign, swipe-left to dismiss
- SLA urgency as color-coded left border (red = overdue, amber = at risk)
- Bottom sheet for quick dispute preview (swipe up for full detail)
- Segmented control for queue/mine (not full-width tab buttons)
- Pull-to-refresh for queue updates

### Cross-cutting improvements

- **Evidence filenames:** Show original filename (strip UUID prefix), truncate to ~30 chars with tooltip
- **Garbage data cleanup:** Run `scripts/cleanup-qa-garbage.sql` or create a disputes-specific cleanup
- **Empty state for member queue:** Add illustration + CTA linking to tasks page where disputes can be filed
- **Resolution notes sanitization:** Consider basic content review or length requirements

---

## Test Cases Not Verified

These cases need test data setup to verify:

| Case | Why skipped | How to test |
|------|-------------|-------------|
| DISP-01 | No rejected submission in QA member account | Create a task, submit, reject via admin, then file dispute |
| DISP-07 | No dispute with closed window | Create dispute with past `dispute_window_ends_at` |
| DISP-10 | QA member not party to any dispute | File a dispute as QA member first |
| DISP-11 | Disputant is a different account | File a dispute as QA member, have admin dismiss, then test appeal |

---

## Execution Order

1. **qa-fixer:** Fix 1 (S1 role visibility) > Fix 2 (S2 non-party UX) > Fix 3 (S2 SLA consistency) > Fix 4 (S3 rail dedup)
2. `/clear`
3. **prototype-executor:** 3 prototypes based on directions above, user comparison, merge winner
