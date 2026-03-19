# Community 4.4 UX Revamp Plan

**Date**: 2026-03-19
**Section**: 4.4 Community (Rankings + Directory + Profile)
**Routes**: `/community`, `/community/[id]`
**Branch base**: `phase/community-merge`
**Approach**: Option C — "Hero Stats + Polish" with profile two-column upgrade

---

## Context

The Community hub is functional (12/12 QA pass, S3 severity) but visually plain compared to the revamped Proposals surface. The biggest gaps are:

1. Static hero with no live data
2. Basic tab labels with no count badges
3. Plain profile page (single-column white cards) vs. proposals detail's rich two-column layout
4. No micro-animations beyond staggered fade-up

All bugs are fixed (COMM-04 tab state, achievement i18n keys). This revamp is purely visual/UX polish.

---

## Prototype Strategy

Three prototypes, each diverging on the **profile page layout** (highest-impact surface). All three share the same hero/tab/podium polish baseline.

### Shared Baseline (all 3 prototypes)

| Change | Detail |
|--------|--------|
| Hero stat pills | Add live member count + "active this week" (computed from leaderboard data where `xp_total > 0`) |
| Tab count badges | Show "(N)" count next to each tab label |
| Podium #1 glow | Enhanced `animate-glow-pulse` with larger shadow spread on 1st place pedestal |
| Table row hover | Add `hover:bg-muted/50` + subtle left border accent on hover |
| Directory rank overlay | Show rank badge on member cards for top-100 members |
| Reduced motion | All new animations gated by `prefers-reduced-motion` |

### Prototype A — "Sticky Sidebar"

Profile page uses two-column layout mirroring proposals detail:
- **Left column**: Profile header, bio, stats grid, activity/contributions
- **Right sidebar** (sticky `lg:top-24`): Reputation card (level badge, XP bar, streak), achievement grid, section nav
- Breakpoint: Single column below `lg` (1024px)
- Sidebar collapses below content on mobile

### Prototype B — "Tabbed Profile Sections"

Profile page keeps single-column but adds a horizontal tab strip below the header:
- Tabs: Overview | Reputation | Achievements | Activity
- Each tab is a focused view — cleaner per-section experience
- Header stays pinned above tabs
- Tab content animates with `fade-up` on switch

### Prototype C — "Card Stack with Expandable Panels"

Profile page uses collapsible card sections (accordion-style):
- All sections visible but collapsed by default (Overview expanded)
- Click to expand Reputation, Achievements, etc.
- Smooth height animation with `grid-rows` transition trick
- Compact mobile-first — user controls information density

---

## Files to Touch

### Shared (all prototypes)

| File | Change |
|------|--------|
| `src/components/community/community-hero.tsx` | Add stat pills (member count, active this week) |
| `src/components/community/community-tabs.tsx` | Add count badges to tab labels |
| `src/components/community/rankings-tab.tsx` | Podium #1 glow upgrade, table row hover |
| `src/components/community/directory-tab.tsx` | Pass rank overlay prop to MemberGrid |
| `src/components/members/member-card.tsx` | Rank badge overlay for top-100 |
| `messages/en.json` | New i18n keys for stat pills, badges |
| `messages/pt-PT.json` | Portuguese translations |
| `messages/zh-CN.json` | Chinese translations |

### Prototype-specific

| Prototype | New/modified files |
|-----------|-------------------|
| A (Sticky Sidebar) | `src/app/[locale]/community/[id]/page.tsx` — two-column layout; new `src/components/community/profile-sidebar.tsx` |
| B (Tabbed Sections) | `src/app/[locale]/community/[id]/page.tsx` — tab strip + tab content; new `src/components/community/profile-tabs.tsx` |
| C (Card Stack) | `src/app/[locale]/community/[id]/page.tsx` — accordion sections; new `src/components/community/collapsible-section.tsx` |

---

## Acceptance Criteria

1. Hero displays live member count and "active this week" stat pill
2. Tab labels show count badges (e.g., "Rankings (417)")
3. Podium #1 has enhanced glow treatment
4. Table rows have hover highlight with left accent border
5. Directory member cards show rank badge for top-100 members
6. Profile page has improved layout per prototype variant
7. All animations respect `prefers-reduced-motion`
8. All new i18n keys in en, pt-PT, zh-CN
9. `npm run lint` + `npm run build` pass
10. QA runbook section 4.4 updated to DONE

---

## Decisions

- **No new API endpoints** — "active this week" derived client-side from existing leaderboard data
- **Profile layout** is the divergence axis — hero/tab/podium polish is shared
- **Prototype winner** selected by user comparison after all 3 are built
- **Merge target**: `main` (after PR review)

---

## Verification

```bash
npm run lint
npm run build
```

Manual check: desktop + mobile for `/community` and `/community/[id]` in all 3 locales.
