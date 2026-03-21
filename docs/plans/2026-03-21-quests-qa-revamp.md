# 4.6 Quests, Referrals, Gamification — QA + Revamp Plan

**Date:** 2026-03-21
**Section:** 4.6 Quests, Referrals, and Gamification Controls
**QA Result:** 9/11 PASS, 1 PARTIAL (S1), 1 SKIP | Severity S1
**Pipeline:** TESTED → this plan → qa-fixer → /clear → prototype-executor

---

## Track 1: Functional Fixes (qa-fixer)

### Fix 1: Quest i18n errors on progression page (S1)

**File:** `src/components/gamification/progression-shell.tsx`
**Issue:** 18 `MISSING_MESSAGE` console errors. `resolveQuestTitle()` at line ~220 tries to resolve `Gamification.questCopy.<uuid>.title` but these i18n keys don't exist in message files. The quests use DB-driven UUIDs as IDs.
**Root cause:** The function tries i18n lookup first, falls back to `quest.title`, but `quest.title` from the API is null for some quests. The i18n keys were never created because quests are admin-defined with dynamic titles.
**Fix:** Change `resolveQuestTitle()` to:
1. Try `quest.title` from API data first (primary source of truth)
2. Only fall back to i18n if API title is null
3. Final fallback: show quest metric name formatted (e.g., `daily_tasks_completed` → "Daily Tasks Completed")

**Verification:** Navigate to `/profile/progression`, confirm 0 console errors and quest titles display correctly.

---

## Track 2: Visual/UX Revamp (prototype-executor)

### Benchmark References

- **Duolingo** — Quest cards with progress rings, streak flames, celebration animations, daily streak counter. The gold standard for gamification UX.
- **Dropbox Referrals** — Visual tier progress (Free → Plus → Professional), clear reward milestones, share-anywhere buttons.
- **GitHub Contributions** — Category-colored activity visualization, streak heatmap, achievement badges.
- **Linear** — Clean data tables, milestone progress indicators, keyboard-first interactions.

### Revamp 1: Dark Theme Consistency (Critical)

**Current:** Entire section uses hardcoded light-mode colors: `bg-white`, `text-gray-900`, `border-gray-200`, `from-orange-50 via-white to-amber-50`.
**Target:** Replace all hardcoded colors with design system tokens to match the dark shell.

Files to update:
- `src/components/gamification/quests-page.tsx` — `text-gray-900` → `text-foreground`
- `src/components/gamification/referral-section.tsx` — `bg-gradient-to-br from-orange-50` → `bg-card`, `border-orange-200/60` → `border-border`
- `src/components/gamification/quest-card.tsx` — `bg-white` → `bg-card`, `border-gray-200` → `border-border`
- `src/components/gamification/quest-grid.tsx` — `bg-gray-200` → `bg-muted`
- `src/components/gamification/quest-level-sidebar.tsx` — All gray/white references
- `src/components/gamification/burn-confirm-dialog.tsx` — Check for hardcoded colors

### Revamp 2: Quest Card Redesign

**Current:** Flat white cards with text + tiny progress bar. Unengaging.
**Target:** Rich, motivating quest cards inspired by Duolingo.

Changes:
- Progress ring (circular) instead of flat bar — shows completion visually
- Category color coding: Governance (blue), Tasks (orange), Social (green), XP (purple)
- Completed cards: checkmark overlay with subtle celebration pulse animation
- Quest icon: use Lucide icons matching the quest type instead of emoji
- "Resets periodically" → actual countdown: "Resets in 4h 23m" (if daily) or "Resets Monday" (if weekly)
- CTA link: "Go to Tasks →" for task quests, "Go to Proposals →" for governance quests

### Revamp 3: Referral Section Redesign

**Current:** Form-like layout with 3 stat cards (0, 0, 0). Functional but uninspiring.
**Target:** Dropbox-style tier progression with visual impact.

Changes:
- Tier progress visualization: horizontal stepper showing Bronze → Silver → Gold with rewards at each tier
- Current tier highlighted with glow effect
- Share buttons: not just "copy link" but "Share via Twitter", "Share via Telegram" (future-ready placeholders)
- Referral stats as mini dashboard: donut chart for completion rate, number callouts
- "Next reward at 3 referrals" — clear goal messaging

### Revamp 4: Level Sidebar Enhancement

**Current:** Basic text: "0 XP total", "100 XP to next level", progress bar.
**Target:** Engaging level display inspired by gaming UX.

Changes:
- Circular level badge with current level number (large, centered)
- XP progress as animated ring around the level badge
- "Next level" preview with reward hint
- Streak counter (if implemented): flame icon + day count
- Achievements section: small badge icons showing unlocked achievements
- Burn button: only show when burn is enabled; otherwise show info card "Leveling is automatic"

### Revamp 5: New Features

#### 5a. Daily Streak Tracker
- Show streak count on quests page (and optionally in sidebar/top-bar)
- Flame icon with day count: "🔥 7-day streak"
- Streak break warning: "Don't lose your streak! Complete a quest today."
- Data source: already tracked in gamification overview API (`daily_streak` field if it exists)

#### 5b. XP Activity Feed
- Small section below quests showing recent XP gains
- Timeline format: "+25 XP from Daily Builder · 2h ago"
- Vercel's deployment timeline pattern adapted for XP events
- Max 5 recent entries, "View all" links to progression

#### 5c. Quest Completion Celebration
- When a quest reaches 100%, show a brief animation (confetti burst or checkmark scale-up)
- Toast notification: "Quest complete! +25 XP earned"
- Sound effect (optional, respect user preference)

---

## Prototype Strategy

| Prototype | Benchmark | Key Feature |
|-----------|-----------|-------------|
| A | Duolingo | Progress rings, streak flames, celebration animations, category colors |
| B | GitHub + Linear | Contribution-style cards, activity timeline, clean data density |
| C | Dropbox + Vercel | Tier progression stepper, minimal cards, timeline feed, whitespace-rich |

---

## Files to Modify

### Existing
- `src/components/gamification/quests-page.tsx`
- `src/components/gamification/quest-card.tsx`
- `src/components/gamification/quest-grid.tsx`
- `src/components/gamification/quest-level-sidebar.tsx`
- `src/components/gamification/referral-section.tsx`
- `src/components/gamification/burn-confirm-dialog.tsx`
- `src/components/gamification/progression-shell.tsx`
- `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

### New (potentially)
- `src/components/gamification/streak-counter.tsx`
- `src/components/gamification/xp-activity-feed.tsx`
- `src/components/gamification/quest-progress-ring.tsx`
- `src/components/gamification/tier-stepper.tsx`

---

## Verification Checklist

- [ ] All 11 GAM cases still PASS after changes
- [ ] 0 console errors on /quests and /profile/progression
- [ ] Dark theme tokens used throughout — no hardcoded gray/white
- [ ] Quest cards show progress rings with category colors
- [ ] Referral tier stepper shows current progress
- [ ] Level sidebar shows circular badge with XP ring
- [ ] Burn button hidden when disabled (not shown as disabled CTA)
- [ ] Mobile layout: single column, no overflow, touch-friendly
- [ ] i18n: all new strings in 3 locales
- [ ] Streak counter displays (if daily_streak data available)
