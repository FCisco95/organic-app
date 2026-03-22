# 4.11 Rewards QA Fix + Revamp Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix functional bugs (S0/S1) and revamp UX (S2/S3) across `/rewards` and `/admin/rewards` surfaces.

**Architecture:** Two tracks — Track 1 fixes functional bugs in-place (qa-fixer), Track 2 redesigns the UX via 3 competing prototypes (prototype-executor after `/clear`). Both tracks modify the same component set under `src/components/rewards/` and page files under `src/app/[locale]/rewards/` and `src/app/[locale]/admin/rewards/`.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, next-intl, Lucide icons, Supabase (data source)

---

## Track 1: Functional Fixes (qa-fixer)

These are bugs that must be fixed before any visual revamp.

### Task 1: Hide queue age/risk columns for non-pending claims

**Problem:** All Claims tab shows "840h Healthy" on Paid/Rejected claims. Queue age only matters for Pending status — showing it on resolved claims is noise and misleading.

**Files:**
- Modify: `src/components/rewards/claims-table.tsx:182-260` (desktop table rows)
- Modify: `src/components/rewards/claims-table.tsx:54-156` (mobile card view)

**Changes:**
- In the desktop table row, render queue age and risk cells as `—` when `claim.status !== 'pending'`
- In the mobile card view, only render the risk signals `div` when `claim.status === 'pending'`

**Verify:** `npm run lint && npm run build`
**Visual check:** Open `/en/admin/rewards` → All Claims tab → confirm Paid/Rejected rows show "—" for Queue Age and Risk

---

### Task 2: Fix settlement "Pending" status color (green → neutral)

**Problem:** Settlement status "Pending" renders with green (emerald) styling, implying "safe/healthy." Pending means "not yet settled" — should be neutral/informational.

**Files:**
- Modify: `src/components/rewards/rewards-overview.tsx:185-222` (settlement panel)

**Changes:**
- Add a third style branch: `settlementBlocked` → amber, `settlementStatus === 'committed'` → emerald, everything else (pending/unknown) → gray/blue neutral
- Specifically: when status is `pending` or `null`, use `border-blue-200 bg-blue-50 text-blue-900` instead of emerald
- Update the icon selection: `ShieldAlert` for blocked, `CheckCircle2` for committed, `Clock3` for pending

**Verify:** `npm run lint && npm run build`
**Visual check:** Open `/en/rewards` → settlement panel should be blue/neutral when status is "Pending"

---

### Task 3: Add inline validation to claim modal

**Problem:** Entering invalid amounts (0, below threshold, above balance) silently disables the Submit button with no explanation.

**Files:**
- Modify: `src/components/rewards/claim-modal.tsx:66-91` (below input field)

**Changes:**
- Add validation message below the input showing the specific error:
  - `points < min_threshold` → "Minimum claim is {min} points"
  - `points > claimable_points` → "You only have {available} points"
  - `points <= 0` → "Enter an amount"
- Only show validation when `pointsInput` is non-empty (don't show on initial empty state)
- Use red-500 text styling: `text-xs text-red-500 mt-1`

**Verify:** `npm run lint && npm run build`
**Visual check:** Open claim modal → type "1" → see "Minimum claim is 100 points" below input

---

### Task 4: Add i18n keys for new validation messages

**Files:**
- Modify: `messages/en.json` (Rewards.claimModal section)
- Modify: `messages/pt-PT.json` (same section)
- Modify: `messages/zh-CN.json` (same section)

**New keys:**
```json
{
  "claimModal": {
    "validationMin": "Minimum claim is {min} points",
    "validationMax": "You only have {available} points available",
    "validationZero": "Enter a points amount"
  }
}
```

**Verify:** `npm run lint`

---

### Task 5: Commit Track 1 fixes

```bash
git add src/components/rewards/claims-table.tsx src/components/rewards/rewards-overview.tsx src/components/rewards/claim-modal.tsx messages/en.json messages/pt-PT.json messages/zh-CN.json
git commit -m "fix(rewards): hide stale queue age, fix settlement color, add claim validation"
```

---

## Track 2: Visual/UX Revamp (prototype-executor)

> **Run after `/clear`.** Use `prototype-executor` with 3 competing prototypes.

### UX Direction — What All Prototypes Must Address

These are the S2/S3 findings from QA. Each prototype must solve all of them, but can solve them differently:

#### 1. Mobile CTA buried (critical UX gap)
The Claim button requires 4+ scrolls past educational content. Best-in-class reference: **Linear Mobile** uses swipe actions, **Notion Mobile** uses FABs.

#### 2. Information overload on member rewards page
Claimability checklist + flow steps + settlement panel + guidance + CTA are all visible simultaneously. Reference: **Stripe** uses progressive disclosure — summary visible, details expandable.

#### 3. Admin dashboard duplication
Triage cards (Pending / At-risk / Approved) and Summary Cards below repeat the same data. Reference: **Vercel Dashboard** — single card deck with clear hierarchy.

#### 4. Empty states are minimal
"No claims yet" with no illustration or guidance. Reference: **Linear** — illustration + CTA + explanation.

#### 5. No claim status timeline
Users see current status but no history. Reference: **GitHub** shows event timeline on PRs.

#### 6. No relative timestamps
All dates show absolute format only. Reference: **Linear** — "2 days ago" with absolute on hover.

### Prototype Directions

**Proto A — "Progressive Reveal"**
- Member page: collapsed accordion sections (only checklist + CTA visible by default)
- Floating Claim FAB on mobile
- Admin: single unified command deck (merge triage + summary)
- Claim detail drawer with status timeline

**Proto B — "Dashboard Cards"**
- Member page: hero card with points + CTA, separate detail cards below
- Sticky bottom bar with Claim button on mobile
- Admin: Kanban-style claim status columns (Pending | Approved | Paid)
- Inline claim expansion with timeline

**Proto C — "Stripe-Inspired"**
- Member page: minimal top summary, tabbed detail sections below
- Persistent CTA in page header
- Admin: unified table with inline actions, filter pills, expandable rows
- Status timeline as horizontal chips

### Key Component Files Per Prototype

Each prototype modifies:
- `src/app/[locale]/rewards/page.tsx` — member rewards page layout
- `src/components/rewards/rewards-overview.tsx` — overview card restructure
- `src/app/[locale]/admin/rewards/page.tsx` — admin page restructure
- `src/components/rewards/rewards-summary-cards.tsx` — merge with triage or redesign
- `src/components/rewards/claims-table.tsx` — add timeline, relative dates, better empty states
- `src/components/rewards/distributions-table.tsx` — relative dates, better empty state
- `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json` — new i18n keys

### Benchmark References for Prototypes

| Pattern | Benchmark App | What to Emulate |
|---------|--------------|-----------------|
| Progressive disclosure | Stripe Dashboard | Expand/collapse for details |
| Floating primary action | Notion Mobile | FAB for primary CTA on mobile |
| Status timeline | GitHub PR | Event history per item |
| Unified command deck | Vercel Dashboard | Single card section with hierarchy |
| Rich empty states | Linear | Illustration + CTA + explanation |
| Relative timestamps | Linear | "2 days ago" with absolute on hover |
| Filter pills | Linear | Status/type as composable chips |

---

## QA Verification Checklist

After all changes are merged, verify:

- [ ] `/en/rewards` — member view loads with correct claimability data
- [ ] Claim button disabled with specific reason shown
- [ ] Claim modal shows inline validation for invalid amounts
- [ ] Settlement panel uses neutral color for "Pending" status
- [ ] `/en/admin/rewards` — All Claims tab hides queue age for resolved claims
- [ ] Admin pay modal shows guardrails and requires tx signature
- [ ] Council cannot trigger manual distribution or review/pay actions
- [ ] Member cannot access `/en/admin/rewards`
- [ ] Mobile rewards page: primary CTA reachable without excessive scrolling
- [ ] All i18n keys present in en, pt-PT, zh-CN
