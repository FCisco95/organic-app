# Spec: Unified Activity Feed

> Track 2.3 | Priority: Pre-Launch
> Last updated: 2026-03-07

---

## Goal

Create a real-time pulse of DAO activity that keeps members engaged. Dashboard widget for quick glance + dedicated `/activity` page for deep browsing. Two tabs: "All Activity" and "My Activity".

---

## Current State

The platform already has:
- `activity_log` table in the database (migration `20260201000000_create_activity_log.sql`)
- `src/features/activity/types.ts` with `ActivityEvent` type and `ActivityEventType` union
- `src/app/api/activity/route.ts` with basic GET endpoint (cursor pagination, limit)
- Event types: task, submission, comment, proposal, vote, dispute events

**What's missing:**
- No dedicated `/activity` page in the UI
- No dashboard widget
- No "My Activity" filtering (scope=mine)
- Missing event types: `member_joined`, `reward_claimed`, `achievement_earned`, `level_up`, `idea_posted`, `idea_promoted`, `sprint_started`, `sprint_ended`
- No activity emitters in most API routes (events aren't being logged yet for all actions)
- No UI components for rendering activity events

---

## Implementation Sequence

```
Step 1: Extend activity_log schema + event types     (1 hr)
Step 2: Activity emitter utility                      (1 hr)
Step 3: Integrate emitters into API routes            (2-3 hrs)
Step 4: Enhance activity API (scope, type filter)     (45 min)
Step 5: Activity event card component                 (1.5 hrs)
Step 6: Dashboard widget                              (1 hr)
Step 7: Full activity page                            (1.5 hrs)
Step 8: Navigation + i18n                             (30 min)
```

---

## Step 1: Extend Schema + Types

### Migration

**Create:** `supabase/migrations/YYYYMMDDHHMMSS_activity_feed_enhancements.sql`

```sql
-- Add missing event types (if event_type is an enum, extend it; if text, no change needed)
-- Check if activity_log.event_type is text or enum first

-- Add index for "my activity" queries
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_created
  ON activity_log(actor_id, created_at DESC);

-- Add index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_activity_log_type_created
  ON activity_log(event_type, created_at DESC);

-- Ensure RLS allows all authenticated members to read
-- (verify existing policy covers this)
```

### Types Update

**Edit:** `src/features/activity/types.ts`

```typescript
export type ActivityEventType =
  // Tasks
  | 'task_created'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_deleted'
  // Submissions
  | 'submission_created'
  | 'submission_reviewed'
  // Comments
  | 'comment_created'
  | 'comment_deleted'
  // Proposals
  | 'proposal_created'
  | 'proposal_status_changed'
  | 'proposal_deleted'
  // Voting
  | 'vote_cast'
  | 'voting_reminder_24h'
  | 'voting_reminder_1h'
  // Disputes
  | 'dispute_created'
  | 'dispute_response_submitted'
  | 'dispute_escalated'
  | 'dispute_resolved'
  | 'dispute_withdrawn'
  // NEW — Ideas
  | 'idea_posted'
  | 'idea_voted'
  | 'idea_promoted'
  // NEW — Members
  | 'member_joined'
  // NEW — Rewards & Reputation
  | 'reward_claimed'
  | 'achievement_earned'
  | 'level_up'
  // NEW — Sprints
  | 'sprint_started'
  | 'sprint_ended';
```

---

## Step 2: Activity Emitter Utility

**Create:** `src/features/activity/emitter.ts`

```typescript
import { createServiceClient } from '@/lib/supabase/service';
import type { ActivityEventType } from './types';

interface EmitActivityParams {
  event_type: ActivityEventType;
  actor_id: string | null;
  subject_type: string;       // 'task' | 'proposal' | 'idea' | 'sprint' | 'user' | 'reward'
  subject_id: string;
  metadata?: Record<string, unknown>;  // title, description, amounts — enough to render without joins
}

export async function emitActivity(params: EmitActivityParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('activity_log').insert({
      event_type: params.event_type,
      actor_id: params.actor_id,
      subject_type: params.subject_type,
      subject_id: params.subject_id,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    // Fire-and-forget: log but don't throw
    console.error('[activity-emitter] Failed to emit:', error);
  }
}
```

- Fire-and-forget pattern: never blocks the main request
- Uses service client to bypass RLS for writes

---

## Step 3: Integrate Emitters

Add `emitActivity()` calls to these existing API routes:

| Route | Event Type | Metadata |
|---|---|---|
| `POST /api/tasks` | `task_created` | `{ title, type, priority }` |
| `PATCH /api/tasks/:id` (status→done) | `task_completed` | `{ title }` |
| `POST /api/submissions` | `submission_created` | `{ task_title, task_id }` |
| `POST /api/submissions/:id/review` | `submission_reviewed` | `{ task_title, status }` |
| `POST /api/proposals` | `proposal_created` | `{ title }` |
| `POST /api/voting` | `vote_cast` | `{ proposal_title, vote }` |
| `POST /api/ideas` | `idea_posted` | `{ title }` |
| `POST /api/ideas/:id/vote` | `idea_voted` | `{ idea_title, vote }` |
| `POST /api/ideas/:id/promote` | `idea_promoted` | `{ idea_title, proposal_id }` |
| `POST /api/sprints/:id/start` | `sprint_started` | `{ sprint_name }` |
| `POST /api/sprints/:id/complete` | `sprint_ended` | `{ sprint_name }` |
| `POST /api/disputes` | `dispute_created` | `{ task_title }` |
| `POST /api/rewards/claim` | `reward_claimed` | `{ amount, epoch }` |
| Member creation flow | `member_joined` | `{ name, organic_id }` |
| XP/level engine | `level_up` | `{ new_level, xp }` |
| Achievement unlock | `achievement_earned` | `{ achievement_name, badge }` |

---

## Step 4: Enhance Activity API

**Edit:** `src/app/api/activity/route.ts`

Add query params:
- `scope=all|mine` — "mine" filters to `actor_id = current_user OR subject involves current user`
- `type=task|proposal|idea|...` — filter by subject_type
- Keep existing `limit` and `before` cursor params

```typescript
// For scope=mine:
// WHERE actor_id = auth.uid()
//    OR (subject_type = 'task' AND subject_id IN (user's assigned tasks))
//    OR (subject_type = 'proposal' AND subject_id IN (user's voted proposals))
// Simplified approach: just filter by actor_id for now, expand later
```

---

## Step 5: Activity Event Card Component

**Create:** `src/components/activity/activity-event-card.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  [Avatar]  Alice completed task "Fix sidebar layout"    │
│            2 hours ago                                   │
├─────────────────────────────────────────────────────────┤
│  [Avatar]  Bob voted YES on "Treasury Budget Q1"        │
│            3 hours ago                                   │
├─────────────────────────────────────────────────────────┤
│  [🎉]      Carol reached Level 5!                       │
│            5 hours ago                                   │
├─────────────────────────────────────────────────────────┤
│  [Avatar]  Dave posted idea "Mobile notifications"      │
│            1 day ago                                     │
└─────────────────────────────────────────────────────────┘
```

Each card:
- Left: Actor avatar (or event icon for system events like level_up)
- Middle: Action description with linked subject name (clickable → goes to task/proposal/idea)
- Right: Relative timestamp
- Color-coded left border or icon per event type category:
  - Green: completions, approvals, rewards
  - Blue: creations, submissions
  - Purple: votes, proposals
  - Yellow: ideas
  - Red: disputes

**Create:** `src/components/activity/activity-event-list.tsx` — renders list of cards with infinite scroll

**Create:** `src/features/activity/hooks.ts` — extend with `useActivityFeed(scope, type)` hook using React Query

---

## Step 6: Dashboard Widget

**Create:** `src/components/dashboard/activity-widget.tsx`

```
┌──────────────────────────────────┐
│  Recent Activity      View all → │
│  ────────────────────────────────│
│  [Av] Alice completed "Fix..."   │
│       2h ago                     │
│  [Av] Bob voted on "Budget..."   │
│       3h ago                     │
│  [🎉] Carol reached Level 5     │
│       5h ago                     │
│  [Av] Dave posted "Mobile..."    │
│       1d ago                     │
│  [Av] Eve joined the DAO        │
│       1d ago                     │
└──────────────────────────────────┘
```

- Shows last 5-8 events
- "View all →" links to `/activity`
- Compact card variant (smaller avatars, single line per event)
- Auto-refreshes every 60 seconds (React Query `refetchInterval`)

**Edit:** Dashboard page to include the widget. Location depends on current dashboard layout — add as a card in the grid or sidebar section.

---

## Step 7: Full Activity Page

**Create:** `src/app/[locale]/activity/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Activity                                                    │
│                                                              │
│  ┌────────────┐ ┌────────────┐                               │
│  │All Activity│ │My Activity │   [Filter: All types ▾]       │
│  └────────────┘ └────────────┘                               │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Today                                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  [Av]  Alice completed task "Fix sidebar layout"    │     │
│  │        2 hours ago                                   │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  [Av]  Bob voted YES on "Treasury Budget Q1"        │     │
│  │        3 hours ago                                   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Yesterday                                                   │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  [🎉]  Carol reached Level 5!                       │     │
│  │        5 hours ago                                   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ● Loading more...                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Two tabs: "All Activity" / "My Activity"
- Optional type filter dropdown: All, Tasks, Proposals, Ideas, Members, Rewards
- Group events by date (Today, Yesterday, March 5, etc.)
- Infinite scroll with cursor pagination
- Empty state for "My Activity" tab if user is new

---

## Step 8: Navigation + i18n

**Edit:** `src/components/navigation.tsx` — add "Activity" nav item with pulse/activity icon

**Edit:** `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`:

```json
{
  "activity": {
    "title": "Activity",
    "all_activity": "All Activity",
    "my_activity": "My Activity",
    "filter_all": "All types",
    "filter_tasks": "Tasks",
    "filter_proposals": "Proposals",
    "filter_ideas": "Ideas",
    "filter_members": "Members",
    "filter_rewards": "Rewards",
    "today": "Today",
    "yesterday": "Yesterday",
    "view_all": "View all",
    "empty": "No activity yet",
    "empty_mine": "Your activity will show up here",
    "loading_more": "Loading more..."
  }
}
```

---

## File Map Summary

| Action | Path |
|---|---|
| Create | `supabase/migrations/YYYYMMDDHHMMSS_activity_feed_enhancements.sql` |
| Edit | `src/features/activity/types.ts` (extend event types) |
| Create | `src/features/activity/emitter.ts` |
| Edit | `src/features/activity/hooks.ts` (add `useActivityFeed`) |
| Edit | `src/app/api/activity/route.ts` (add scope, type params) |
| Edit | ~15 API routes to add emitter calls |
| Create | `src/components/activity/activity-event-card.tsx` |
| Create | `src/components/activity/activity-event-list.tsx` |
| Create | `src/components/dashboard/activity-widget.tsx` |
| Create | `src/app/[locale]/activity/page.tsx` |
| Edit | `src/components/navigation.tsx` (add Activity nav) |
| Edit | Dashboard page (add widget) |
| Edit | `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json` |

---

## Notes

- Activity emitters are fire-and-forget — they should never block the main request or cause it to fail
- Start with `scope=mine` as simple `actor_id = current_user` filter; expand to include "events involving me" later
- The activity_log table already exists — verify its schema matches before adding indexes
- Consider adding a TTL/cleanup job for old activity (> 90 days) to keep the table performant
- Real-time updates (Supabase realtime subscription) can be added later for live feed without polling
