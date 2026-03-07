# Unified Activity Feed — Detailed Implementation Spec

> Priority: Pre-launch
> Location: Dashboard widget + dedicated `/activity` page
> Feed model: Two tabs — "All Activity" / "My Activity"

---

## Existing Infrastructure

The codebase already has:
- `activity_log` table in Supabase (migration `20260201000000_create_activity_log.sql`)
- `GET /api/activity` route with cursor pagination (`src/app/api/activity/route.ts`)
- `ActivityEvent` and `ActivityEventType` types (`src/features/activity/types.ts`)
- Feature module at `src/features/activity/` with `hooks.ts`, `index.ts`, `schemas.ts`, `types.ts`

**What's missing:** UI components, dashboard widget, dedicated page, "My Activity" scope, activity event type filtering, and more event types.

---

## Implementation Sequence

```
Step 1 → Extend activity types with new event types
Step 2 → Add "scope" and "type" filter params to existing API route
Step 3 → Build activity event card component
Step 4 → Build full activity page with tabs and filters
Step 5 → Build dashboard widget
Step 6 → Add navigation entry
Step 7 → Ensure all key actions emit activity events (audit existing emitters)
Step 8 → i18n for event labels
```

---

## UI Wireframes

### Dashboard Widget

```
┌─────────────────────────────────────┐
│ Recent Activity              View → │
├─────────────────────────────────────┤
│ 🟢 Alice completed "Fix navbar"    │
│    2 min ago                        │
│                                     │
│ 🗳 Bob voted YES on "Hire dev"     │
│    15 min ago                       │
│                                     │
│ 💡 Carol posted idea "Mobile app"  │
│    1 hour ago                       │
│                                     │
│ ✅ Dave submitted task "Logo v2"   │
│    2 hours ago                      │
│                                     │
│ 👋 Eve joined the community       │
│    3 hours ago                      │
│                                     │
└─────────────────────────────────────┘
```

### Full Activity Page (Desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ Activity                                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [All Activity] [My Activity]                                │
│                                                              │
│  Filter: [All ▾]  [Tasks] [Proposals] [Ideas] [Members]     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🟢  Alice completed task "Fix navbar bug"                   │
│      in Sprint 12 · 2 minutes ago                           │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│  🗳  Bob voted YES on proposal "Hire community dev"          │
│      12 of 15 votes cast · 15 minutes ago                   │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│  💡  Carol posted idea "Mobile app for task tracking"        │
│      Score: +8 · 3 comments · 1 hour ago                    │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│  ⭐  Dave reached Level 5                                    │
│      1,250 XP total · 2 hours ago                           │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│  👋  Eve joined the community                                │
│      Member #128 · 3 hours ago                              │
│                                                              │
│                   [ Load more ]                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌───────────────────────┐
│ Activity              │
├───────────────────────┤
│ [All] [My Activity]   │
│ Filter: [All ▾]       │
├───────────────────────┤
│ 🟢 Alice completed    │
│   "Fix navbar bug"    │
│   2 min ago           │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ 🗳 Bob voted YES on  │
│   "Hire community dev"│
│   15 min ago          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ 💡 Carol posted idea  │
│   "Mobile app"        │
│   1 hour ago          │
│                       │
│    [ Load more ]      │
└───────────────────────┘
```

---

## Extended Event Types

**File:** `src/features/activity/types.ts`

Add these event types to `ActivityEventType`:

```typescript
export type ActivityEventType =
  // Existing
  | 'task_created'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_deleted'
  | 'submission_created'
  | 'submission_reviewed'
  | 'comment_created'
  | 'comment_deleted'
  | 'proposal_created'
  | 'proposal_status_changed'
  | 'proposal_deleted'
  | 'vote_cast'
  | 'voting_reminder_24h'
  | 'voting_reminder_1h'
  | 'dispute_created'
  | 'dispute_response_submitted'
  | 'dispute_escalated'
  | 'dispute_resolved'
  | 'dispute_withdrawn'
  // New
  | 'member_joined'
  | 'idea_posted'
  | 'idea_voted'
  | 'idea_promoted'
  | 'reward_claimed'
  | 'achievement_earned'
  | 'level_up'
  | 'sprint_started'
  | 'sprint_ended'
  | 'proposal_passed'
  | 'proposal_rejected';
```

Add filter category type:

```typescript
export type ActivityCategory = 'all' | 'tasks' | 'proposals' | 'ideas' | 'members' | 'rewards' | 'sprints';

export const ACTIVITY_CATEGORY_EVENT_MAP: Record<ActivityCategory, ActivityEventType[]> = {
  all: [], // empty = no filter
  tasks: ['task_created', 'task_completed', 'task_status_changed', 'submission_created', 'submission_reviewed'],
  proposals: ['proposal_created', 'proposal_status_changed', 'vote_cast', 'proposal_passed', 'proposal_rejected'],
  ideas: ['idea_posted', 'idea_voted', 'idea_promoted'],
  members: ['member_joined', 'level_up', 'achievement_earned'],
  rewards: ['reward_claimed'],
  sprints: ['sprint_started', 'sprint_ended'],
};
```

---

## API Changes

### File: `src/app/api/activity/route.ts`

Add query params to existing route:

```
GET /api/activity?limit=20&before=<cursor>&scope=all|mine&type=tasks|proposals|ideas|members|rewards|sprints
```

- `scope=all` (default) — all activity for the org
- `scope=mine` — filter where `actor_id = current_user` OR subject involves current user
- `type` — filter by category (maps to event types via `ACTIVITY_CATEGORY_EVENT_MAP`)

**Changes needed:**
1. Add auth check (get current user for `mine` scope)
2. Add `.in('event_type', [...])` filter when `type` param provided
3. Add `.eq('actor_id', user.id)` when `scope=mine`
4. For `scope=mine`, also include events where user is the subject (e.g., task assigned to them, mentioned)

---

## File Path Summary

| What | Path |
|---|---|
| Types (extend) | `src/features/activity/types.ts` |
| API route (modify) | `src/app/api/activity/route.ts` |
| Hooks (extend) | `src/features/activity/hooks.ts` |
| Activity page | `src/app/[locale]/activity/page.tsx` |
| Event card component | `src/components/activity/event-card.tsx` |
| Event list component | `src/components/activity/event-list.tsx` |
| Category filter | `src/components/activity/category-filter.tsx` |
| Dashboard widget | `src/components/dashboard/activity-widget.tsx` |
| i18n keys (en) | Add `activity` namespace to `messages/en/*.json` |
| i18n keys (pt-PT) | Add `activity` namespace to `messages/pt-PT/*.json` |
| i18n keys (zh-CN) | Add `activity` namespace to `messages/zh-CN/*.json` |

---

## Event Card Component Design

Each event card renders based on `event_type`:

```typescript
// src/components/activity/event-card.tsx
// Maps event_type → { icon, color, label, description }

const EVENT_CONFIG: Record<ActivityEventType, EventDisplayConfig> = {
  task_completed: { icon: CheckCircle, color: 'text-green-500', verb: 'completed task' },
  vote_cast: { icon: Vote, color: 'text-blue-500', verb: 'voted on' },
  idea_posted: { icon: Lightbulb, color: 'text-yellow-500', verb: 'posted idea' },
  member_joined: { icon: UserPlus, color: 'text-purple-500', verb: 'joined' },
  level_up: { icon: Star, color: 'text-amber-500', verb: 'reached' },
  // ... etc
};
```

Each card shows:
- Actor avatar (from joined `user_profiles`)
- Actor name + verb + subject title (linked to subject page)
- Contextual detail (sprint name, vote count, score, etc. from `metadata` JSONB)
- Relative time (`date-fns` `formatDistanceToNow`)

---

## Activity Emitter Audit

Existing emitters to verify are working:
- Task CRUD → `task_created`, `task_completed`, `task_status_changed`
- Submissions → `submission_created`, `submission_reviewed`
- Proposals → `proposal_created`, `proposal_status_changed`
- Votes → `vote_cast`
- Disputes → `dispute_created`, `dispute_resolved`, etc.

**New emitters to add:**
| Event | Trigger location |
|---|---|
| `member_joined` | `src/app/api/auth/link-wallet/route.ts` (on first wallet link) |
| `idea_posted` | `src/app/api/ideas/route.ts` (POST) |
| `idea_voted` | `src/app/api/ideas/[id]/vote/route.ts` (POST) |
| `idea_promoted` | `src/app/api/ideas/[id]/promote/route.ts` (POST) |
| `reward_claimed` | `src/app/api/rewards/` (claim endpoint) |
| `achievement_earned` | `src/features/reputation/` (achievement grant logic) |
| `level_up` | `src/features/reputation/` (level-up logic) |
| `sprint_started` | `src/app/api/sprints/[id]/start/route.ts` |
| `sprint_ended` | `src/app/api/sprints/[id]/complete/route.ts` |
| `proposal_passed` | Proposal finalization logic |
| `proposal_rejected` | Proposal finalization logic |

---

## Dashboard Integration

**File:** `src/components/dashboard/activity-widget.tsx`

- Fetch last 5 events from `GET /api/activity?limit=5`
- Render compact event cards (avatar + one-line description + time)
- "View all →" link to `/activity`
- Auto-refresh every 60 seconds (or use Supabase realtime subscription)
- Show loading skeleton while fetching

**Integration point:** Add to dashboard page layout alongside existing dashboard widgets.

---

## No New Dependencies

All needed libraries are already in the project:
- `date-fns` for relative time formatting
- `lucide-react` for event type icons
- `@tanstack/react-query` for data fetching + caching
- `@supabase/supabase-js` for optional realtime subscription
