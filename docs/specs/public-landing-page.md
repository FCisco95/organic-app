# Public Landing Page — Detailed Implementation Spec

> Priority: Pre-launch
> Tone: Professional + crypto-native (Organic Protocol rebrand direction)
> Tagline direction: "A coordination layer for communities to interact, collaborate, and share rewards based on work merit"

---

## Implementation Sequence

```
Step 1 → Create public stats API endpoint
Step 2 → Build landing page route (unauthenticated)
Step 3 → Build Hero section
Step 4 → Build Feature Overview grid
Step 5 → Build "How it works" section
Step 6 → Build Live Stats section
Step 7 → Build Transparency Links section
Step 8 → Build Footer
Step 9 → Add redirect logic for unauthenticated root visitors
Step 10 → Add i18n translations
Step 11 → Add OG meta tags for the landing page
Step 12 → Mobile responsive pass
```

---

## UI Wireframes

### Full Page Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────┐
│  🌿 Organic Protocol                        [Join] [Explore]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              COORDINATE. CONTRIBUTE. EARN.                   │
│                                                              │
│     A merit-based coordination layer for Web3 communities.   │
│     Manage tasks, govern transparently, and reward real      │
│     contributors — not speculators.                          │
│                                                              │
│            [ Join the DAO ]    [ Explore → ]                 │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    HOW IT WORKS                              │
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│   │    1.     │    │    2.     │    │    3.     │             │
│   │ Connect   │ →  │ Verify   │ →  │ Start    │             │
│   │ Wallet    │    │ Token    │    │ Earning  │             │
│   │           │    │          │    │          │             │
│   │ Link your │    │ Hold the │    │ Pick     │             │
│   │ Solana    │    │ community│    │ tasks,   │             │
│   │ wallet    │    │ token to │    │ vote,    │             │
│   │           │    │ unlock   │    │ earn XP  │             │
│   └──────────┘    └──────────┘    └──────────┘              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                  BUILT FOR REAL WORK                         │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  📋 Tasks   │ │ 🗳 Govern   │ │ ⭐ Reputation│           │
│  │             │ │             │ │             │           │
│  │ Kanban,     │ │ Proposals,  │ │ XP, levels, │           │
│  │ assignments,│ │ voting,     │ │ achievements│           │
│  │ reviews,    │ │ delegation, │ │ streaks,    │           │
│  │ sprints     │ │ execution   │ │ credentials │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 💰 Treasury │ │ 💡 Ideas    │ │ 🏆 Rewards  │           │
│  │             │ │             │ │             │           │
│  │ Transparent │ │ Community   │ │ Token       │           │
│  │ spending,   │ │ idea funnel │ │ distribution│           │
│  │ budgets,    │ │ to proposal │ │ based on    │           │
│  │ public view │ │ pipeline    │ │ merit       │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                  LIVE PLATFORM STATS                         │
│                                                              │
│    ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐       │
│    │  127   │   │  843   │   │   42   │   │ 12.4K  │       │
│    │Members │   │ Tasks  │   │Proposals│  │  XP    │       │
│    │        │   │Complete│   │ Passed  │   │Awarded │       │
│    └────────┘   └────────┘   └────────┘   └────────┘       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              TRANSPARENT BY DEFAULT                          │
│                                                              │
│    View our [Public Treasury] · Browse [Community Ideas]     │
│    See [Member Profiles] · Read our [Governance Docs]        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🌿 Organic Protocol          Built by the community        │
│                                                              │
│  Docs · GitHub · Twitter · Discord                           │
│                                                              │
│  © 2026 Organic Protocol                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌───────────────────────┐
│ 🌿 Organic    [Join]  │
├───────────────────────┤
│                       │
│ COORDINATE.           │
│ CONTRIBUTE.           │
│ EARN.                 │
│                       │
│ A merit-based         │
│ coordination layer    │
│ for Web3 communities. │
│                       │
│ [ Join the DAO ]      │
│ [ Explore → ]         │
│                       │
├───────────────────────┤
│    1. Connect Wallet  │
│         ↓             │
│    2. Verify Token    │
│         ↓             │
│    3. Start Earning   │
├───────────────────────┤
│ ┌───────┐ ┌───────┐  │
│ │ Tasks │ │Govern │  │
│ └───────┘ └───────┘  │
│ ┌───────┐ ┌───────┐  │
│ │Reputa-│ │Treasu-│  │
│ │tion   │ │ry     │  │
│ └───────┘ └───────┘  │
│ ┌───────┐ ┌───────┐  │
│ │ Ideas │ │Rewards│  │
│ └───────┘ └───────┘  │
├───────────────────────┤
│  127     843          │
│ Members  Tasks Done   │
│                       │
│  42      12.4K        │
│ Proposals XP Awarded  │
├───────────────────────┤
│ 🌿 Organic Protocol   │
│ Docs · GitHub · X     │
└───────────────────────┘
```

---

## API

### Public Stats Endpoint

**File:** `src/app/api/public/stats/route.ts`

```typescript
// GET /api/public/stats
// No auth required
// Response:
{
  total_members: number;      // COUNT from user_profiles
  tasks_completed: number;    // COUNT tasks WHERE status = 'done'
  proposals_passed: number;   // COUNT proposals WHERE result = 'passed'
  total_xp_awarded: number;   // SUM from reputation_events or user_profiles.xp
}
// Cache: 5 minute TTL (Cache-Control: public, max-age=300)
```

**Implementation notes:**
- Use `createServiceClient()` (service role) since this is unauthenticated
- Cache response with `Cache-Control` header to reduce DB load
- Existing `/api/stats` may already provide some of this — check and extend or create new

---

## File Path Summary

| What | Path |
|---|---|
| Landing page | `src/app/[locale]/landing/page.tsx` |
| Landing layout | `src/app/[locale]/landing/layout.tsx` (no sidebar/nav) |
| Public stats API | `src/app/api/public/stats/route.ts` |
| Hero component | `src/components/landing/hero.tsx` |
| Features grid | `src/components/landing/features-grid.tsx` |
| How it works | `src/components/landing/how-it-works.tsx` |
| Stats counter | `src/components/landing/stats-counter.tsx` |
| Transparency links | `src/components/landing/transparency-links.tsx` |
| Footer | `src/components/landing/footer.tsx` |
| i18n keys (en) | `messages/en/landing.json` |
| i18n keys (pt-PT) | `messages/pt-PT/landing.json` |
| i18n keys (zh-CN) | `messages/zh-CN/landing.json` |

---

## Redirect Logic

**File:** `src/middleware.ts` (modify existing)

For unauthenticated visitors hitting `/`:
- Redirect to `/[locale]/landing` instead of `/[locale]/login`
- Keep `/[locale]/login` as a separate route
- Authenticated users hitting `/` still go to dashboard

---

## Styling Notes

- Use existing design tokens from `globals.css` (`--section-radius`, `--section-padding`, `--transition-ui`)
- Dark background (consistent with app theme)
- Green accent color (`#22c55e` — Organic green)
- Use Lucide icons (already in project) for feature cards
- Animated count-up for stats: use CSS `counter` or a lightweight library (no new deps preferred)
- Smooth scroll between sections
- Landing layout should NOT include the authenticated sidebar/navigation — clean, marketing-style layout

---

## i18n Keys Structure

```json
{
  "landing": {
    "hero": {
      "title": "Coordinate. Contribute. Earn.",
      "subtitle": "A merit-based coordination layer for Web3 communities.",
      "cta_join": "Join the DAO",
      "cta_explore": "Explore"
    },
    "howItWorks": {
      "title": "How It Works",
      "step1_title": "Connect Wallet",
      "step1_desc": "Link your Solana wallet to get started.",
      "step2_title": "Verify Token",
      "step2_desc": "Hold the community token to unlock access.",
      "step3_title": "Start Earning",
      "step3_desc": "Pick tasks, vote on proposals, earn XP and rewards."
    },
    "features": {
      "title": "Built for Real Work",
      "tasks": { "title": "Tasks", "desc": "Kanban, assignments, reviews, sprints" },
      "governance": { "title": "Governance", "desc": "Proposals, voting, delegation, execution" },
      "reputation": { "title": "Reputation", "desc": "XP, levels, achievements, streaks" },
      "treasury": { "title": "Treasury", "desc": "Transparent spending, budgets, public view" },
      "ideas": { "title": "Ideas", "desc": "Community idea funnel to proposal pipeline" },
      "rewards": { "title": "Rewards", "desc": "Token distribution based on merit" }
    },
    "stats": {
      "title": "Live Platform Stats",
      "members": "Members",
      "tasks_completed": "Tasks Completed",
      "proposals_passed": "Proposals Passed",
      "xp_awarded": "XP Awarded"
    },
    "transparency": {
      "title": "Transparent by Default",
      "treasury_link": "Public Treasury",
      "ideas_link": "Community Ideas",
      "profiles_link": "Member Profiles"
    },
    "footer": {
      "built_by": "Built by the community"
    }
  }
}
```

---

## Open Graph Meta

```typescript
export const metadata: Metadata = {
  title: 'Organic Protocol — Coordinate. Contribute. Earn.',
  description: 'A merit-based coordination layer for Web3 communities. Manage tasks, govern transparently, and reward real contributors.',
  openGraph: {
    title: 'Organic Protocol',
    description: 'Merit-based coordination for Web3 communities',
    images: ['/og/landing.png'], // 1200x630 branded OG image
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organic Protocol',
    description: 'Merit-based coordination for Web3 communities',
    images: ['/og/landing.png'],
  },
};
```
