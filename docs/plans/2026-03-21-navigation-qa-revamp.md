# 4.2 Navigation, Layout, i18n — QA + Revamp Plan

**Date:** 2026-03-21
**Section:** 4.2 Global Navigation, Layout, and i18n
**QA Result:** 8/8 PASS, Severity S3
**Pipeline:** TESTED → this plan → qa-fixer → /clear → prototype-executor

---

## Track 1: Functional Fixes (qa-fixer)

### Fix 1: Mobile sidebar missing DialogTitle (a11y)

**File:** `src/components/layout/mobile-sidebar.tsx`
**Issue:** SheetContent fires 2 Radix console errors: "DialogContent requires a DialogTitle for screen reader users"
**Fix:** Add a visually hidden `SheetTitle` inside the SheetContent. Import `VisuallyHidden` from Radix or use `sr-only` class.

```tsx
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
// Inside SheetContent:
<SheetTitle className="sr-only">Navigation menu</SheetTitle>
```

**Verification:** Open mobile sidebar, check console — 0 DialogTitle errors.

### Fix 2: Settings access denied copy (minor)

**File:** Settings page component (admin/settings)
**Issue:** Denial message says "admin or council permissions" but council is also blocked. Should say "admin permissions" only.
**Fix:** Update the copy to "You need admin permissions to access settings."

**Verification:** Login as council, navigate to `/admin/settings`, confirm copy is accurate.

---

## Track 2: Visual/UX Revamp (prototype-executor)

### Benchmark References

- **Linear:** Collapsible sidebar sections (Teams, Favorites, Projects). Cmd+K command palette as primary nav. Keyboard-first.
- **Stripe Dashboard:** Left nav with clear grouping headers. Resource pages follow consistent pattern.
- **Vercel:** Search-first navigation. Clean sidebar with minimal nesting.

### Revamp 1: Sidebar Section Grouping

**Current:** 13 flat nav items in a single list — hard to scan.
**Target:** Group items into collapsible sections with subtle headers.

Proposed grouping:
| Section | Items |
|---------|-------|
| **Overview** | Home, Analytics, Treasury |
| **Work** | Tasks, Templates, Sprints |
| **Governance** | Proposals, Ideas, Disputes |
| **Social** | Community, Ref & Quests, Rewards, Notifications |
| **Admin** (existing) | Submissions, Manage Rewards, Settings |

**Files:** `nav-config.ts`, `sidebar.tsx`, `mobile-sidebar.tsx`
**Pattern:** Collapsible sections with chevron toggle, remembering collapsed state in localStorage. Like Linear's sidebar sections.

### Revamp 2: Command Palette (Cmd+K)

**Current:** No quick-nav beyond clicking sidebar links.
**Target:** Global command palette for fast navigation, search, and actions.

Features:
- `Cmd+K` / `Ctrl+K` opens modal
- Search across all nav routes with fuzzy matching
- Recent pages section
- Quick actions: "New proposal", "New task", etc.
- Role-aware: admin actions only shown to admins

**Files:** New component `src/components/layout/command-palette.tsx`, integrate in `app-shell.tsx`
**Pattern:** Linear's Cmd+K — minimal modal, instant results, keyboard navigation.

### Revamp 3: Sidebar Visual Polish

**Current:** Functional but flat. Active indicator is good but sections blend together.
**Target:** Subtle visual improvements:
- Section headers with muted text + optional collapse chevron
- Slightly increased spacing between sections (not items)
- Hover state micro-animation (subtle scale or bg transition)
- Collapsed sidebar: section dividers between groups

**Files:** `sidebar.tsx`, `mobile-sidebar.tsx`

### Revamp 4: Top-bar Refinement

**Current:** Functional top-bar with all actions.
**Target:** Minor polish:
- Breadcrumb trail showing current section (e.g., "Work > Tasks > Task Detail")
- Or at minimum, current page name in the top-bar for mobile context

**Files:** `top-bar.tsx`, possibly new `breadcrumbs.tsx` component

---

## Prototype Strategy

Three prototypes, each benchmarked against a different best-in-class app:

| Prototype | Benchmark | Key Feature |
|-----------|-----------|-------------|
| A | Linear | Collapsible sections + Cmd+K palette + keyboard shortcuts |
| B | Stripe | Static grouped nav with clear headers + breadcrumbs |
| C | Vercel | Minimal nav + search-first command bar + auto-collapse |

---

## Verification Checklist

- [ ] All 8 NAV cases still PASS after changes
- [ ] Mobile sidebar opens without console errors
- [ ] Locale switch still updates all labels in grouped sidebar
- [ ] Role-based filtering preserved within sections
- [ ] Active state highlights correctly within grouped sections
- [ ] Command palette responds to Cmd+K globally
- [ ] Sidebar collapse/expand persists across page loads
- [ ] No overlap at 375px and 768px breakpoints
