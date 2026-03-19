# Home/Analytics 4.3 QA Fix & Revamp Plan

**Date**: 2026-03-19
**Section**: 4.3 Home, Analytics, Treasury
**Routes**: `/`, `/analytics`, `/treasury`
**Branch**: `phase/community-merge`

---

## Phase 1: QA Fixer (bugs & UX issues)

### Task 1: Fix activity feed visual hierarchy (H-01/H-02)

The "What's happening" feed shows identical entries with no differentiation. Add event-type icons, color coding, and proper actor name display.

**Files:**
- `src/components/dashboard/activity-item.tsx` — add icon per event type, color-code left border
- `src/components/dashboard/activity-feed.tsx` — limit to 5 items, add "View all" link

**Steps:**
1. Read `activity-item.tsx` and `activity-feed.tsx`
2. Create an event-type icon map: `proposal_created` → FileText (blue), `vote_cast` → Vote (purple), `task_completed` → CheckCircle (green), `dispute_escalated` → Shield (red), `member_joined` → UserPlus (orange), default → Activity (gray)
3. Add a colored left border per event type to each activity row
4. Show actor name prominently (bold) before the action text
5. In `activity-feed.tsx`, limit visible items to 5 with a "View all activity" link below
6. Add i18n key `viewAllActivity` to all 3 locales

**Verify:** `npm run lint`

---

### Task 2: Fix scroll trap (H-05)

`window.scrollBy()` doesn't work — only the `main` element scrolls. This breaks keyboard navigation and assistive technology.

**Files:**
- `src/components/layout/app-shell.tsx` or equivalent layout wrapper

**Steps:**
1. Find the layout component that wraps the main content area
2. Identify the `overflow-y-auto` or `overflow-auto` on the `main` element
3. Move the scroll to the page/body level, or ensure the `main` element receives focus for keyboard scroll
4. Test that `window.scrollBy()` works after the fix

**Verify:** `npm run lint`, manual check that page scrolls with keyboard

---

### Task 3: Fix feature carousel text truncation (H-06)

Carousel card descriptions get cut off ("Every proposal you create or...").

**Files:**
- `src/components/home/feature-carousel.tsx`

**Steps:**
1. Read the carousel component
2. Find the description text container and check for `truncate`, `line-clamp`, or fixed height
3. Allow 3-4 lines of description text (use `line-clamp-4` instead of `line-clamp-2` or remove the clamp)
4. Ensure card height accommodates the longer text gracefully

**Verify:** `npm run lint`

---

### Task 4: Improve empty states for pre-listing data (H-03, A-01, T-01)

Replace bare "—" dashes with informative empty states for $ORG Price, Market Cap, and Total Treasury Value.

**Files:**
- `src/app/[locale]/page.tsx` or trust pulse component — for home stats
- `src/app/[locale]/analytics/page.tsx` — for analytics stats
- `src/app/[locale]/treasury/page.tsx` — for treasury value

**Steps:**
1. Find the stat cards that show "—"
2. Replace with a subtle empty state: icon + "Available after token listing" in `text-xs text-muted-foreground`
3. Add i18n key `availableAfterListing` to all 3 locales

**Verify:** `npm run lint`

---

### Task 5: Clarify sprint countdown (H-04)

"Ending now" with "0h" is ambiguous. Differentiate between "no active sprint" and "sprint at 0 hours remaining."

**Files:**
- Trust pulse sprint countdown component (find in home page components)

**Steps:**
1. Find the sprint countdown component
2. When countdown is 0 AND sprint is still active: show "Sprint ending — act fast!"
3. When no active sprint exists: show "No active sprint" with a different styling
4. Add i18n keys for both states to all 3 locales

**Verify:** `npm run lint`

---

## Phase 2: QA Revamp (visual polish)

### Task 6: Enhance Trust Pulse cards

**Files:**
- Trust pulse component on home page

**Steps:**
1. Add subtle background tint per card type (blue for leaderboard, green for sprint, purple for proposals, orange for activity)
2. Make leaderboard entries clickable — link to `/community`
3. Add hover effect on cards: `hover:border-organic-orange/30 transition-colors`

---

### Task 7: Feature carousel auto-play + polish

**Files:**
- `src/components/home/feature-carousel.tsx`

**Steps:**
1. Add auto-advance every 6 seconds with pause-on-hover
2. Make dot indicators clickable (jump to specific slide)
3. Add `prefers-reduced-motion` check — disable auto-play for reduced motion users

---

### Task 8: Activity feed event-type visual polish

**Files:**
- `src/components/dashboard/activity-item.tsx`

**Steps:**
1. Add subtle background tint per event type (matching the icon color at 5% opacity)
2. Add `animate-fade-up-in` entrance animation with stagger
3. Add relative time formatting consistency ("2m ago", "1h ago", "3d ago")

---

## i18n Keys (all tasks)

**en.json:**
```
"viewAllActivity": "View all activity",
"availableAfterListing": "Available after token listing",
"sprintEndingSoon": "Sprint ending — act fast!",
"noActiveSprint": "No active sprint"
```

**pt-PT.json:**
```
"viewAllActivity": "Ver toda a atividade",
"availableAfterListing": "Disponível após listagem do token",
"sprintEndingSoon": "Sprint a terminar — aja rápido!",
"noActiveSprint": "Nenhum sprint ativo"
```

**zh-CN.json:**
```
"viewAllActivity": "查看所有活动",
"availableAfterListing": "代币上市后可用",
"sprintEndingSoon": "冲刺即将结束——快行动！",
"noActiveSprint": "没有活跃的冲刺"
```

---

## Execution Order

1. Tasks 1-5 (QA Fixer) — sequential, commit after each
2. Tasks 6-8 (Revamp polish) — can be batched
3. Final validation: `npm run lint` + `npm run build`
4. Update QA runbook section 4.3 to DONE

---

## Acceptance Criteria

1. Activity feed shows event-type icons with color-coded left borders
2. Activity feed limited to 5 items with "View all" link
3. Page scrolls with `window.scrollBy()` (scroll trap fixed)
4. Carousel descriptions don't truncate
5. Empty stats show "Available after token listing" instead of "—"
6. Sprint countdown differentiates active-ending vs no-sprint
7. Trust Pulse cards have subtle color tints and hover effects
8. Carousel auto-advances with reduced-motion respect
9. All new i18n keys in en, pt-PT, zh-CN
10. `npm run lint` + `npm run build` pass
