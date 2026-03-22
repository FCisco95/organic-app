# 4.13 Admin Ops — QA & Revamp Plan

**Section:** 4.13 Admin Ops
**Routes:** `/admin/settings`, `/admin/submissions`, `/admin/rewards`
**Tested:** 2026-03-22 | **Cases:** 8/8 (6 PASS, 2 PARTIAL) | **Severity:** S2
**Benchmark refs:** Linear admin panel, Vercel project settings, Stripe dashboard, GitHub org settings

---

## Functional Fixes (qa-fixer)

These are mandatory fixes — bugs and missing behavior.

### Fix 1: Add success toast on settings save (S2)
**Case:** ADM-04
**File:** `src/app/[locale]/admin/settings/page.tsx`
**Problem:** Settings save completes silently — the change reason field and buttons disappear, but there's no toast or inline confirmation. User has no explicit feedback that the save succeeded.
**Expected:** Toast notification "Settings updated" on success, "Failed to update settings" on error.
**Benchmark:** Vercel shows inline "Saved" chip. Linear shows toast. Stripe shows "Changes saved" banner.
**Fix:** After successful PATCH response, call `toast.success()`. On error, call `toast.error()` with the error message.

### Fix 2: Missing React key prop in ClaimsTable (S2)
**Case:** ADM-06
**File:** `src/components/rewards/claims-table.tsx`
**Problem:** Console error: "Each child in a list should have a unique 'key' prop" in `ClaimsTable` render method.
**Fix:** Add unique `key` prop to the list items (likely the claims map — use `claim.id` or similar).

### Fix 3: Add warning context on dangerous governance controls (S2)
**Case:** ADM-07
**File:** `src/components/settings/governance-tab.tsx`
**Problem:** High-impact governance settings (quorum, approval threshold, voting duration) have no warning indicators, impact descriptions, or confirmation dialogs. Changing quorum from 5% to 1% could fundamentally break governance but the UI treats it the same as changing a description.
**Benchmark:** Stripe shows "This will affect all team members" callouts. GitHub shows confirmation dialog for org-level changes.
**Fix:** Add warning callout/badge to dangerous fields (quorum, approval threshold, voting duration, max live proposals). Include brief impact description like "Lowering quorum below 5% may allow proposals to pass with minimal participation."

---

## Visual/UX Revamp (prototype-executor)

Creative direction for 3 benchmark-driven prototypes.

### Current State Assessment
- **Strengths:** Clean tab structure, good mobile responsiveness, audit trail requirement (change reason), role-based access control working well, card-based mobile members layout.
- **Weaknesses:** No admin dashboard/overview, settings page is a flat list of inputs with no visual hierarchy, no audit trail visibility (who changed what, when), rewards page has good data density but could benefit from better visual hierarchy.

### Revamp Scope
All 3 admin pages + a new admin landing/dashboard page.

### Prototype Direction A: "Linear Admin Panel"
- **Concept:** Unified admin dashboard with activity feed + quick stats
- **Admin landing page** at `/admin` showing: recent config changes (audit trail), pending items count, system health indicators
- **Settings:** Group controls into "Safe" (general, token) and "Governance" (quorum, thresholds) sections with visual separation. Dangerous controls get amber left-border treatment.
- **Submissions:** Timeline view instead of flat list when items exist
- **Rewards:** Kanban-style columns for claim status (Pending → Approved → Paid)

### Prototype Direction B: "Vercel Settings Hub"
- **Concept:** Settings-first design with sidebar navigation within settings
- **Settings restructured** as a mini-app: left sidebar with section nav (General, Security, Governance, Rewards Config), right panel shows the selected section
- **Dangerous settings** get a destructive zone at the bottom (like Vercel's "Delete Project" section) with red border and explicit confirmation
- **Inline audit history:** "Last changed by Cisco, 2 hours ago" under each setting group
- **Submissions/Rewards:** Kept as separate pages but visually connected through shared admin breadcrumb

### Prototype Direction C: "Stripe Dashboard"
- **Concept:** Data-dense admin overview with expandable detail panels
- **Admin dashboard** with KPI cards: total members, active proposals, pending claims, recent config changes
- **Settings:** Accordion sections that expand inline. Each section shows summary (current values) when collapsed, full edit form when expanded. Dangerous sections have amber header.
- **Rewards:** Enhanced table with inline expansion for claim details, bulk actions toolbar
- **Audit log page:** Dedicated `/admin/audit` page showing all config changes with before/after diff view

### Shared Revamp Elements (all prototypes)
1. **Admin landing page** — Currently no `/admin` route. All prototypes add one.
2. **Audit trail visibility** — Surface "last changed by X, Y ago" somewhere in settings
3. **Dangerous controls visual treatment** — Amber/warning styling for governance settings
4. **Success feedback** — Consistent toast/inline confirmation on all mutations
5. **Council vs Admin visual distinction** — Badge or indicator showing what the current role can/cannot do

### Files Likely Affected
- `src/app/[locale]/admin/settings/page.tsx` — Settings page
- `src/app/[locale]/admin/rewards/page.tsx` — Rewards management
- `src/app/[locale]/admin/submissions/page.tsx` — Submission queue
- `src/app/[locale]/admin/page.tsx` — **NEW** admin dashboard/landing
- `src/components/settings/*.tsx` — All 8 tab components
- `src/components/rewards/claims-table.tsx` — Key prop fix + revamp
- `src/components/layout/nav-config.ts` — Admin nav update for dashboard link

---

## Acceptance Criteria

### Functional Fixes
- [ ] Settings save shows toast notification (success and error)
- [ ] ClaimsTable console error resolved (unique key prop)
- [ ] Governance tab has warning callouts on dangerous controls

### Revamp
- [ ] Admin landing page exists with useful overview
- [ ] Dangerous settings visually distinguished from safe ones
- [ ] Audit trail surfaced in settings UI
- [ ] All mutations show feedback (toast/inline)
- [ ] Mobile usability maintained or improved
