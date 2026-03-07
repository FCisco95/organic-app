# Spec: Public Landing Page

> Track 2.2 | Priority: Pre-Launch
> Last updated: 2026-03-07

---

## Goal

Create a compelling unauthenticated landing page that explains what Organic Protocol is when someone visits the root URL. Converts visitors into members.

**Tone:** Professional + crypto-native. Organic started as a meme community but is rebranding to **Organic Protocol** — a coordination layer for communities to interact, collaborate, and distribute rewards based on work merit.

---

## Implementation Sequence

```
Step 1: Route setup + redirect logic              (30 min)
Step 2: Hero section                               (1 hr)
Step 3: Feature overview grid                      (1 hr)
Step 4: "How it works" section                     (45 min)
Step 5: Live stats API + counter section           (1.5 hrs)
Step 6: Transparency links section                 (30 min)
Step 7: Footer                                     (30 min)
Step 8: i18n strings                               (45 min)
Step 9: Mobile responsiveness pass                 (30 min)
Step 10: OG meta tags for the landing page         (15 min)
```

---

## Step 1: Route Setup

**Current behavior:** Unauthenticated users hit `/[locale]/login`.

**New behavior:** Unauthenticated users see the landing page. Login is accessible via CTA button.

**Option A — Dedicated route (recommended):**

**Create:** `src/app/[locale]/page.tsx` (root page for each locale)

```typescript
// If user is authenticated → redirect to dashboard
// If not → render LandingPage component
```

**Create:** `src/components/landing/landing-page.tsx` (main container)

**Option B — Redirect in middleware:**

**Edit:** `src/middleware.ts` — redirect unauthenticated root requests to `/landing` instead of `/login`.

---

## Step 2: Hero Section

**Create:** `src/components/landing/hero-section.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     🌿 Organic Protocol                     │
│                                                             │
│            Coordinate. Contribute. Get Rewarded.            │
│                                                             │
│     A coordination layer for communities to collaborate     │
│     and distribute rewards based on work merit.             │
│                                                             │
│     ┌──────────────┐    ┌──────────────┐                    │
│     │  Join the DAO │    │   Explore   │                    │
│     └──────────────┘    └──────────────┘                    │
│              (primary)        (secondary/ghost)             │
│                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                             │
│     "Trusted by X members | Y tasks completed | Z SOL       │
│      distributed"  (social proof strip)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Background: Dark gradient with subtle organic/leaf pattern or particles
- "Join the DAO" → navigates to `/login` or `/signup`
- "Explore" → scrolls to feature section or links to public treasury/ideas

---

## Step 3: Feature Overview Grid

**Create:** `src/components/landing/features-section.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  What You Can Do on Organic                 │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  📋 Tasks   │  │ 🗳 Proposals │  │  🏆 Rewards │        │
│  │             │  │              │  │             │        │
│  │ Pick tasks, │  │ Propose and  │  │ Earn XP and │        │
│  │ submit work,│  │ vote on DAO  │  │ claim token │        │
│  │ get reviewed│  │ decisions    │  │ rewards     │        │
│  └─────────────┘  └──────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 💡 Ideas    │  │ ⭐ Reputation│  │ 💰 Treasury │        │
│  │             │  │              │  │             │        │
│  │ Post ideas, │  │ Build your   │  │ Transparent │        │
│  │ community   │  │ on-chain     │  │ community   │        │
│  │ votes on top│  │ track record │  │ funds mgmt  │        │
│  └─────────────┘  └──────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- 6 cards in a 3x2 grid (2x3 on mobile)
- Use Lucide icons consistent with app navigation
- Each card: icon, title, one-liner description
- Subtle hover animation (lift + shadow)

---

## Step 4: "How It Works" Section

**Create:** `src/components/landing/how-it-works-section.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     How It Works                            │
│                                                             │
│    ①                    ②                    ③              │
│  ┌──────┐            ┌──────┐            ┌──────┐          │
│  │Wallet│  ───────>  │Token │  ───────>  │Start │          │
│  │      │            │      │            │      │          │
│  └──────┘            └──────┘            └──────┘          │
│  Connect your        Verify you hold     Pick a task,      │
│  Solana wallet       the community       join a sprint,    │
│                      token               start earning     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- 3 steps with numbered circles and connecting arrows/lines
- Clean icons for each step
- Mobile: vertical layout with vertical line connecting steps

---

## Step 5: Live Stats Section

### API Endpoint

**Create:** `src/app/api/public/stats/route.ts`

```typescript
// No auth required — public endpoint
// Queries:
//   - COUNT(*) FROM user_profiles WHERE role != 'banned'  → total_members
//   - COUNT(*) FROM tasks WHERE status = 'done'           → tasks_completed
//   - COUNT(*) FROM proposals WHERE status = 'passed'     → proposals_passed
//   - SUM(amount) FROM reward_claims WHERE status = 'claimed' → total_distributed
// Cache response for 5 minutes (Cache-Control header)
```

**Response:**
```json
{
  "total_members": 142,
  "tasks_completed": 1847,
  "proposals_passed": 23,
  "total_distributed": "125,000 BONK"
}
```

### UI Component

**Create:** `src/components/landing/stats-section.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     142              1,847            23           125K     │
│   Members       Tasks Completed   Proposals     Rewards    │
│   Active        & Reviewed        Passed        Distributed│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Animated count-up on scroll (use Intersection Observer)
- Large numbers, small labels below
- Green accent color for numbers

---

## Step 6: Transparency Links

**Create:** `src/components/landing/transparency-section.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Built on Transparency                          │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ View Treasury │  │ Browse Ideas  │  │ See Members   │   │
│  │       →       │  │       →       │  │       →       │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  (Links to /treasury/public, /ideas, /leaderboard)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- These pages need to be accessible without auth (or have a public view mode)
- Cards with arrow icon, clean borders

---

## Step 7: Footer

**Create:** `src/components/landing/footer.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Organic Protocol                                           │
│                                                             │
│  Product          Community        Developers               │
│  ─────────        ─────────        ──────────               │
│  Features         Twitter/X        GitHub                    │
│  Treasury         Discord          API Docs                  │
│  Ideas            Telegram         Contribute                │
│                                                             │
│  ───────────────────────────────────────────────────────     │
│  © 2026 Organic Protocol. Built by the community.           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 8: i18n Strings

**Edit:** `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`

Add `landing` namespace:

```json
{
  "landing": {
    "hero_title": "Coordinate. Contribute. Get Rewarded.",
    "hero_subtitle": "A coordination layer for communities to collaborate and distribute rewards based on work merit.",
    "cta_join": "Join the DAO",
    "cta_explore": "Explore",
    "features_title": "What You Can Do on Organic",
    "feature_tasks": "Pick tasks, submit work, get reviewed",
    "feature_proposals": "Propose and vote on DAO decisions",
    "feature_rewards": "Earn XP and claim token rewards",
    "feature_ideas": "Post ideas, community votes on top",
    "feature_reputation": "Build your on-chain track record",
    "feature_treasury": "Transparent community funds management",
    "how_title": "How It Works",
    "step_1": "Connect your Solana wallet",
    "step_2": "Verify you hold the community token",
    "step_3": "Pick a task, join a sprint, start earning",
    "stats_members": "Members Active",
    "stats_tasks": "Tasks Completed",
    "stats_proposals": "Proposals Passed",
    "stats_rewards": "Rewards Distributed",
    "transparency_title": "Built on Transparency",
    "transparency_treasury": "View Treasury",
    "transparency_ideas": "Browse Ideas",
    "transparency_members": "See Members"
  }
}
```

---

## Step 10: OG Meta Tags

**Edit:** Landing page `metadata` export:

```typescript
export const metadata: Metadata = {
  title: 'Organic Protocol — Coordinate. Contribute. Get Rewarded.',
  description: 'A coordination layer for communities to collaborate and distribute rewards based on work merit.',
  openGraph: {
    title: 'Organic Protocol',
    description: 'Community coordination & merit-based rewards platform on Solana',
    type: 'website',
    images: ['/og/landing.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organic Protocol',
    description: 'Community coordination & merit-based rewards platform on Solana',
    images: ['/og/landing.png'],
  },
};
```

**Create:** `public/og/landing.png` — 1200x630 branded OG image

---

## File Map Summary

| Action | Path |
|---|---|
| Create | `src/app/[locale]/page.tsx` (root landing route) |
| Create | `src/components/landing/landing-page.tsx` |
| Create | `src/components/landing/hero-section.tsx` |
| Create | `src/components/landing/features-section.tsx` |
| Create | `src/components/landing/how-it-works-section.tsx` |
| Create | `src/components/landing/stats-section.tsx` |
| Create | `src/components/landing/transparency-section.tsx` |
| Create | `src/components/landing/footer.tsx` |
| Create | `src/app/api/public/stats/route.ts` |
| Edit | `messages/en.json` (add `landing` namespace) |
| Edit | `messages/pt-PT.json` (add `landing` namespace) |
| Edit | `messages/zh-CN.json` (add `landing` namespace) |
| Edit | `src/middleware.ts` (unauthenticated root → landing) |
| Create | `public/og/landing.png` |

---

## Notes

- The landing page should NOT use the authenticated app shell (no sidebar nav, no header with user menu)
- It should have its own minimal layout: just the page content with the footer
- Mobile first: all sections stack vertically, hero takes full viewport height
- Performance: no heavy JS on the landing page, aim for 90+ Lighthouse score
- The "Explore" CTA and transparency links require some pages to have public/unauthenticated views
