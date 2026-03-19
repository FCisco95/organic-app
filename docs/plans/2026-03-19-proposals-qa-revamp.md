# Proposals QA Revamp Plan — 2026-03-19

**Source:** Full manual QA re-test of section 4.9 (PROP-01 through PROP-17)
**Section severity:** S2
**Confidence:** 4/5
**Sessions:** Mobile (375x812, QA Member), Desktop (1440x900, QA Admin), Desktop (1440x900, QA Council)

---

## Track 1 — Functional Fixes

### Task 1: Hide sticky Vote button when voting is closed

**Problem:** Mobile sticky bar shows an orange "Vote" button even when the voting period has ended or the proposal is not in an active voting state. Users tap expecting to vote but can't.

**Files:**
- `src/app/[locale]/proposals/[id]/page.tsx` — sticky bar rendering logic

**Fix:** Conditionally render the Vote button only when:
- Proposal stage is `voting`
- Voting window is still open (`voting_ends_at > now`)
- User is authenticated

### Task 2: Clean up garbage test data

**Problem:** Multiple proposals with `http://localhost:3003/pt-PT` titles/content from prototype QA sessions pollute the proposals list.

**Fix:** SQL cleanup script targeting proposals where `title LIKE '%localhost:3003%'` or `summary LIKE '%localhost:3003%'`. Run against main dev DB only.

**Files:**
- New: `scripts/cleanup-qa-garbage.sql`

### Task 3: Surface execution deadline on finalized proposals

**Problem:** Passed proposals show no execution deadline. Operators don't know when execution must happen by.

**Files:**
- `src/app/[locale]/proposals/[id]/page.tsx` — detail page
- `src/app/api/proposals/[id]/route.ts` — ensure `execution_deadline` is returned

**Fix:** Add an "Execution deadline" row to the Decision Rail sidebar when proposal is finalized and passed. Format as relative + absolute date.

### Task 4: Show max attempts in freeze banner

**Problem:** Freeze banner says "Finalization is frozen after 2 failed attempts" but doesn't say the total allowed limit.

**Files:**
- `src/components/proposals/admin-voting-controls.tsx` — freeze banner rendering

**Fix:** Add "of N" to the attempt count: "Finalization is frozen after 2 of 3 failed attempts." Source the max from the governance config or hardcode if fixed.

### Task 5: Fix onboarding modal dismissal persistence (cross-cutting)

**Problem:** Onboarding "Welcome to Organic" modal reappears on every page navigation despite being closed. This is a cross-cutting S1 issue affecting all sections.

**Files:**
- `src/components/onboarding/onboarding-wizard.tsx` — modal component
- `src/app/api/onboarding/steps/route.ts` — step completion API

**Fix:** When user clicks Close/Skip, persist the dismissal to either:
- `localStorage` key (quick fix, per-device)
- `user_profiles.onboarding_dismissed_at` column (durable, cross-device)

Recommended: localStorage for quick fix, then follow up with DB column.

---

## Track 2 — Visual/UX Revamp

### Task 6: Mobile Decision Rail — collapsible panel

**Problem:** Decision Rail sidebar is hidden at mobile widths and only renders far below comments at page bottom. Governance status is not discoverable on mobile.

**Files:**
- `src/app/[locale]/proposals/[id]/page.tsx` — layout
- New or modified: collapsible Decision Rail component

**Approach:** Add a collapsible "Governance Info" card at the top of mobile view (below stage stepper, above structured sections). Collapsed by default with a tap-to-expand affordance showing key stats inline (Status, Lifecycle state).

### Task 7: Mobile sticky bar rationalization

**Problem:** "Follow" button appears both inline (below title) and in the sticky bottom bar. The Vote button is shown when not actionable.

**Files:**
- `src/app/[locale]/proposals/[id]/page.tsx` — sticky bar + inline buttons

**Fix:**
- Remove inline Follow button when sticky bar is present (mobile only)
- Sticky bar: Follow (always) + Vote (only when active voting + eligible)
- When voting closed: show only Follow in sticky bar

### Task 8: Wizard tab labels on mobile

**Problem:** "Budget & Timeline" truncates to "Budget & Ti..." on mobile.

**Files:**
- `src/app/[locale]/proposals/new/page.tsx` — tab component

**Fix:** Use shorter labels on mobile:
- "Category & Title" → "Category"
- "Problem & Solution" → "Problem"
- "Budget & Timeline" → "Budget"
- "Review & Submit" → "Review"

Or use icons with text at `sm:` breakpoint.

### Task 9: Role-aware CTAs on proposals list

**Problem:** "Review discussion stage" button appears for all roles including members on mobile, taking valuable vertical space.

**Files:**
- `src/app/[locale]/proposals/page.tsx` — list page header

**Fix:** Gate "Review discussion stage" button behind `profile.role === 'admin' || profile.role === 'council'`.

### Task 10: Comment author display name

**Problem:** Comments show only avatar initial + "Organic #ID" with no display name. This makes the comment thread impersonal.

**Files:**
- `src/components/proposals/proposal-comments.tsx` — comment rendering
- `src/app/api/proposals/[id]/comments/route.ts` — comment fetch (may need to join profile display name)

**Fix:** Show `display_name` alongside Organic ID. Fallback to just Organic ID if no display name set. Format: "Display Name · Organic #ID" or "Display Name" with ID as subtitle.

### Task 11: Stage transition history / audit trail

**Problem:** Stage stepper shows current state but no history of when transitions happened or who triggered them.

**Files:**
- `src/app/[locale]/proposals/[id]/page.tsx` — detail page
- Database: `proposal_stage_events` table (likely exists from governance integrity work)

**Approach:** Add a collapsible "Stage History" section below the stepper or in the Decision Rail showing: Stage → Stage, timestamp, actor. Example: "Public → Discussion · 3 days ago · by Organic #123"

### Task 12: Category filter responsive improvements

**Problem:** Category filter pills truncate on mobile ("Governance / Po...").

**Files:**
- `src/app/[locale]/proposals/page.tsx` — filter bar

**Fix:** Use horizontal scroll with fade edge affordance (similar to stage pills). Alternatively, use abbreviated labels on mobile: "Gov / Policy", "Community", "Treasury".

---

## Implementation Notes

- Track 1 tasks are independent and can be parallelized
- Track 2 tasks should follow organic-ux design system (spacing, color tokens, typography)
- Task 5 (onboarding persistence) benefits all sections, not just proposals
- Task 6 (Decision Rail mobile) is the highest-impact visual change
- Prototype-executor should focus prototyping on Tasks 6, 7, 8 (layout changes)
- Tasks 9, 10, 11, 12 are simpler and can be done as focused fixes

## Verification

After implementation:
- Re-run PROP-01 through PROP-17 in 3-viewport headed browser setup
- Verify all 5 functional fixes
- Confirm responsive behavior at 375px, 768px, 1440px
- Check console for new errors
- Verify i18n keys exist for any new strings
