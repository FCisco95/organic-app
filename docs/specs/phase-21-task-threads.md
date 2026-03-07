# Spec: Phase 21 — Task Threads + Co-crediting

> Track 3 | Priority: Pre-Launch Feature
> Last updated: 2026-03-07

---

## Goal

Make collaboration visible inside the platform. Replace the silence between task creation and completion with threaded discussion and shared XP credit among co-contributors.

---

## Current State

- `task_comments` table already exists (migration `20250121000000_add_task_comments.sql`)
- `TaskComment` type exists in `src/features/tasks/types.ts` (basic: id, task_id, user_id, content, created_at, updated_at, user relation)
- `GET/POST /api/tasks/:id/comments` route exists at `src/app/api/tasks/[id]/comments/route.ts`
- **Missing:** Threading (parent_id), soft delete, edit window, @mentions, collaborators table, XP splitting, submission-time co-crediting

---

## Implementation Sequence

```
Step 1: DB migration (extend comments + create collaborators)    (45 min)
Step 2: Update types and schemas                                  (30 min)
Step 3: Comments API (threading, edit, delete, mentions)          (2 hrs)
Step 4: Collaborators API (add, list, validate XP split)          (1.5 hrs)
Step 5: XP distribution engine update                             (1.5 hrs)
Step 6: Comment thread UI component                               (2 hrs)
Step 7: @mention autocomplete                                     (1.5 hrs)
Step 8: Co-contributor selector on submission form                (2 hrs)
Step 9: Collaborator avatars on task cards                        (45 min)
Step 10: Notifications integration                                (1 hr)
Step 11: i18n + mobile pass                                       (45 min)
```

---

## Step 1: Database Migration

**Create:** `supabase/migrations/YYYYMMDDHHMMSS_task_threads_co_crediting.sql`

```sql
-- ============================================
-- Extend task_comments for threading + moderation
-- ============================================

-- Add threading support
ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for fetching threaded comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_parent
  ON task_comments(task_id, parent_id, created_at);

-- Index for fetching replies to a specific comment
CREATE INDEX IF NOT EXISTS idx_task_comments_parent
  ON task_comments(parent_id, created_at);

-- ============================================
-- Task collaborators (co-crediting)
-- ============================================

CREATE TABLE task_collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  credited_by     UUID NOT NULL REFERENCES user_profiles(id),
  xp_share_pct    INTEGER NOT NULL CHECK (xp_share_pct >= 1 AND xp_share_pct <= 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_task_collaborators_task ON task_collaborators(task_id);
CREATE INDEX idx_task_collaborators_user ON task_collaborators(user_id);

-- RLS
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

-- All authenticated members can read collaborators
CREATE POLICY "Members read collaborators"
  ON task_collaborators
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Task assignees and admins can manage collaborators
CREATE POLICY "Assignees manage collaborators"
  ON task_collaborators
  FOR INSERT
  WITH CHECK (
    auth.uid() = credited_by
    AND (
      -- User is an assignee of this task
      EXISTS (
        SELECT 1 FROM task_assignees
        WHERE task_assignees.task_id = task_collaborators.task_id
          AND task_assignees.user_id = auth.uid()
      )
      -- Or user is admin
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Assignees delete collaborators"
  ON task_collaborators
  FOR DELETE
  USING (
    auth.uid() = credited_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- Mention tracking (optional — for notification targeting)
-- ============================================

CREATE TABLE comment_mentions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id      UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id);

ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read mentions"
  ON comment_mentions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages mentions"
  ON comment_mentions
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Step 2: Update Types and Schemas

**Edit:** `src/features/tasks/types.ts`

```typescript
// Update TaskComment interface:
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;        // NEW
  edited_at: string | null;        // NEW
  deleted_at: string | null;       // NEW
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  replies?: TaskComment[];          // NEW — nested replies (client-side)
  reply_count?: number;             // NEW — for collapsed threads
}

// NEW: Co-contributor
export interface TaskCollaborator {
  id: string;
  task_id: string;
  user_id: string;
  credited_by: string;
  xp_share_pct: number;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    organic_id: number | null;
    avatar_url: string | null;
  };
}
```

**Edit:** `src/features/tasks/schemas.ts`

```typescript
import { z } from 'zod';

// Comment creation
export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: z.string().uuid().nullable().optional(),
  mentions: z.array(z.string().uuid()).optional(),  // resolved user IDs
});

// Comment edit
export const editCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

// Collaborator addition
export const addCollaboratorsSchema = z.object({
  collaborators: z.array(z.object({
    user_id: z.string().uuid(),
    xp_share_pct: z.number().int().min(1).max(100),
  })).min(1).max(10),
}).refine(
  (data) => {
    const total = data.collaborators.reduce((sum, c) => sum + c.xp_share_pct, 0);
    return total === 100;
  },
  { message: 'XP shares must sum to 100%' }
);
```

---

## Step 3: Comments API

**Edit:** `src/app/api/tasks/[id]/comments/route.ts`

### GET — Fetch threaded comments

```typescript
// GET /api/tasks/:id/comments?parent_id=null&limit=20&before=cursor
//
// Returns top-level comments (parent_id IS NULL) with reply counts
// Soft-deleted comments show as "[deleted]" but preserve thread structure
//
// Response:
{
  comments: TaskComment[];  // top-level, each with reply_count
  has_more: boolean;
}
```

### POST — Create comment

```typescript
// POST /api/tasks/:id/comments
// Body: { content, parent_id?, mentions? }
//
// 1. Validate with createCommentSchema
// 2. Insert into task_comments
// 3. If parent_id: verify parent exists and belongs to same task (max 3 levels deep)
// 4. If mentions: insert into comment_mentions, trigger notifications
// 5. Emit activity event
```

**Create:** `src/app/api/tasks/[id]/comments/[commentId]/route.ts`

### PATCH — Edit comment

```typescript
// PATCH /api/tasks/:id/comments/:commentId
// Body: { content }
//
// 1. Verify ownership (user_id = auth.uid())
// 2. Verify within edit window (15 minutes from created_at)
// 3. Update content + set edited_at = now()
```

### DELETE — Soft delete comment

```typescript
// DELETE /api/tasks/:id/comments/:commentId
//
// 1. Verify ownership OR admin role
// 2. Set deleted_at = now() (soft delete)
// 3. Content replaced with "[deleted]" in GET responses
// 4. Replies remain visible (thread structure preserved)
```

**Create:** `src/app/api/tasks/[id]/comments/[commentId]/replies/route.ts`

### GET — Fetch replies to a comment

```typescript
// GET /api/tasks/:id/comments/:commentId/replies?limit=10
// Returns child comments for a specific parent
```

---

## Step 4: Collaborators API

**Create:** `src/app/api/tasks/[id]/collaborators/route.ts`

### GET — List collaborators

```typescript
// GET /api/tasks/:id/collaborators
// Returns all collaborators with user profiles and XP share percentages
```

### POST — Add collaborators

```typescript
// POST /api/tasks/:id/collaborators
// Body: { collaborators: [{ user_id, xp_share_pct }] }
//
// 1. Validate with addCollaboratorsSchema (sum must be 100%)
// 2. Verify caller is an assignee of this task
// 3. Verify all user_ids are valid org members
// 4. Delete existing collaborators for this task (replace mode)
// 5. Insert new collaborators
// 6. Notify added collaborators
```

### DELETE — Remove collaborators

```typescript
// DELETE /api/tasks/:id/collaborators
// Removes all collaborators (reset to solo credit)
```

---

## Step 5: XP Distribution Engine Update

**Locate:** The existing XP distribution code (likely in `src/features/reputation/` or rewards settlement).

**Current behavior:** When a task is approved, full XP goes to the submitter.

**New behavior:**
1. On task approval, check `task_collaborators` for the task
2. If collaborators exist: split the task's XP reward by `xp_share_pct`
3. If no collaborators: 100% to submitter (unchanged)

```typescript
// Pseudocode:
async function distributeTaskXP(taskId: string, totalXP: number) {
  const collaborators = await getCollaborators(taskId);

  if (collaborators.length === 0) {
    // Legacy: full XP to submitter
    await awardXP(submitterId, totalXP);
    return;
  }

  for (const collab of collaborators) {
    const share = Math.round(totalXP * (collab.xp_share_pct / 100));
    await awardXP(collab.user_id, share);
    // Emit activity: "Alice earned 60 XP from task 'Fix sidebar'"
  }
}
```

---

## Step 6: Comment Thread UI

**Create:** `src/components/tasks/comment-thread.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Comments (12)                                               │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [Av] Alice · 2h ago                        [···]    │     │
│  │ I've started working on this. The sidebar   Edit    │     │
│  │ component needs refactoring first.          Delete  │     │
│  │                                                     │     │
│  │ Reply · 3 replies                                   │     │
│  │                                                     │     │
│  │   ┌─────────────────────────────────────────────┐   │     │
│  │   │ [Av] Bob · 1h ago                           │   │     │
│  │   │ @Alice agreed, I can help with the          │   │     │
│  │   │ responsive part.                            │   │     │
│  │   │                                             │   │     │
│  │   │ Reply                                       │   │     │
│  │   └─────────────────────────────────────────────┘   │     │
│  │                                                     │     │
│  │   ┌─────────────────────────────────────────────┐   │     │
│  │   │ [Av] Alice · 45m ago  (edited)              │   │     │
│  │   │ Perfect, I'll handle the logic, you take    │   │     │
│  │   │ the CSS.                                    │   │     │
│  │   │                                             │   │     │
│  │   │ Reply                                       │   │     │
│  │   └─────────────────────────────────────────────┘   │     │
│  │                                                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [Av] Carol · 30m ago                                │     │
│  │ [deleted]                                           │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [Your avatar] Write a comment...              Send  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components to create:**

| Component | Path |
|---|---|
| Thread container | `src/components/tasks/comment-thread.tsx` |
| Single comment | `src/components/tasks/comment-item.tsx` |
| Comment input | `src/components/tasks/comment-input.tsx` |
| Reply list | `src/components/tasks/comment-replies.tsx` |

**Rules:**
- Max 3 levels of nesting (top → reply → reply-to-reply, then flat)
- Indent with left border (2px green line) per nesting level
- Collapsed replies: "3 replies" link to expand
- Edit shows "(edited)" label next to timestamp
- Deleted shows "[deleted]" in gray, replies remain visible
- Edit/delete only on own comments, within 15-min window for edit
- Comment input at bottom with avatar, supports markdown basics

---

## Step 7: @Mention Autocomplete

**Create:** `src/components/tasks/mention-autocomplete.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  [Your avatar] Hey @ali|                             Send   │
│                ┌───────────────────────┐                     │
│                │ [Av] Alice Johnson    │                     │
│                │ [Av] Ali Mohammed     │                     │
│                │ [Av] Alicia Chen      │                     │
│                └───────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Type `@` to trigger autocomplete dropdown
- Search members by name, organic_id, or handle
- Select inserts `@Alice Johnson` as styled chip (rendered differently from plain text)
- On submit: extract mentioned user IDs, pass to API in `mentions` array
- Use existing `GET /api/members` endpoint for search

**Implementation:**
- Use `contenteditable` div or textarea with overlay for mention chips
- Or simpler: use `@name` syntax in plain text, resolve on submit
- Dropdown positioned below cursor, max 5 results, keyboard navigation

---

## Step 8: Co-contributor Selector

**Create:** `src/components/tasks/collaborator-selector.tsx`

Shown on the task submission form (when a user submits work for review).

```
┌─────────────────────────────────────────────────────────────┐
│  Co-contributors (optional)                                  │
│                                                              │
│  Did you work with others on this? Credit them and share XP. │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Search members...                              [+]  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [Av] You (Alice)              ┌─────┐              │     │
│  │                               │ 60% │  XP share    │     │
│  │                               └─────┘              │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │ [Av] Bob Wilson         [×]   ┌─────┐              │     │
│  │                               │ 25% │  XP share    │     │
│  │                               └─────┘              │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │ [Av] Carol Davis        [×]   ┌─────┐              │     │
│  │                               │ 15% │  XP share    │     │
│  │                               └─────┘              │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Total: 100% ✓                                               │
│                                                              │
│  ┌────────────────────────────────┐                          │
│  │ XP Preview                     │                          │
│  │ Task reward: 100 XP            │                          │
│  │ You: 60 XP · Bob: 25 XP · Carol: 15 XP                  │
│  └────────────────────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Search and add collaborators from org members
- Slider or number input for XP share per person
- Auto-adjust: when you add someone, your share decreases proportionally
- Validation: must sum to exactly 100%
- XP preview: shows how much each person will earn based on task's base_points
- Can remove collaborators (×) and re-adjust shares
- Current user is always included (can't remove self)

---

## Step 9: Collaborator Avatars on Task Cards

**Edit:** `src/components/tasks/task-card.tsx` (or equivalent kanban card component)

```
┌──────────────────────────────────┐
│  Fix sidebar layout         🟡   │
│  development · medium            │
│                                  │
│  [Av][Av][Av]  +2 collaborators  │
│  ↑ small avatar stack            │
└──────────────────────────────────┘
```

- Show first 3 collaborator avatars as overlapping circles (16-20px)
- If more than 3: show "+N" indicator
- Only show if task has collaborators

**Edit task list view similarly.**

---

## Step 10: Notifications Integration

Trigger notifications for:

1. **@mention in comment:** "Alice mentioned you in a comment on 'Fix sidebar layout'"
   - Route: `/tasks/:id` with scroll to comment
2. **Added as collaborator:** "Bob added you as a co-contributor on 'Fix sidebar layout' (25% XP share)"
   - Route: `/tasks/:id`
3. **Reply to your comment:** "Carol replied to your comment on 'Fix sidebar layout'"
   - Route: `/tasks/:id` with scroll to reply

Use existing notification system (`src/features/notifications/`).

---

## Step 11: i18n + Mobile

### i18n Strings

**Edit:** `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json`:

```json
{
  "task_comments": {
    "title": "Comments",
    "count": "{count} comments",
    "write_comment": "Write a comment...",
    "reply": "Reply",
    "replies": "{count} replies",
    "edited": "edited",
    "deleted": "[deleted]",
    "edit": "Edit",
    "delete": "Delete",
    "edit_window_expired": "Edit window has expired (15 min)",
    "send": "Send",
    "confirm_delete": "Delete this comment?"
  },
  "task_collaborators": {
    "title": "Co-contributors",
    "subtitle": "Did you work with others on this? Credit them and share XP.",
    "search": "Search members...",
    "xp_share": "XP share",
    "total": "Total",
    "xp_preview": "XP Preview",
    "task_reward": "Task reward: {xp} XP",
    "must_sum_100": "XP shares must sum to 100%",
    "collaborators_count": "+{count} collaborators",
    "added_notification": "{name} added you as a co-contributor",
    "mention_notification": "{name} mentioned you in a comment"
  }
}
```

### Mobile

- Comment thread: full-width cards, no horizontal overflow
- Reply indentation: reduced to 8px on mobile (from 16px on desktop)
- Collaborator selector: stack vertically, full-width inputs
- @mention dropdown: full-width on mobile, positioned above keyboard

---

## File Map Summary

| Action | Path |
|---|---|
| Create | `supabase/migrations/YYYYMMDDHHMMSS_task_threads_co_crediting.sql` |
| Edit | `src/features/tasks/types.ts` (extend TaskComment, add TaskCollaborator) |
| Edit | `src/features/tasks/schemas.ts` (add comment/collaborator schemas) |
| Edit | `src/app/api/tasks/[id]/comments/route.ts` (threading, soft delete) |
| Create | `src/app/api/tasks/[id]/comments/[commentId]/route.ts` (edit, delete) |
| Create | `src/app/api/tasks/[id]/comments/[commentId]/replies/route.ts` |
| Create | `src/app/api/tasks/[id]/collaborators/route.ts` |
| Edit | XP distribution engine (split by collaborator shares) |
| Create | `src/components/tasks/comment-thread.tsx` |
| Create | `src/components/tasks/comment-item.tsx` |
| Create | `src/components/tasks/comment-input.tsx` |
| Create | `src/components/tasks/comment-replies.tsx` |
| Create | `src/components/tasks/mention-autocomplete.tsx` |
| Create | `src/components/tasks/collaborator-selector.tsx` |
| Edit | `src/components/tasks/task-card.tsx` (collaborator avatars) |
| Edit | Task submission form (add collaborator selector) |
| Edit | `src/features/notifications/` (mention + collaborator notifications) |
| Edit | `messages/en.json`, `messages/pt-PT.json`, `messages/zh-CN.json` |
| Edit | `src/types/database.ts` (regenerate after migration) |

---

## Dependencies

None — all functionality uses existing libraries (Zod, React Query, Supabase).

---

## Notes

- `task_comments` table already exists — migration only adds columns, not a new table
- The existing comments API route needs enhancement, not replacement
- Thread depth is capped at 3 to prevent deep nesting on mobile
- Edit window (15 min) is enforced server-side, not just client-side
- Collaborator XP split is calculated at task approval time, not at submission
- Self-crediting is fine (submitter is always in the collaborator list)
