# Spec: Shareable Profiles + OG Cards

> Track 2.4 | Priority: Pre-Launch
> Last updated: 2026-03-07

---

## Goal

Let members flex their contributions. Public profile pages with social preview cards, contribution heatmaps, shareable image cards, and rich Open Graph meta tags for Twitter/Discord.

**Privacy model:** Public by default — all profiles are visible without login.

**Visible data:** Reputation stats, contribution counts, achievements, DAO participation history, contribution heatmap.

---

## Implementation Sequence

```
Step 1: Public profile route + data API            (1.5 hrs)
Step 2: Profile header + reputation stats          (1 hr)
Step 3: Contribution counts section                (45 min)
Step 4: Achievements grid                          (45 min)
Step 5: DAO participation history                  (45 min)
Step 6: Contribution heatmap                       (2 hrs)
Step 7: OG meta tags (dynamic)                     (30 min)
Step 8: Dynamic OG image generation                (1.5 hrs)
Step 9: Shareable image card + share button        (1.5 hrs)
Step 10: Mobile responsiveness + i18n              (45 min)
```

---

## Step 1: Public Profile Route + Data API

### API Endpoint

**Create:** `src/app/api/public/profile/[id]/route.ts`

```typescript
// No auth required — public endpoint
// GET /api/public/profile/:id
// Returns:
{
  id: string;
  name: string | null;
  organic_id: number | null;
  avatar_url: string | null;
  wallet_address: string;      // truncated: "7xKX...3mPq"
  member_since: string;        // created_at
  level: number;
  xp: number;
  rank: number | null;         // position in leaderboard
  streak_days: number;
  tasks_completed: number;
  proposals_authored: number;
  votes_cast: number;
  ideas_posted: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earned_at: string;
  }>;
  roles: string[];              // ['member', 'reviewer', etc.]
  sprints_participated: number;
  ideas_promoted: number;
}
```

**RLS:** Create a public read policy on `user_profiles` for specific columns (exclude email, sensitive fields).

```sql
-- Public profile read (limited columns via API, not direct table access)
-- The API route handles column selection, so RLS just needs to allow reads
CREATE POLICY "Public profile read"
  ON user_profiles
  FOR SELECT
  USING (true);  -- Or use a is_public column if opt-out is needed later
```

### Route

**Create:** `src/app/[locale]/member/[id]/page.tsx`

- Server component that fetches public profile data
- Renders the profile sections
- No auth required — accessible to anyone with the URL

---

## Step 2: Profile Header + Reputation Stats

**Create:** `src/components/profiles/public-profile-header.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────┐                                                    │
│  │      │  Alice Johnson                                     │
│  │Avatar│  Organic ID: #0042                                 │
│  │      │  7xKX...3mPq                                       │
│  └──────┘  Member since Jan 2026                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Level 7  │  │  12,450  │  │  Rank #3 │  │ 45-day  │     │
│  │          │  │   XP     │  │          │  │ Streak  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Large avatar (96px)
- Name, Organic ID badge, truncated wallet address (click to copy)
- "Member since" date
- 4 stat cards: Level, XP, Rank, Streak

---

## Step 3: Contribution Counts

**Create:** `src/components/profiles/contribution-stats.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Contributions                                               │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                      │
│  │      87        │  │      12        │                      │
│  │ Tasks Completed│  │ Proposals      │                      │
│  │                │  │ Authored       │                      │
│  └────────────────┘  └────────────────┘                      │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                      │
│  │     234        │  │      31        │                      │
│  │ Votes Cast     │  │ Ideas Posted   │                      │
│  └────────────────┘  └────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- 2x2 grid of count cards
- Large number, descriptive label below
- Subtle green accent on numbers

---

## Step 4: Achievements Grid

**Create:** `src/components/profiles/achievements-grid.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Achievements                                  View all →    │
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │  🏆    │  │  🔥    │  │  ⭐    │  │  🎯    │            │
│  │ First  │  │ 30-Day │  │ Level  │  │ Task   │            │
│  │ Task   │  │ Streak │  │  5     │  │ Master │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐                         │
│  │  🗳    │  │  💡    │  │  🤝    │                         │
│  │ Voter  │  │ Idea   │  │ Team   │                         │
│  │ 100    │  │ Winner │  │ Player │                         │
│  └────────┘  └────────┘  └────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Grid of badge cards (max 9 shown, "View all" if more)
- Each: icon/emoji, achievement name
- Hover tooltip shows description + earned date
- Grayscale for locked achievements (optional)

---

## Step 5: DAO Participation History

**Create:** `src/components/profiles/dao-participation.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  DAO Participation                                           │
│                                                              │
│  Roles         member, reviewer, sprint-lead                 │
│  Sprints       12 participated (8 completed)                 │
│  Ideas         3 promoted to proposals                       │
│  Disputes      2 resolved (1 as arbitrator)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Simple key-value list with badges/chips for roles
- Compact section, no cards needed

---

## Step 6: Contribution Heatmap

### API Endpoint

**Create:** `src/app/api/public/profile/[id]/heatmap/route.ts`

```typescript
// No auth required
// GET /api/public/profile/:id/heatmap
// Query: ?days=365 (default 365)
//
// Returns daily activity counts for the last N days
// Sources: task completions, votes cast, proposals created,
//          ideas posted, comments, submissions
//
// Response:
{
  days: Array<{
    date: string;       // "2026-03-07"
    count: number;      // total activities that day
  }>;
  max_count: number;    // for color scale normalization
}
```

**SQL approach:**
```sql
-- Aggregate from activity_log table
SELECT
  DATE(created_at) as date,
  COUNT(*) as count
FROM activity_log
WHERE actor_id = :user_id
  AND created_at >= NOW() - INTERVAL '365 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### UI Component

**Create:** `src/components/profiles/contribution-heatmap.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Contribution Activity                                       │
│                                                              │
│  Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan Feb Mar         │
│  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐     │
│  │░│░│▓│█│▓│░│ │ │░│▓│█│▓│░│ │░│▓│▓│░│ │░│▓│█│█│▓│     │
│  │ │▓│▓│▓│░│ │ │░│▓│▓│▓│░│ │░│▓│▓│░│ │░│▓│▓│▓│▓│░│     │
│  │░│▓│█│▓│░│ │░│▓│█│▓│░│ │░│▓│█│░│ │ │▓│█│▓│░│ │ │     │
│  │ │░│▓│░│ │ │░│▓│▓│░│ │ │░│▓│░│ │ │░│▓│▓│░│ │ │ │     │
│  │ │ │░│ │ │ │ │░│░│ │ │ │ │░│ │ │ │ │░│░│ │ │ │ │     │
│  │░│▓│▓│▓│░│ │░│▓│▓│░│ │░│▓│▓│░│ │░│▓│▓│░│ │░│ │ │     │
│  │ │░│▓│░│ │ │ │░│▓│ │ │ │ │░│ │ │ │░│▓│ │ │ │ │ │     │
│  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘     │
│                                                              │
│  Less ░ ▒ ▓ █ More              142 contributions in 2026   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Calendar grid like GitHub's contribution graph
- 7 rows (days of week) × 52 columns (weeks)
- Color intensity: 5 levels from empty (no activity) to dark green (high activity)
- Tooltip on hover: "3 contributions on March 7, 2026"
- Legend at bottom: color scale + total count
- Month labels at top
- **Mobile:** horizontal scroll container or condensed to last 6 months

**Implementation notes:**
- Use pure CSS grid or SVG for the heatmap (no heavy chart library needed)
- Each cell is a small square (12-14px) with rounded corners
- Colors: `bg-neutral-800` (0), `bg-green-900` (1), `bg-green-700` (2-3), `bg-green-500` (4-6), `bg-green-400` (7+)

---

## Step 7: OG Meta Tags

**Edit:** `src/app/[locale]/member/[id]/page.tsx`

```typescript
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const profile = await fetchPublicProfile(params.id);

  return {
    title: `${profile.name || 'Member'} — Level ${profile.level} | Organic Protocol`,
    description: `${profile.tasks_completed} tasks completed, ${profile.proposals_authored} proposals, ${profile.xp.toLocaleString()} XP earned on Organic Protocol.`,
    openGraph: {
      title: `${profile.name || 'Member'} — Level ${profile.level}`,
      description: `${profile.tasks_completed} tasks, ${profile.votes_cast} votes, ${profile.xp.toLocaleString()} XP`,
      type: 'profile',
      images: [`/api/og/profile/${params.id}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.name || 'Member'} on Organic Protocol`,
      description: `Level ${profile.level} · ${profile.tasks_completed} tasks · ${profile.xp.toLocaleString()} XP`,
      images: [`/api/og/profile/${params.id}`],
    },
  };
}
```

---

## Step 8: Dynamic OG Image Generation

**Install:** `npm install @vercel/og` (or use `satori` + `sharp` directly)

**Create:** `src/app/api/og/profile/[id]/route.tsx`

```typescript
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request, { params }) {
  const profile = await fetchPublicProfile(params.id);

  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        padding: '60px',
        fontFamily: 'Inter',
      }}>
        {/* Left: Avatar + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <img src={profile.avatar_url} width="120" height="120" style={{ borderRadius: '60px' }} />
          <div style={{ color: '#fff', fontSize: '36px', fontWeight: 700 }}>
            {profile.name || 'Member'}
          </div>
          <div style={{ color: '#22c55e', fontSize: '24px' }}>
            Level {profile.level} · #{profile.organic_id}
          </div>
        </div>

        {/* Right: Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '80px', gap: '24px' }}>
          <StatBox label="XP" value={profile.xp.toLocaleString()} />
          <StatBox label="Tasks" value={profile.tasks_completed} />
          <StatBox label="Votes" value={profile.votes_cast} />
        </div>

        {/* Bottom: Branding */}
        <div style={{ position: 'absolute', bottom: '40px', right: '60px', color: '#666', fontSize: '20px' }}>
          🌿 Organic Protocol
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

**Cache:** Set `Cache-Control: public, max-age=3600, s-maxage=86400` (1 hour client, 1 day CDN).

OG image design:
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────┐   Alice Johnson              ┌──────────────────┐ │
│  │      │   Level 7 · #0042            │  12,450 XP       │ │
│  │Avatar│   Member since Jan 2026      │  87 Tasks        │ │
│  │      │                              │  234 Votes       │ │
│  └──────┘                              │  12 Proposals    │ │
│                                        └──────────────────┘ │
│                                                              │
│  🏆 First Task  🔥 30-Day Streak  ⭐ Level 5                │
│                                                              │
│                              🌿 Organic Protocol             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 9: Shareable Image Card + Share Button

### Downloadable Card Image

**Create:** `src/app/api/og/profile/[id]/card/route.tsx`

Same as OG image but:
- Resolution: 1080x1080 (square, good for Twitter/Discord)
- Includes QR code linking to `https://app.organic-protocol.xyz/member/:id`
- Uses `qrcode` npm package to generate QR in SVG, embed in the image

```
┌───────────────────────────────┐
│                               │
│    ┌──────┐                   │
│    │      │  Alice Johnson    │
│    │Avatar│  Level 7          │
│    │      │  #0042            │
│    └──────┘                   │
│                               │
│    12,450 XP · 87 Tasks       │
│    234 Votes · 12 Proposals   │
│                               │
│    🏆 🔥 ⭐ 🎯 🗳 💡          │
│                               │
│    ┌─────┐                    │
│    │ QR  │  Scan to view      │
│    │Code │  full profile      │
│    └─────┘                    │
│                               │
│    🌿 Organic Protocol        │
└───────────────────────────────┘
```

### Share Button Component

**Create:** `src/components/profiles/share-profile-button.tsx`

```typescript
// Dropdown with options:
// 1. "Copy link" — copies profile URL to clipboard
// 2. "Download card" — fetches /api/og/profile/:id/card, triggers download
// 3. "Share on X" — opens Twitter intent URL with pre-filled text

// Twitter intent:
// https://twitter.com/intent/tweet?text=Check+out+my+profile+on+Organic+Protocol!&url=https://...
```

**UI placement:** Top-right of the public profile page header, next to the name.

```
┌──────────────────────────────────────────┐
│  Alice Johnson                [Share ▾]  │
│  Level 7 · #0042              ┌────────┐ │
│                                │ Copy   │ │
│                                │ Download│ │
│                                │ Tweet  │ │
│                                └────────┘ │
└──────────────────────────────────────────┘
```

---

## Step 10: Mobile + i18n

### Mobile Responsiveness

- Profile header: stack avatar above name on small screens
- Stat cards: 2x2 grid → 2 columns on mobile
- Heatmap: horizontal scroll container, show last 6 months by default
- Achievements: 3 columns on mobile instead of 4
- Share button: full-width at bottom on mobile

### i18n Strings

**Edit:** `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`:

```json
{
  "public_profile": {
    "member_since": "Member since {date}",
    "level": "Level {level}",
    "xp": "XP",
    "rank": "Rank",
    "streak": "Day Streak",
    "contributions": "Contributions",
    "tasks_completed": "Tasks Completed",
    "proposals_authored": "Proposals Authored",
    "votes_cast": "Votes Cast",
    "ideas_posted": "Ideas Posted",
    "achievements": "Achievements",
    "view_all": "View all",
    "dao_participation": "DAO Participation",
    "roles": "Roles",
    "sprints": "Sprints Participated",
    "ideas_promoted": "Ideas Promoted",
    "contribution_activity": "Contribution Activity",
    "contributions_in_year": "{count} contributions in {year}",
    "less": "Less",
    "more": "More",
    "share": "Share",
    "copy_link": "Copy link",
    "download_card": "Download card",
    "share_on_x": "Share on X",
    "link_copied": "Profile link copied!",
    "no_contributions_tooltip": "No contributions on {date}",
    "contributions_tooltip": "{count} contributions on {date}"
  }
}
```

---

## File Map Summary

| Action | Path |
|---|---|
| Create | `src/app/[locale]/member/[id]/page.tsx` |
| Create | `src/app/api/public/profile/[id]/route.ts` |
| Create | `src/app/api/public/profile/[id]/heatmap/route.ts` |
| Create | `src/app/api/og/profile/[id]/route.tsx` |
| Create | `src/app/api/og/profile/[id]/card/route.tsx` |
| Create | `src/components/profiles/public-profile-header.tsx` |
| Create | `src/components/profiles/contribution-stats.tsx` |
| Create | `src/components/profiles/achievements-grid.tsx` |
| Create | `src/components/profiles/dao-participation.tsx` |
| Create | `src/components/profiles/contribution-heatmap.tsx` |
| Create | `src/components/profiles/share-profile-button.tsx` |
| Edit | `messages/en.json` (add `public_profile` namespace) |
| Edit | `messages/pt-PT.json` (add `public_profile` namespace) |
| Edit | `messages/zh-CN.json` (add `public_profile` namespace) |

---

## Dependencies

- `@vercel/og` (for OG image generation on Vercel edge)
- `qrcode` (for QR code in shareable card)

---

## Notes

- The public profile page should NOT use the authenticated app shell (sidebar, header)
- Use a minimal layout similar to the landing page
- OG images are cached at the CDN level — they regenerate when cache expires
- For opt-out: later add `is_profile_public` boolean to `user_profiles` (default true)
- Test social previews on: Twitter, Discord, Telegram, LinkedIn, iMessage
