# 4.17 Onboarding Wizard — QA & Revamp Plan

**Section:** 4.17 Onboarding Wizard
**Routes:** Onboarding modal (auto-opens), `/api/onboarding/steps`, `/api/onboarding/steps/:step/complete`
**Tested:** 2026-03-22 | **Cases:** 10/10 PASS | **Severity:** S3
**Benchmark refs:** Notion onboarding, Linear setup wizard, Stripe onboarding checklist, Vercel project setup

---

## Functional Fixes (qa-fixer)

No S0/S1 bugs found. All 10 test cases pass. The wizard correctly:
- Auto-opens for incomplete users on first authenticated load
- Maintains step order: connect_wallet → verify_token → pick_task → join_sprint
- API returns all 4 step keys with accurate completion state
- Validates prerequisites per step (wallet, organic_id, task assignment, sprint task)
- Persists completed steps across reload/navigation
- Handles idempotent re-completion without duplicate XP awards
- Hides wizard for completed users (profile.onboarding_completed_at gate)

**No functional fixes needed — skip qa-fixer and proceed directly to prototype-executor.**

---

## Visual/UX Improvements (prototype-executor)

### Current State Assessment

The wizard is functional but visually dated — it uses hardcoded gray-800/gray-700 colors instead of design system tokens, lacks animation/transitions between steps, and the progress indicator is basic. The overall experience feels like a minimum viable onboarding rather than a polished first impression.

**Design system compliance: 2/5**
- Uses hardcoded color values (gray-800, gray-700, gray-500, gray-400) instead of theme tokens (border, muted, muted-foreground)
- No animation between step transitions
- Progress connector lines are basic `h-px` dividers
- Step icons use raw emojis (🔗, ✅, 📋, 🏃) instead of consistent Lucide icons
- Footer button styling is inconsistent (text buttons vs. filled orange)

### Benchmark Gap Analysis

**1. Step Progress Indicator**
- **Current:** 4 circles with emojis/checkmarks, connected by plain lines
- **Linear setup wizard:** Numbered steps with animated progress fill, current step has subtle pulse animation
- **Stripe onboarding:** Vertical checklist with expandable sections, green checkmarks animate in
- **Gap:** No animation, no numbered steps, emoji inconsistency, no visual weight on active step

**2. Step Content Layout**
- **Current:** Centered icon + title + description in a plain column. Empty states are a single line of gray text.
- **Notion onboarding:** Full-width illustrations, rich empty states with contextual actions, animated transitions
- **Vercel project setup:** Clean cards with clear CTAs, inline help, contextual tips
- **Gap:** No illustrations or visual richness, empty states feel abandoned ("No open tasks available right now. Check back later!")

**3. Transition Between Steps**
- **Current:** Instant swap — no animation, no slide, no fade
- **Linear:** Smooth horizontal slide between steps
- **Stripe:** Accordion expand/collapse with animation
- **Gap:** Jarring step transitions, no sense of progress movement

**4. Completion Celebration**
- **Current:** Green checkmark + "Token verified!" text. No XP feedback visible.
- **Notion:** Confetti animation on completion
- **Vercel:** "You're all set" with resource links
- **Gap:** No celebration, no XP toast showing "+25 XP earned", no transition to "what's next"

**5. Onboarding Prompt (bottom-right banner)**
- **Current:** Fixed bottom-right toast with progress bar, "Continue" button
- **Linear:** Subtle persistent progress indicator in sidebar
- **Gap:** The prompt is disconnected from the main UI, uses fixed positioning that can overlap content

### Affected Files

| File | Changes Needed |
|------|---------------|
| `src/components/onboarding/onboarding-wizard.tsx` | Complete visual overhaul — theming, animations, layout |
| `src/components/onboarding/wizard-progress.tsx` | Redesign progress indicator — numbered steps, connectors, animations |
| `src/components/onboarding/onboarding-prompt.tsx` | Redesign bottom banner — integrate with design system |
| `src/components/onboarding/steps/step-connect-wallet.tsx` | Visual upgrade — illustrations, better empty/pending states |
| `src/components/onboarding/steps/step-verify-token.tsx` | Visual upgrade — completion celebration, XP feedback |
| `src/components/onboarding/steps/step-pick-task.tsx` | Visual upgrade — better task cards, loading skeleton, empty state |
| `src/components/onboarding/steps/step-join-sprint.tsx` | Visual upgrade — sprint cards, loading skeleton, empty state |

### Prototype Directions

**A: Linear Setup Wizard** — Numbered vertical stepper with animated progress, clean cards for each step, keyboard navigation, subtle dark theme with accent highlights. Power-user oriented.

**B: Notion-style Progressive Onboarding** — Card-based with illustrations per step, progressive disclosure, rich empty states with inline help, smooth slide transitions between steps. Visual learner oriented.

**C: Vercel Deploy Flow** — Minimal, strong typography, timeline-based progress, real-time feedback (XP animation on completion), generous whitespace, inline validation chips. Modern aesthetics oriented.

---

## Acceptance Criteria

1. All 10 ONB cases still pass after revamp
2. Uses design system tokens (no hardcoded gray values)
3. Animated transitions between steps
4. XP feedback visible when completing steps
5. Empty states are actionable (not just "check back later")
6. Responsive: works on mobile (375px) and desktop (1440px)
7. All text uses i18n translation keys
8. Console clean (0 errors)
