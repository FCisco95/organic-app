# Sprint-Task Voting + Steward Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual "Backlog priority voting" admin task with continuous 1p1v member voting on backlog tasks, plus a heuristic Steward layer that suggests how many items to promote into a planning sprint and annotates each candidate; council promotes with one click. D1b swaps heuristic for Claude Haiku — same interface — in the same PR.

**Architecture:** Three layers, one PR. (1) Member voting layer = `backlog_votes` table + trigger maintaining `tasks.upvotes/downvotes` + `POST /api/tasks/[id]/vote`. (2) Steward layer = `task_steward_reviews` table + `StewardClient` interface + heuristic implementation (D1a) and LLM implementation (D1b). (3) Council promotion layer = three RPCs (`suggest_promote_n`, `get_top_backlog_candidates`, `promote_top_backlog_to_sprint`) + two admin POST endpoints + sprint-planning UI panel.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase (Postgres + RLS + RPCs), Zod, TanStack Query, Vitest (project test runner per `vitest.config.ts`: `tests/security/`, `tests/features/`, `src/app/api/**/__tests__/`, `src/lib/solana/__tests__/`). Anthropic SDK (`@anthropic-ai/sdk`) for D1b.

**Locked decisions** (confirmed 2026-05-14 with user, spec §12 defaults):
1. Steward verdict visibility — council-only (planning panel only; no badge on backlog rows for members).
2. Regeneration — manual only (no auto-trigger on description change).
3. Vote rate-limit — none (organic_id gate + unique constraint sufficient).

---

## File Structure

**Created:**

- `supabase/migrations/20260514000000_backlog_votes.sql` — `backlog_votes` table, RLS, trigger, `tasks.upvotes/downvotes` columns + score index.
- `supabase/migrations/20260514000001_sprint_promote_rpcs.sql` — `suggest_promote_n(uuid)`, `get_top_backlog_candidates(uuid, int)`, `promote_top_backlog_to_sprint(uuid, int)` RPCs.
- `supabase/migrations/20260514000002_steward_reviews.sql` — `task_steward_reviews` table, RLS, `pg_trgm` extension guard.
- `src/lib/steward/types.ts` — `StewardReview` and `StewardClient` interfaces.
- `src/lib/steward/heuristics.ts` — v1 heuristic `StewardClient` implementation.
- `src/lib/steward/llm.ts` — D1b: Claude Haiku-backed `StewardClient` implementation.
- `src/lib/steward/index.ts` — public selector (`getStewardClient`) honoring env flag.
- `src/features/backlog/schemas.ts` — Zod schemas for vote + promote + review-refresh payloads.
- `src/features/backlog/hooks.ts` — `useBacklogVote`, `useTopBacklogCandidates`, `useStewardReview`, `usePromoteBacklog`.
- `src/app/api/tasks/[id]/vote/route.ts` — POST member vote (organic_id gate, upsert/delete).
- `src/app/api/admin/sprints/[id]/promote-backlog/route.ts` — POST council promote.
- `src/app/api/admin/steward/review-backlog/route.ts` — POST review regeneration.
- `src/components/backlog/BacklogVoteControl.tsx` — ↑/↓ control.
- `src/components/backlog/StewardPromotePanel.tsx` — sprint planning panel.
- `tests/features/backlog/schemas.test.ts` — Zod schema unit tests.
- `tests/features/backlog/heuristics.test.ts` — Steward `suggestN` + `reviewBacklogCandidates` unit tests.
- `tests/features/backlog/api-tasks-vote.test.ts` — vote API integration tests (organic_id gate, toggle/clear, status check).
- `tests/features/backlog/api-admin-promote-backlog.test.ts` — promote API integration tests (idempotency, status flip).
- `tests/security/backlog-vote-authz.test.ts` — security: anon, no-organic_id, non-backlog cannot vote.
- `tests/security/admin-promote-backlog-authz.test.ts` — security: non-admin cannot promote, non-admin cannot regen reviews.

**Modified:**

- `src/components/tasks/task-list-section.tsx` — render `BacklogVoteControl` on backlog rows.
- `src/app/[locale]/sprints/[id]/page.tsx` — render `StewardPromotePanel` when sprint is in `planning`.
- `.env.example` — document `STEWARD_BACKEND` env flag (`heuristic` | `llm`, default `heuristic`).
- `package.json` — no script changes; tests run via existing `vitest run` (do not modify scripts, per CLAUDE.md "Do not change npm scripts without approval").

**Test commands:**

- Unit + integration + security: `npx vitest run tests/features/backlog/ tests/security/backlog-vote-authz.test.ts tests/security/admin-promote-backlog-authz.test.ts`
- Full security sweep after security changes: `npx vitest run tests/security/`
- Build: `npm run build`
- Lint: `npm run lint`

---

## Pre-flight Verification

### Task 0: Verify environment and reference patterns

**Files:** No edits. Reads only.

- [ ] **Step 1: Confirm test runner is Vitest**

Run: `cat package.json | grep -E '"test|vitest'`
Expected: `"vitest": "^4.1.4"` in devDeps; project test script is `node --test` (legacy `__tests__`), but per `vitest.config.ts` everything under `tests/**` and `src/app/api/**/__tests__/**` uses Vitest. New tests go in `tests/features/backlog/` and `tests/security/` (Vitest territory).

- [ ] **Step 2: Confirm `pg_trgm` extension support**

Run: `grep -rn "create extension.*pg_trgm\|pg_trgm" supabase/migrations/`
Expected: No prior `create extension pg_trgm`. Plan adds `create extension if not exists pg_trgm` in migration 2.

- [ ] **Step 3: Confirm `tasks` table has `org_id`, `status`, `sprint_id`, `description`**

Run: `grep -n "CREATE TABLE tasks" supabase/migrations/20250101000000_initial_schema.sql`
Then read lines 62–90 of that file.
Expected: columns `id, org_id, proposal_id, title, description, status, points, assignee_id, sprint_id, created_at, updated_at`. Confirm `status` is enum `task_status` with `'backlog'` as a value. Plan depends on these columns.

- [ ] **Step 4: Confirm `user_profiles` has `organic_id` and `role`**

Run: `grep -n "organic_id\|role" src/features/ideas/server.ts | head -10`
Expected: `organic_id: number | null` and `role: 'admin' | 'council' | 'member' | 'guest' | null` in `IdeaProfile`. Plan reuses `isAdminOrCouncil(role)` from `src/features/ideas/server.ts`.

- [ ] **Step 5: Confirm sprint `status` enum includes `'planning'`**

Run: `grep -n "sprint_status\|SprintStatus" src/types/database.ts | head -10`
Expected: `'planning' | 'active' | ...`. Plan checks `sprint.status === 'planning'` before promotion.

---

## Phase 1 — Member Voting Layer (D1a)

### Task 1: Migration — `backlog_votes` table, counters, trigger

**Files:**
- Create: `supabase/migrations/20260514000000_backlog_votes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260514000000_backlog_votes.sql
-- Sprint task D1: member voting layer for backlog tasks (1p1v).

-- 1) Counter columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS upvotes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes int NOT NULL DEFAULT 0;

-- Partial index for ranking backlog candidates by net score
CREATE INDEX IF NOT EXISTS idx_tasks_backlog_score
  ON public.tasks ((upvotes - downvotes) DESC, created_at ASC)
  WHERE status = 'backlog' AND sprint_id IS NULL;

-- 2) backlog_votes table
CREATE TABLE IF NOT EXISTS public.backlog_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  value      smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backlog_votes_value_check CHECK (value IN (-1, 1)),
  CONSTRAINT backlog_votes_unique UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_backlog_votes_task ON public.backlog_votes(task_id);
CREATE INDEX IF NOT EXISTS idx_backlog_votes_user ON public.backlog_votes(user_id);

-- 3) updated_at trigger (reuse helper from initial schema)
DROP TRIGGER IF EXISTS update_backlog_votes_updated_at ON public.backlog_votes;
CREATE TRIGGER update_backlog_votes_updated_at
  BEFORE UPDATE ON public.backlog_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Counter trigger — maintain tasks.upvotes / tasks.downvotes
CREATE OR REPLACE FUNCTION public.backlog_votes_maintain_counters()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.value = 1 THEN
      UPDATE public.tasks SET upvotes = upvotes + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = downvotes + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.value = OLD.value THEN
      RETURN NEW;
    END IF;
    -- Switched direction: decrement old, increment new
    IF OLD.value = 1 THEN
      UPDATE public.tasks SET upvotes = upvotes - 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = downvotes - 1 WHERE id = NEW.task_id;
    END IF;
    IF NEW.value = 1 THEN
      UPDATE public.tasks SET upvotes = upvotes + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = downvotes + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value = 1 THEN
      UPDATE public.tasks SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backlog_votes_counters ON public.backlog_votes;
CREATE TRIGGER trg_backlog_votes_counters
  AFTER INSERT OR UPDATE OR DELETE ON public.backlog_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.backlog_votes_maintain_counters();

-- 5) RLS
ALTER TABLE public.backlog_votes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read votes (aggregate is also denormalized to tasks).
DROP POLICY IF EXISTS "backlog_votes_select_authenticated" ON public.backlog_votes;
CREATE POLICY "backlog_votes_select_authenticated"
  ON public.backlog_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only the row's own user_id can insert/update/delete.
DROP POLICY IF EXISTS "backlog_votes_insert_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_insert_self"
  ON public.backlog_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "backlog_votes_update_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_update_self"
  ON public.backlog_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "backlog_votes_delete_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_delete_self"
  ON public.backlog_votes FOR DELETE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset` (only if working in a local Supabase project) OR push migration via `npx supabase db push` against a dev branch.
If neither is configured, defer migration application to PR review; CI will validate against the dev DB.
Expected: No errors. `\d public.backlog_votes` shows new table and constraints.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260514000000_backlog_votes.sql
git commit -m "feat(db): add backlog_votes table + counter trigger"
```

---

### Task 2: Zod schemas for vote/promote/review payloads

**Files:**
- Create: `src/features/backlog/schemas.ts`
- Test: `tests/features/backlog/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/features/backlog/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  voteBacklogSchema,
  promoteBacklogSchema,
  reviewBacklogSchema,
} from '@/features/backlog/schemas';

describe('voteBacklogSchema', () => {
  it('accepts up/down/none', () => {
    expect(voteBacklogSchema.safeParse({ value: 'up' }).success).toBe(true);
    expect(voteBacklogSchema.safeParse({ value: 'down' }).success).toBe(true);
    expect(voteBacklogSchema.safeParse({ value: 'none' }).success).toBe(true);
  });

  it('rejects arbitrary strings and numeric values', () => {
    expect(voteBacklogSchema.safeParse({ value: 'maybe' }).success).toBe(false);
    expect(voteBacklogSchema.safeParse({ value: 1 }).success).toBe(false);
    expect(voteBacklogSchema.safeParse({}).success).toBe(false);
  });
});

describe('promoteBacklogSchema', () => {
  it('accepts integer n between 1 and 50', () => {
    expect(promoteBacklogSchema.safeParse({ n: 1 }).success).toBe(true);
    expect(promoteBacklogSchema.safeParse({ n: 50 }).success).toBe(true);
  });

  it('rejects n=0, negative, or > 50', () => {
    expect(promoteBacklogSchema.safeParse({ n: 0 }).success).toBe(false);
    expect(promoteBacklogSchema.safeParse({ n: -1 }).success).toBe(false);
    expect(promoteBacklogSchema.safeParse({ n: 51 }).success).toBe(false);
  });

  it('rejects non-integer n', () => {
    expect(promoteBacklogSchema.safeParse({ n: 2.5 }).success).toBe(false);
  });
});

describe('reviewBacklogSchema', () => {
  it('accepts non-empty uuid array with optional force flag', () => {
    expect(
      reviewBacklogSchema.safeParse({
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }).success,
    ).toBe(true);
    expect(
      reviewBacklogSchema.safeParse({
        task_ids: ['11111111-1111-1111-1111-111111111111'],
        force: true,
      }).success,
    ).toBe(true);
  });

  it('rejects empty array, non-uuid entries, or > 50 ids', () => {
    expect(reviewBacklogSchema.safeParse({ task_ids: [] }).success).toBe(false);
    expect(reviewBacklogSchema.safeParse({ task_ids: ['not-a-uuid'] }).success).toBe(false);
    const tooMany = Array(51).fill('11111111-1111-1111-1111-111111111111');
    expect(reviewBacklogSchema.safeParse({ task_ids: tooMany }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/backlog/schemas.test.ts`
Expected: FAIL — module `@/features/backlog/schemas` not found.

- [ ] **Step 3: Implement schemas**

```ts
// src/features/backlog/schemas.ts
import { z } from 'zod';

export const voteBacklogSchema = z.object({
  value: z.enum(['up', 'down', 'none']),
});
export type VoteBacklogInput = z.infer<typeof voteBacklogSchema>;

export const promoteBacklogSchema = z.object({
  n: z.number().int().min(1).max(50),
});
export type PromoteBacklogInput = z.infer<typeof promoteBacklogSchema>;

export const reviewBacklogSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1).max(50),
  force: z.boolean().optional().default(false),
});
export type ReviewBacklogInput = z.infer<typeof reviewBacklogSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/backlog/schemas.test.ts`
Expected: PASS, 8 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/features/backlog/schemas.ts tests/features/backlog/schemas.test.ts
git commit -m "feat(backlog): add Zod schemas for vote/promote/review"
```

---

### Task 3: Vote API route — `POST /api/tasks/[id]/vote`

**Files:**
- Create: `src/app/api/tasks/[id]/vote/route.ts`
- Test: `tests/features/backlog/api-tasks-vote.test.ts`
- Test: `tests/security/backlog-vote-authz.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/features/backlog/api-tasks-vote.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tasks/[id]/vote/route';

// Mock the supabase client factory. We assert on the call sequence and shape.
vi.mock('@/lib/supabase/server', () => {
  const upsertSpy = vi.fn().mockResolvedValue({ error: null });
  const deleteSpy = vi.fn().mockResolvedValue({ error: null });

  const eqChain = (final: unknown) => ({
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(final),
    single: vi.fn().mockResolvedValue(final),
  });

  const from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue(eqChain({ data: { id: 'user-1', organic_id: 42 }, error: null })),
      };
    }
    if (table === 'tasks') {
      return {
        select: vi.fn().mockReturnValue(
          eqChain({
            data: { id: 'task-1', status: 'backlog', sprint_id: null, upvotes: 3, downvotes: 1 },
            error: null,
          }),
        ),
      };
    }
    if (table === 'backlog_votes') {
      return {
        select: vi.fn().mockReturnValue(eqChain({ data: null, error: null })),
        upsert: upsertSpy.mockReturnValue({ then: (fn: any) => fn({ error: null }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: deleteSpy }) }),
      };
    }
    return { select: vi.fn().mockReturnValue(eqChain({ data: null, error: null })) };
  });

  return {
    createClient: vi.fn(async () => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from,
    })),
    createServiceClient: vi.fn(() => ({ from })),
  };
});

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/tasks/task-1/vote'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tasks/[id]/vote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 on invalid body', async () => {
    const res = await POST(jsonRequest({ value: 'wat' }), { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns success with the new vote value', async () => {
    const res = await POST(jsonRequest({ value: 'up' }), { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.my_vote).toBe(1);
    expect(json.data.task_id).toBe('task-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/backlog/api-tasks-vote.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/tasks/[id]/vote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { voteBacklogSchema } from '@/features/backlog/schemas';

type RouteParams = { params: Promise<{ id: string }> };

function normalize(value: 'up' | 'down' | 'none'): -1 | 0 | 1 {
  if (value === 'up') return 1;
  if (value === 'down') return -1;
  return 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ data: null, error: parsedBody.error }, { status: 400 });
    }
    const parsed = voteBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }
    const desired = normalize(parsed.data.value);

    const [profileResult, taskResult, existingResult] = await Promise.all([
      supabase.from('user_profiles').select('id, organic_id').eq('id', user.id).maybeSingle(),
      supabase
        .from('tasks')
        .select('id, status, sprint_id')
        .eq('id', taskId)
        .single(),
      supabase
        .from('backlog_votes')
        .select('id, value')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ data: null, error: 'Profile not found' }, { status: 404 });
    }
    if (!profileResult.data.organic_id) {
      return NextResponse.json(
        { data: null, error: 'Organic ID required to vote' },
        { status: 403 },
      );
    }
    if (taskResult.error || !taskResult.data) {
      return NextResponse.json({ data: null, error: 'Task not found' }, { status: 404 });
    }
    const task = taskResult.data;
    if (task.status !== 'backlog' || task.sprint_id !== null) {
      return NextResponse.json(
        { data: null, error: 'Voting is only allowed on backlog tasks' },
        { status: 409 },
      );
    }

    const existing = existingResult.data;
    const existingValue = Number(existing?.value ?? 0);
    const shouldClear = desired === 0 || (existing && existingValue === desired);

    if (shouldClear && existing) {
      const { error } = await supabase
        .from('backlog_votes')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user.id);
      if (error) {
        logger.error('backlog vote delete failed', error);
        return NextResponse.json({ data: null, error: 'Failed to clear vote' }, { status: 500 });
      }
    }

    if (!shouldClear) {
      const { error } = await supabase.from('backlog_votes').upsert(
        { task_id: taskId, user_id: user.id, value: desired },
        { onConflict: 'task_id,user_id' },
      );
      if (error) {
        logger.error('backlog vote upsert failed', error);
        return NextResponse.json({ data: null, error: 'Failed to cast vote' }, { status: 500 });
      }
    }

    const finalVote: -1 | 0 | 1 = shouldClear ? 0 : desired;

    const { data: snapshot } = await supabase
      .from('tasks')
      .select('id, upvotes, downvotes')
      .eq('id', taskId)
      .single();

    return NextResponse.json({
      data: {
        task_id: taskId,
        upvotes: snapshot?.upvotes ?? 0,
        downvotes: snapshot?.downvotes ?? 0,
        my_vote: finalVote,
      },
      error: null,
    });
  } catch (error) {
    logger.error('backlog vote route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/backlog/api-tasks-vote.test.ts`
Expected: PASS, 2 assertions.

- [ ] **Step 5: Write the security test**

```ts
// tests/security/backlog-vote-authz.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Helper to build a mocked supabase chain with a user-profiles + task lookup.
function setupMock(opts: {
  user: { id: string } | null;
  profile: { id: string; organic_id: number | null } | null;
  task: { id: string; status: string; sprint_id: string | null } | null;
}) {
  vi.resetModules();
  vi.doMock('@/lib/supabase/server', () => {
    const eqChain = (final: unknown) => ({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(final),
      single: vi.fn().mockResolvedValue(final),
    });
    const from = vi.fn((table: string) => {
      if (table === 'user_profiles')
        return {
          select: vi
            .fn()
            .mockReturnValue(eqChain({ data: opts.profile, error: opts.profile ? null : { message: 'not found' } })),
        };
      if (table === 'tasks')
        return {
          select: vi
            .fn()
            .mockReturnValue(eqChain({ data: opts.task, error: opts.task ? null : { message: 'not found' } })),
        };
      return {
        select: vi.fn().mockReturnValue(eqChain({ data: null, error: null })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
      };
    });
    return {
      createClient: vi.fn(async () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user }, error: opts.user ? null : { message: 'no session' } }) },
        from,
      })),
    };
  });
}

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/tasks/t-1/vote'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Security: POST /api/tasks/[id]/vote', () => {
  it('rejects anonymous users (401)', async () => {
    setupMock({ user: null, profile: null, task: null });
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }), { params: Promise.resolve({ id: 't-1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects users without organic_id (403)', async () => {
    setupMock({
      user: { id: 'u-1' },
      profile: { id: 'u-1', organic_id: null },
      task: { id: 't-1', status: 'backlog', sprint_id: null },
    });
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }), { params: Promise.resolve({ id: 't-1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects votes on non-backlog tasks (409)', async () => {
    setupMock({
      user: { id: 'u-1' },
      profile: { id: 'u-1', organic_id: 7 },
      task: { id: 't-1', status: 'in_progress', sprint_id: 's-1' },
    });
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }), { params: Promise.resolve({ id: 't-1' }) });
    expect(res.status).toBe(409);
  });

  it('rejects votes on tasks already assigned to a sprint (409)', async () => {
    setupMock({
      user: { id: 'u-1' },
      profile: { id: 'u-1', organic_id: 7 },
      task: { id: 't-1', status: 'backlog', sprint_id: 's-1' },
    });
    const { POST } = await import('@/app/api/tasks/[id]/vote/route');
    const res = await POST(jsonRequest({ value: 'up' }), { params: Promise.resolve({ id: 't-1' }) });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 6: Run security test**

Run: `npx vitest run tests/security/backlog-vote-authz.test.ts`
Expected: PASS, 4 assertions.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/tasks/[id]/vote/route.ts tests/features/backlog/api-tasks-vote.test.ts tests/security/backlog-vote-authz.test.ts
git commit -m "feat(api): add backlog vote endpoint with organic_id gate"
```

---

### Task 4: `BacklogVoteControl` component + hook + tasks-list integration

**Files:**
- Create: `src/features/backlog/hooks.ts`
- Create: `src/components/backlog/BacklogVoteControl.tsx`
- Modify: `src/components/tasks/task-list-section.tsx`

- [ ] **Step 1: Implement the hook**

```ts
// src/features/backlog/hooks.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type BacklogVoteResponse = {
  task_id: string;
  upvotes: number;
  downvotes: number;
  my_vote: -1 | 0 | 1;
};

export function useBacklogVote(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: 'up' | 'down' | 'none') => {
      const res = await fetchJson<{ data: BacklogVoteResponse; error: string | null }>(
        `/api/tasks/${taskId}/vote`,
        { method: 'POST', body: JSON.stringify({ value }) },
      );
      if (!res || res.error) throw new Error(res?.error ?? 'Vote failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['backlog'] });
    },
  });
}

export function useTopBacklogCandidates(sprintId: string) {
  // Used by StewardPromotePanel — see Task 8.
  return {
    sprintId,
  };
}
```

- [ ] **Step 2: Implement `BacklogVoteControl`**

```tsx
// src/components/backlog/BacklogVoteControl.tsx
'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBacklogVote } from '@/features/backlog/hooks';

interface BacklogVoteControlProps {
  taskId: string;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  canVote: boolean; // user has organic_id
}

export function BacklogVoteControl({
  taskId,
  upvotes,
  downvotes,
  myVote,
  canVote,
}: BacklogVoteControlProps) {
  const [optimistic, setOptimistic] = useState<{ up: number; down: number; my: -1 | 0 | 1 }>({
    up: upvotes,
    down: downvotes,
    my: myVote,
  });
  const mutation = useBacklogVote(taskId);

  const score = optimistic.up - optimistic.down;

  function applyOptimistic(next: 'up' | 'down' | 'none') {
    const prev = optimistic;
    let { up, down, my } = prev;
    // revert old
    if (my === 1) up -= 1;
    if (my === -1) down -= 1;
    // apply new
    if (next === 'up') {
      up += 1;
      my = 1;
    } else if (next === 'down') {
      down += 1;
      my = -1;
    } else {
      my = 0;
    }
    setOptimistic({ up, down, my });
    mutation.mutate(next, {
      onError: () => setOptimistic(prev), // rollback
      onSuccess: (data) => setOptimistic({ up: data.upvotes, down: data.downvotes, my: data.my_vote }),
    });
  }

  function onUp() {
    if (!canVote) return;
    applyOptimistic(optimistic.my === 1 ? 'none' : 'up');
  }
  function onDown() {
    if (!canVote) return;
    applyOptimistic(optimistic.my === -1 ? 'none' : 'down');
  }

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <button
        type="button"
        aria-label="Upvote task"
        aria-pressed={optimistic.my === 1}
        disabled={!canVote || mutation.isPending}
        onClick={onUp}
        className={cn(
          'rounded p-1 hover:bg-muted disabled:opacity-50',
          optimistic.my === 1 && 'text-emerald-500',
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <span className="text-sm tabular-nums" aria-label={`Score ${score}`}>
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote task"
        aria-pressed={optimistic.my === -1}
        disabled={!canVote || mutation.isPending}
        onClick={onDown}
        className={cn(
          'rounded p-1 hover:bg-muted disabled:opacity-50',
          optimistic.my === -1 && 'text-rose-500',
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Integrate the control into the backlog tab of the tasks list**

Read `src/components/tasks/task-list-section.tsx` to locate the backlog row render block. Add an import for `BacklogVoteControl` and render it leading-left on each task row where `tab === 'backlog'` and `task.status === 'backlog'`. Pass `task.upvotes ?? 0`, `task.downvotes ?? 0`, the current user's vote (derived from a `my_backlog_votes` map already in scope; if not present, fetch via a parallel query and add it in this task's commit), and `canVote = currentUser.organic_id !== null`.

Concretely, in the JSX where each backlog row is rendered:

```tsx
{tab === 'backlog' && task.status === 'backlog' && (
  <BacklogVoteControl
    taskId={task.id}
    upvotes={task.upvotes ?? 0}
    downvotes={task.downvotes ?? 0}
    myVote={(myVotes?.[task.id] ?? 0) as -1 | 0 | 1}
    canVote={!!currentProfile?.organic_id}
  />
)}
```

If `task-list-section.tsx` does not already query the user's votes, add a small TanStack query above the render: fetch `/api/tasks/backlog-votes/me` (or extend the existing tasks-list query to include the relation). To keep this task scoped, prefer adding a separate hook `useMyBacklogVotes()` in `src/features/backlog/hooks.ts` that calls `supabase.from('backlog_votes').select('task_id, value').eq('user_id', user.id)` and returns a `Record<string, -1|1>` map.

```ts
// add to src/features/backlog/hooks.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function useMyBacklogVotes() {
  return useQuery({
    queryKey: ['backlog', 'my-votes'],
    queryFn: async (): Promise<Record<string, -1 | 1>> => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase
        .from('backlog_votes')
        .select('task_id, value')
        .eq('user_id', user.id);
      const map: Record<string, -1 | 1> = {};
      for (const row of data ?? []) map[row.task_id] = row.value as -1 | 1;
      return map;
    },
  });
}
```

If the project's browser client factory is named differently, run `grep -n "createBrowserClient\|createSupabaseBrowserClient" src/lib/supabase/` and use the existing export.

- [ ] **Step 4: Manual UI smoke check**

Run: `npm run dev`
Open `http://localhost:3000/tasks?tab=backlog` while logged in as the test admin (`claude-test@organic-dao.dev` / `OrganicTest2026!`).
Expected: Each backlog task shows up/down arrows with a numeric score. Clicking up turns the arrow emerald and increments score. Clicking it again clears.

- [ ] **Step 5: Commit**

```bash
git add src/features/backlog/hooks.ts src/components/backlog/BacklogVoteControl.tsx src/components/tasks/task-list-section.tsx
git commit -m "feat(ui): add BacklogVoteControl on backlog task rows"
```

---

## Phase 2 — Steward Layer (D1a heuristic)

### Task 5: Migration — `task_steward_reviews` + `pg_trgm` extension

**Files:**
- Create: `supabase/migrations/20260514000002_steward_reviews.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260514000002_steward_reviews.sql
-- Sprint task D1: Steward review cache table.

-- 1) Trigram extension for duplicate detection (no-op if already present).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) task_steward_reviews
CREATE TABLE IF NOT EXISTS public.task_steward_reviews (
  task_id        uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  summary        text NOT NULL,
  clarity_score  smallint NOT NULL,
  scope_score    smallint NOT NULL,
  concerns       jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text NOT NULL,
  generated_by   text NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tsr_clarity_check CHECK (clarity_score BETWEEN 1 AND 5),
  CONSTRAINT tsr_scope_check   CHECK (scope_score   BETWEEN 1 AND 5),
  CONSTRAINT tsr_recommendation_check CHECK (recommendation IN ('promote','flag','reject'))
);

-- 3) RLS — select to any authenticated user; writes service-role only.
ALTER TABLE public.task_steward_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "steward_reviews_select_authenticated" ON public.task_steward_reviews;
CREATE POLICY "steward_reviews_select_authenticated"
  ON public.task_steward_reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE policies — only service role can write.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260514000002_steward_reviews.sql
git commit -m "feat(db): add task_steward_reviews + pg_trgm extension"
```

---

### Task 6: Steward interface and heuristic implementation

**Files:**
- Create: `src/lib/steward/types.ts`
- Create: `src/lib/steward/heuristics.ts`
- Create: `src/lib/steward/index.ts`
- Test: `tests/features/backlog/heuristics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/features/backlog/heuristics.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeSuggestN,
  scoreTaskClarity,
  scoreTaskScope,
  classifyRecommendation,
  detectConcerns,
} from '@/lib/steward/heuristics';

describe('computeSuggestN', () => {
  it('clamps to minimum of 3 when no active voters', () => {
    expect(computeSuggestN(0)).toBe(3);
  });
  it('clamps to minimum of 3 for small communities', () => {
    expect(computeSuggestN(1)).toBe(3);
    expect(computeSuggestN(5)).toBe(3);
  });
  it('scales linearly between 3 and 15', () => {
    expect(computeSuggestN(25)).toBe(5);
    expect(computeSuggestN(50)).toBe(10);
  });
  it('clamps to maximum of 15 for large communities', () => {
    expect(computeSuggestN(100)).toBe(15);
    expect(computeSuggestN(1000)).toBe(15);
  });
});

describe('scoreTaskClarity', () => {
  it('returns 1 for missing description', () => {
    expect(scoreTaskClarity({ description: null })).toBe(1);
    expect(scoreTaskClarity({ description: '' })).toBe(1);
  });
  it('returns 2 for short descriptions', () => {
    expect(scoreTaskClarity({ description: 'do the thing' })).toBe(2);
  });
  it('returns 4 when description has structure headers', () => {
    const desc = '## WHAT\nBuild a button.\n\n## WHY\nUsers need it.\n\n## HOW\nClick handler.';
    expect(scoreTaskClarity({ description: desc })).toBe(4);
  });
  it('returns 5 when description has structure + acceptance criteria', () => {
    const desc =
      '## WHAT\nBuild a button.\n\n## WHY\nUsers need it.\n\n## Acceptance Criteria\n- Click triggers handler.';
    expect(scoreTaskClarity({ description: desc })).toBe(5);
  });
});

describe('scoreTaskScope', () => {
  it('returns 1 for missing points', () => {
    expect(scoreTaskScope({ points: null, labels: [] })).toBe(1);
  });
  it('returns 5 for clearly bounded small tasks with labels', () => {
    expect(scoreTaskScope({ points: 100, labels: ['frontend', 'small'] })).toBe(5);
  });
  it('returns 2 for very large unscoped tasks', () => {
    expect(scoreTaskScope({ points: 5000, labels: [] })).toBe(2);
  });
});

describe('detectConcerns', () => {
  it('flags missing description', () => {
    const concerns = detectConcerns({ description: null, points: 100, title: 't' }, []);
    expect(concerns).toContain('no_description');
  });
  it('flags unbounded scope', () => {
    const concerns = detectConcerns({ description: 'short', points: 5000, title: 't' }, []);
    expect(concerns).toContain('unbounded_scope');
  });
  it('flags possible duplicates by title trigram similarity', () => {
    const concerns = detectConcerns(
      { description: 'desc', points: 100, title: 'Add backlog voting' },
      [{ id: 'dup-1', title: 'Add backlog vote feature' }],
    );
    expect(concerns.some((c) => c.startsWith('possible_duplicate:'))).toBe(true);
  });
});

describe('classifyRecommendation', () => {
  it('promote when scores >= 3 and no concerns', () => {
    expect(classifyRecommendation(4, 4, [])).toBe('promote');
  });
  it('flag when scores >= 3 with concerns', () => {
    expect(classifyRecommendation(3, 3, ['no_description'])).toBe('flag');
  });
  it('reject when clarity is 1', () => {
    expect(classifyRecommendation(1, 4, [])).toBe('reject');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/backlog/heuristics.test.ts`
Expected: FAIL — module `@/lib/steward/heuristics` not found.

- [ ] **Step 3: Implement types**

```ts
// src/lib/steward/types.ts
export type StewardScore = 1 | 2 | 3 | 4 | 5;
export type StewardRecommendation = 'promote' | 'flag' | 'reject';

export interface StewardReview {
  task_id: string;
  summary: string;
  clarity_score: StewardScore;
  scope_score: StewardScore;
  concerns: string[];
  recommendation: StewardRecommendation;
  generated_by: string;
}

export interface StewardClient {
  suggestN(orgId: string | null): Promise<number>;
  reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]>;
}

export interface BacklogTaskSnapshot {
  id: string;
  title: string;
  description: string | null;
  points: number | null;
  labels: string[];
  org_id: string | null;
}
```

- [ ] **Step 4: Implement the heuristic**

```ts
// src/lib/steward/heuristics.ts
import { createServiceClient } from '@/lib/supabase/server';
import type {
  BacklogTaskSnapshot,
  StewardClient,
  StewardRecommendation,
  StewardReview,
  StewardScore,
} from './types';

const STRUCTURE_HEADERS = ['## WHAT', '## WHY', '## HOW'];
const ACCEPTANCE_PATTERNS = [/acceptance criteria/i, /done when/i];
const DUPLICATE_TRIGRAM_THRESHOLD = 0.5;
const LARGE_SCOPE_POINTS = 1000;
const UNBOUNDED_SCOPE_POINTS = 3000;

export function computeSuggestN(activeVoters: number): number {
  const raw = Math.ceil(activeVoters / 5);
  return Math.min(15, Math.max(3, raw));
}

export function scoreTaskClarity(task: Pick<BacklogTaskSnapshot, 'description'>): StewardScore {
  const desc = task.description?.trim() ?? '';
  if (!desc) return 1;
  if (desc.length < 50) return 2;
  const headersFound = STRUCTURE_HEADERS.filter((h) => desc.toUpperCase().includes(h)).length;
  const hasAcceptance = ACCEPTANCE_PATTERNS.some((p) => p.test(desc));
  if (hasAcceptance && headersFound >= 2) return 5;
  if (headersFound >= 2) return 4;
  if (desc.length >= 200) return 3;
  return 2;
}

export function scoreTaskScope(
  task: Pick<BacklogTaskSnapshot, 'points' | 'labels'>,
): StewardScore {
  if (task.points == null) return 1;
  if (task.points > UNBOUNDED_SCOPE_POINTS) return 2;
  if (task.points > LARGE_SCOPE_POINTS) return 3;
  if (task.labels.length >= 2) return 5;
  if (task.labels.length >= 1) return 4;
  return 3;
}

export function detectConcerns(
  task: { description: string | null; points: number | null; title: string },
  otherBacklogTitles: Array<{ id: string; title: string }>,
): string[] {
  const concerns: string[] = [];
  if (!task.description || task.description.trim().length === 0) concerns.push('no_description');
  if (task.description && !ACCEPTANCE_PATTERNS.some((p) => p.test(task.description!))) {
    concerns.push('missing_acceptance');
  }
  if (task.points && task.points > UNBOUNDED_SCOPE_POINTS) concerns.push('unbounded_scope');

  // Trigram-style duplicate detection (string overlap fallback in TS).
  const aTokens = trigramTokens(task.title);
  for (const other of otherBacklogTitles) {
    if (other.id === (task as { id?: string }).id) continue;
    const sim = trigramSimilarity(aTokens, trigramTokens(other.title));
    if (sim >= DUPLICATE_TRIGRAM_THRESHOLD) {
      concerns.push(`possible_duplicate:${other.id}`);
    }
  }
  return concerns;
}

export function classifyRecommendation(
  clarity: StewardScore,
  scope: StewardScore,
  concerns: string[],
): StewardRecommendation {
  if (clarity === 1) return 'reject';
  if (clarity >= 3 && scope >= 3 && concerns.length === 0) return 'promote';
  if (clarity >= 2 && scope >= 2) return 'flag';
  return 'reject';
}

function trigramTokens(text: string): Set<string> {
  const normalized = `  ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}  `;
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    set.add(normalized.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function makeSummary(task: BacklogTaskSnapshot): string {
  const desc = (task.description ?? '').replace(/\s+/g, ' ').trim();
  const base = desc ? desc.slice(0, 180) : task.title;
  return base.length === 180 ? `${base}...` : base;
}

export class HeuristicSteward implements StewardClient {
  readonly tag = 'heuristic-v1';

  async suggestN(orgId: string | null): Promise<number> {
    const service = createServiceClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let query = service
      .from('backlog_votes')
      .select('user_id, tasks!inner(org_id)', { count: 'exact', head: false })
      .gte('created_at', since);
    if (orgId) query = query.eq('tasks.org_id', orgId);
    const { data, error } = await query;
    if (error) return 3;
    const unique = new Set((data ?? []).map((row: { user_id: string }) => row.user_id));
    return computeSuggestN(unique.size);
  }

  async reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]> {
    if (taskIds.length === 0) return [];
    const service = createServiceClient();

    const { data: tasks, error } = await service
      .from('tasks')
      .select('id, org_id, title, description, points, labels')
      .in('id', taskIds);
    if (error || !tasks) return [];

    // Fetch sibling backlog titles for duplicate detection.
    const { data: siblings } = await service
      .from('tasks')
      .select('id, title')
      .eq('status', 'backlog')
      .is('sprint_id', null);

    const reviews: StewardReview[] = [];
    for (const t of tasks) {
      const snapshot: BacklogTaskSnapshot = {
        id: t.id,
        title: t.title ?? '',
        description: t.description ?? null,
        points: t.points ?? null,
        labels: (t.labels as string[] | null) ?? [],
        org_id: t.org_id ?? null,
      };
      const clarity = scoreTaskClarity(snapshot);
      const scope = scoreTaskScope(snapshot);
      const concerns = detectConcerns(
        { description: snapshot.description, points: snapshot.points, title: snapshot.title },
        (siblings ?? []).filter((s: { id: string }) => s.id !== snapshot.id),
      );
      const recommendation = classifyRecommendation(clarity, scope, concerns);
      const review: StewardReview = {
        task_id: snapshot.id,
        summary: makeSummary(snapshot),
        clarity_score: clarity,
        scope_score: scope,
        concerns,
        recommendation,
        generated_by: this.tag,
      };
      reviews.push(review);
    }

    // Upsert into cache (service-role required because RLS forbids non-service writes).
    await service.from('task_steward_reviews').upsert(
      reviews.map((r) => ({
        task_id: r.task_id,
        summary: r.summary,
        clarity_score: r.clarity_score,
        scope_score: r.scope_score,
        concerns: r.concerns,
        recommendation: r.recommendation,
        generated_by: r.generated_by,
        generated_at: new Date().toISOString(),
      })),
      { onConflict: 'task_id' },
    );

    return reviews;
  }
}
```

- [ ] **Step 5: Implement the selector**

```ts
// src/lib/steward/index.ts
import { HeuristicSteward } from './heuristics';
import type { StewardClient } from './types';

export type { StewardClient, StewardReview, StewardScore, StewardRecommendation } from './types';

export function getStewardClient(): StewardClient {
  const backend = process.env.STEWARD_BACKEND ?? 'heuristic';
  if (backend === 'llm') {
    // Lazy import so the LLM module (and its anthropic deps) doesn't load when unused.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LlmSteward } = require('./llm') as typeof import('./llm');
    return new LlmSteward();
  }
  return new HeuristicSteward();
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/features/backlog/heuristics.test.ts`
Expected: PASS, all assertions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/steward/ tests/features/backlog/heuristics.test.ts
git commit -m "feat(steward): add heuristic Steward client + interface"
```

---

### Task 7: Migration — promote RPCs

**Files:**
- Create: `supabase/migrations/20260514000001_sprint_promote_rpcs.sql`

Note: filename timestamp `20260514000001` sequences this migration between the votes migration (`000000`) and the steward migration (`000002`) so migrations apply in dependency order regardless of git merge order (see memory: [feedback_migration_timestamp_ordering]).

- [ ] **Step 1: Write the migration**

```sql
-- 20260514000001_sprint_promote_rpcs.sql
-- Sprint task D1: RPCs for promoting top backlog candidates into a sprint.

-- 1) suggest_promote_n — clamp(ceil(active_voters/5), 3, 15)
CREATE OR REPLACE FUNCTION public.suggest_promote_n(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(DISTINCT bv.user_id)
    INTO active_count
    FROM public.backlog_votes bv
    JOIN public.tasks t ON t.id = bv.task_id
   WHERE bv.created_at > now() - interval '30 days'
     AND (p_org_id IS NULL OR t.org_id = p_org_id);

  RETURN LEAST(15, GREATEST(3, CEIL(COALESCE(active_count, 0) / 5.0)::int));
END;
$$;

-- 2) get_top_backlog_candidates — returns ranked top-N
CREATE OR REPLACE FUNCTION public.get_top_backlog_candidates(p_org_id uuid, p_limit integer)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  points integer,
  upvotes integer,
  downvotes integer,
  score integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.description,
    t.points,
    t.upvotes,
    t.downvotes,
    (t.upvotes - t.downvotes) AS score
  FROM public.tasks t
  WHERE t.status = 'backlog'
    AND t.sprint_id IS NULL
    AND (p_org_id IS NULL OR t.org_id = p_org_id)
  ORDER BY (t.upvotes - t.downvotes) DESC, t.created_at ASC
  LIMIT GREATEST(p_limit, 0);
$$;

-- 3) promote_top_backlog_to_sprint — idempotent: only touches backlog rows
CREATE OR REPLACE FUNCTION public.promote_top_backlog_to_sprint(p_sprint_id uuid, p_n integer)
RETURNS TABLE (promoted_task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_sprint_status sprint_status;
BEGIN
  SELECT s.org_id, s.status INTO v_org_id, v_sprint_status
    FROM public.sprints s
   WHERE s.id = p_sprint_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sprint % not found', p_sprint_id;
  END IF;
  IF v_sprint_status <> 'planning' THEN
    RAISE EXCEPTION 'Sprint % is not in planning status (got %)', p_sprint_id, v_sprint_status;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT t.id
      FROM public.tasks t
     WHERE t.status = 'backlog'
       AND t.sprint_id IS NULL
       AND t.org_id = v_org_id
     ORDER BY (t.upvotes - t.downvotes) DESC, t.created_at ASC
     LIMIT GREATEST(p_n, 0)
  ),
  promoted AS (
    UPDATE public.tasks t
       SET sprint_id = p_sprint_id,
           status = 'todo',
           updated_at = now()
      FROM ranked
     WHERE t.id = ranked.id
    RETURNING t.id
  )
  SELECT p.id FROM promoted p;
END;
$$;

-- 4) Grants
GRANT EXECUTE ON FUNCTION public.suggest_promote_n(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_backlog_candidates(uuid, integer) TO authenticated, service_role;
-- promote restricted: only service_role (API guards with admin/council before calling).
GRANT EXECUTE ON FUNCTION public.promote_top_backlog_to_sprint(uuid, integer) TO service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260514000001_sprint_promote_rpcs.sql
git commit -m "feat(db): add sprint promotion RPCs"
```

---

## Phase 3 — Council Promotion Layer

### Task 8: Promote API + Steward refresh API

**Files:**
- Create: `src/app/api/admin/sprints/[id]/promote-backlog/route.ts`
- Create: `src/app/api/admin/steward/review-backlog/route.ts`
- Test: `tests/features/backlog/api-admin-promote-backlog.test.ts`
- Test: `tests/security/admin-promote-backlog-authz.test.ts`

- [ ] **Step 1: Write the promote API test**

```ts
// tests/features/backlog/api-admin-promote-backlog.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => {
  const rpcSpy = vi.fn().mockResolvedValue({
    data: [{ promoted_task_id: 't-1' }, { promoted_task_id: 't-2' }],
    error: null,
  });
  const eqChain = (final: unknown) => ({
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(final),
    single: vi.fn().mockResolvedValue(final),
  });
  const from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue(eqChain({ data: { role: 'admin' }, error: null })),
      };
    }
    if (table === 'sprints') {
      return {
        select: vi.fn().mockReturnValue(eqChain({ data: { id: 's-1', status: 'planning' }, error: null })),
      };
    }
    return { select: vi.fn().mockReturnValue(eqChain({ data: null, error: null })) };
  });
  return {
    createClient: vi.fn(async () => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
      from,
    })),
    createServiceClient: vi.fn(() => ({ from, rpc: rpcSpy })),
    __rpcSpy: rpcSpy,
  };
});

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/admin/sprints/s-1/promote-backlog'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/sprints/[id]/promote-backlog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 on invalid n', async () => {
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest({ n: 0 }), { params: Promise.resolve({ id: 's-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns the promoted task ids', async () => {
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest({ n: 2 }), { params: Promise.resolve({ id: 's-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.promoted_task_ids).toEqual(['t-1', 't-2']);
    expect(json.data.n_actually_promoted).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/backlog/api-admin-promote-backlog.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement promote route**

```ts
// src/app/api/admin/sprints/[id]/promote-backlog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { promoteBacklogSchema } from '@/features/backlog/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sprintId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'backlog:promote', RATE_LIMITS.sensitive);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !isAdminOrCouncil(profile.role)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ data: null, error: parsedBody.error }, { status: 400 });
    }
    const parsed = promoteBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }

    const { data: sprint } = await supabase
      .from('sprints')
      .select('id, status')
      .eq('id', sprintId)
      .single();
    if (!sprint) {
      return NextResponse.json({ data: null, error: 'Sprint not found' }, { status: 404 });
    }
    if (sprint.status !== 'planning') {
      return NextResponse.json(
        { data: null, error: 'Sprint is not in planning status' },
        { status: 409 },
      );
    }

    const service = createServiceClient();
    const { data: promoted, error: rpcError } = await service.rpc(
      'promote_top_backlog_to_sprint',
      { p_sprint_id: sprintId, p_n: parsed.data.n },
    );
    if (rpcError) {
      logger.error('promote_top_backlog_to_sprint failed', rpcError);
      return NextResponse.json({ data: null, error: 'Failed to promote tasks' }, { status: 500 });
    }

    const ids = (promoted ?? []).map((r: { promoted_task_id: string }) => r.promoted_task_id);
    return NextResponse.json({
      data: { promoted_task_ids: ids, n_actually_promoted: ids.length },
      error: null,
    });
  } catch (error) {
    logger.error('promote-backlog route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement steward review route**

```ts
// src/app/api/admin/steward/review-backlog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { reviewBacklogSchema } from '@/features/backlog/schemas';
import { isAdminOrCouncil } from '@/features/ideas/server';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getStewardClient } from '@/lib/steward';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'steward:review', RATE_LIMITS.sensitive);
    if (rateLimited) return rateLimited;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !isAdminOrCouncil(profile.role)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ data: null, error: parsedBody.error }, { status: 400 });
    }
    const parsed = reviewBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }

    const client = getStewardClient();
    const reviews = await client.reviewBacklogCandidates(parsed.data.task_ids);
    return NextResponse.json({ data: { reviews }, error: null });
  } catch (error) {
    logger.error('review-backlog route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run promote test to verify it passes**

Run: `npx vitest run tests/features/backlog/api-admin-promote-backlog.test.ts`
Expected: PASS, 2 assertions.

- [ ] **Step 6: Write the security test**

```ts
// tests/security/admin-promote-backlog-authz.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

function setupMock(opts: {
  user: { id: string } | null;
  profile: { id: string; role: string } | null;
  sprint: { id: string; status: string } | null;
}) {
  vi.resetModules();
  vi.doMock('@/lib/supabase/server', () => {
    const eqChain = (final: unknown) => ({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(final),
      single: vi.fn().mockResolvedValue(final),
    });
    const from = vi.fn((table: string) => {
      if (table === 'user_profiles')
        return { select: vi.fn().mockReturnValue(eqChain({ data: opts.profile, error: null })) };
      if (table === 'sprints')
        return { select: vi.fn().mockReturnValue(eqChain({ data: opts.sprint, error: null })) };
      return { select: vi.fn().mockReturnValue(eqChain({ data: null, error: null })) };
    });
    return {
      createClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: opts.user }, error: opts.user ? null : { message: 'no session' } }),
        },
        from,
      })),
      createServiceClient: vi.fn(() => ({
        from,
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    };
  });
}

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Security: admin promote/review endpoints', () => {
  it('promote: rejects anonymous (401)', async () => {
    setupMock({ user: null, profile: null, sprint: null });
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }), {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('promote: rejects members (403)', async () => {
    setupMock({
      user: { id: 'm-1' },
      profile: { id: 'm-1', role: 'member' },
      sprint: { id: 's-1', status: 'planning' },
    });
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }), {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('promote: rejects non-planning sprints (409)', async () => {
    setupMock({
      user: { id: 'a-1' },
      profile: { id: 'a-1', role: 'admin' },
      sprint: { id: 's-1', status: 'active' },
    });
    const { POST } = await import('@/app/api/admin/sprints/[id]/promote-backlog/route');
    const res = await POST(jsonRequest('/api/admin/sprints/s-1/promote-backlog', { n: 5 }), {
      params: Promise.resolve({ id: 's-1' }),
    });
    expect(res.status).toBe(409);
  });

  it('review: rejects members (403)', async () => {
    setupMock({
      user: { id: 'm-1' },
      profile: { id: 'm-1', role: 'member' },
      sprint: null,
    });
    const { POST } = await import('@/app/api/admin/steward/review-backlog/route');
    const res = await POST(
      jsonRequest('/api/admin/steward/review-backlog', {
        task_ids: ['11111111-1111-1111-1111-111111111111'],
      }),
    );
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 7: Run security test to verify it passes**

Run: `npx vitest run tests/security/admin-promote-backlog-authz.test.ts`
Expected: PASS, 4 assertions.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/ tests/features/backlog/api-admin-promote-backlog.test.ts tests/security/admin-promote-backlog-authz.test.ts
git commit -m "feat(api): add admin promote-backlog + steward review routes"
```

---

### Task 9: `StewardPromotePanel` component + sprint page integration

**Files:**
- Modify: `src/features/backlog/hooks.ts` (add data hooks)
- Create: `src/components/backlog/StewardPromotePanel.tsx`
- Modify: `src/app/[locale]/sprints/[id]/page.tsx`

- [ ] **Step 1: Add data hooks**

Append to `src/features/backlog/hooks.ts`:

```ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type BacklogCandidate = {
  id: string;
  title: string;
  description: string | null;
  points: number | null;
  upvotes: number;
  downvotes: number;
  score: number;
};

export type StewardReviewClient = {
  task_id: string;
  summary: string;
  clarity_score: 1 | 2 | 3 | 4 | 5;
  scope_score: 1 | 2 | 3 | 4 | 5;
  concerns: string[];
  recommendation: 'promote' | 'flag' | 'reject';
  generated_by: string;
};

export function useSuggestedN(orgId: string | null) {
  return useQuery({
    queryKey: ['backlog', 'suggest-n', orgId],
    queryFn: async (): Promise<number> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('suggest_promote_n', { p_org_id: orgId });
      if (error) return 3;
      return data ?? 3;
    },
  });
}

export function useTopCandidates(orgId: string | null, n: number) {
  return useQuery({
    queryKey: ['backlog', 'top', orgId, n],
    queryFn: async (): Promise<BacklogCandidate[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_top_backlog_candidates', {
        p_org_id: orgId,
        p_limit: n,
      });
      if (error || !data) return [];
      return data as BacklogCandidate[];
    },
  });
}

export function useStewardReviews(taskIds: string[]) {
  return useQuery({
    queryKey: ['steward', 'reviews', taskIds.join(',')],
    enabled: taskIds.length > 0,
    queryFn: async (): Promise<Record<string, StewardReviewClient>> => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('task_steward_reviews')
        .select('*')
        .in('task_id', taskIds);
      const map: Record<string, StewardReviewClient> = {};
      for (const row of (data ?? []) as StewardReviewClient[]) map[row.task_id] = row;
      return map;
    },
  });
}

export function useRefreshSteward() {
  return useMutation({
    mutationFn: async (vars: { taskIds: string[]; force?: boolean }) => {
      const res = await fetchJson<{ data: { reviews: StewardReviewClient[] }; error: string | null }>(
        `/api/admin/steward/review-backlog`,
        {
          method: 'POST',
          body: JSON.stringify({ task_ids: vars.taskIds, force: vars.force ?? false }),
        },
      );
      if (!res || res.error) throw new Error(res?.error ?? 'Refresh failed');
      return res.data.reviews;
    },
  });
}

export function usePromoteBacklog(sprintId: string) {
  return useMutation({
    mutationFn: async (n: number) => {
      const res = await fetchJson<{
        data: { promoted_task_ids: string[]; n_actually_promoted: number };
        error: string | null;
      }>(`/api/admin/sprints/${sprintId}/promote-backlog`, {
        method: 'POST',
        body: JSON.stringify({ n }),
      });
      if (!res || res.error) throw new Error(res?.error ?? 'Promotion failed');
      return res.data;
    },
  });
}
```

If `@/lib/supabase/client` does not export `createSupabaseBrowserClient`, run `grep -n "export" src/lib/supabase/client.ts` and use the actual export name.

- [ ] **Step 2: Implement `StewardPromotePanel`**

```tsx
// src/components/backlog/StewardPromotePanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSuggestedN,
  useTopCandidates,
  useStewardReviews,
  useRefreshSteward,
  usePromoteBacklog,
} from '@/features/backlog/hooks';

interface StewardPromotePanelProps {
  sprintId: string;
  orgId: string | null;
}

export function StewardPromotePanel({ sprintId, orgId }: StewardPromotePanelProps) {
  const suggested = useSuggestedN(orgId);
  const [n, setN] = useState<number>(3);
  useEffect(() => {
    if (suggested.data && n === 3) setN(suggested.data);
  }, [suggested.data, n]);

  const candidates = useTopCandidates(orgId, n);
  const taskIds = (candidates.data ?? []).map((c) => c.id);
  const reviews = useStewardReviews(taskIds);
  const refresh = useRefreshSteward();
  const promote = usePromoteBacklog(sprintId);

  function onRefresh() {
    if (taskIds.length === 0) return;
    refresh.mutate(
      { taskIds, force: true },
      { onSuccess: () => reviews.refetch() },
    );
  }

  function onPromote() {
    promote.mutate(n, { onSuccess: () => candidates.refetch() });
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Steward suggestion</h2>
          <p className="text-sm text-muted-foreground">
            Promoting the top backlog items by net votes.
            {suggested.data ? ` Suggested N: ${suggested.data}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">N</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(Math.min(50, Math.max(1, Number(e.target.value || 1))))}
            className="w-20"
          />
          <Button onClick={onRefresh} disabled={refresh.isPending} variant="outline" size="sm">
            {refresh.isPending ? 'Refreshing...' : 'Regenerate review'}
          </Button>
          <Button onClick={onPromote} disabled={promote.isPending || taskIds.length === 0} size="sm">
            {promote.isPending ? 'Promoting...' : `Promote top ${n}`}
          </Button>
        </div>
      </header>

      <ul className="space-y-2">
        {(candidates.data ?? []).map((c) => {
          const rv = reviews.data?.[c.id];
          return (
            <li key={c.id} className="flex items-start gap-3 rounded border p-2">
              <div className="w-12 text-center text-sm tabular-nums">{c.score}</div>
              <div className="flex-1">
                <a href={`/tasks/${c.id}`} className="font-medium hover:underline">
                  {c.title}
                </a>
                {rv && (
                  <div className="mt-1 text-xs text-muted-foreground" title={rv.concerns.join(', ')}>
                    clarity {'★'.repeat(rv.clarity_score)}{'☆'.repeat(5 - rv.clarity_score)} •{' '}
                    scope {'★'.repeat(rv.scope_score)}{'☆'.repeat(5 - rv.scope_score)} •{' '}
                    rec: <span className="font-medium">{rv.recommendation}</span>
                    {rv.concerns.length > 0 && (
                      <span> • {rv.concerns.length} concern{rv.concerns.length === 1 ? '' : 's'}</span>
                    )}
                  </div>
                )}
                {!rv && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    No review yet — click "Regenerate review"
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

If the project's `Input`/`Button` paths differ, run `grep -n "from '@/components/ui/" src/components/tasks/*.tsx | head -10` and use the actual paths.

- [ ] **Step 3: Render the panel on the sprint page**

Read `src/app/[locale]/sprints/[id]/page.tsx`. Import `StewardPromotePanel` and render it when `sprint.status === 'planning'` and the current user is admin/council. Get `orgId` from the sprint row.

```tsx
// near the existing planning UI block:
import { StewardPromotePanel } from '@/components/backlog/StewardPromotePanel';
import { isAdminOrCouncil } from '@/features/ideas/server';

// ...inside the render, where the planning section lives:
{sprint.status === 'planning' && isAdminOrCouncil(profile?.role) && (
  <StewardPromotePanel sprintId={sprint.id} orgId={sprint.org_id ?? null} />
)}
```

If the page is a Server Component and cannot import the client panel directly, render it through an existing client island wrapper, or convert that block to a client component. Inspect the file first; do not change the rendering model unnecessarily.

- [ ] **Step 4: Manual UI smoke**

Run: `npm run dev`
Open a sprint in planning status as admin. Confirm panel appears, shows suggested N, top candidates, and that "Regenerate review" then "Promote top N" works end-to-end against the dev DB.

- [ ] **Step 5: Commit**

```bash
git add src/features/backlog/hooks.ts src/components/backlog/StewardPromotePanel.tsx src/app/[locale]/sprints/[id]/page.tsx
git commit -m "feat(ui): add StewardPromotePanel on sprint planning page"
```

---

## Phase 4 — D1b: LLM swap (same PR)

### Task 10: Add LLM Steward implementation behind env flag

**Files:**
- Create: `src/lib/steward/llm.ts`
- Modify: `.env.example`

- [ ] **Step 1: Implement the LLM Steward**

```ts
// src/lib/steward/llm.ts
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { HeuristicSteward } from './heuristics';
import type {
  BacklogTaskSnapshot,
  StewardClient,
  StewardRecommendation,
  StewardReview,
  StewardScore,
} from './types';

const MODEL = process.env.STEWARD_LLM_MODEL ?? 'claude-haiku-4-5-20251001';

const PROMPT = `You are the Steward for a DAO backlog. For each task, return a strict JSON object:
{
  "summary": string (<= 180 chars, plain text),
  "clarity_score": 1-5 (1=missing/unclear, 5=fully structured WHAT/WHY/HOW + acceptance criteria),
  "scope_score": 1-5 (1=unbounded/no points, 5=clearly bounded with labels and points <= 1000),
  "concerns": string[] (from: "no_description", "missing_acceptance", "unbounded_scope", or "possible_duplicate:<task_id>"),
  "recommendation": "promote" | "flag" | "reject"
}
Output ONLY a JSON array, one object per task, in the same order as the input. No prose.`;

function safeParseScore(n: unknown): StewardScore {
  const v = Math.round(Number(n));
  if (v >= 1 && v <= 5) return v as StewardScore;
  return 3;
}

function safeRecommendation(r: unknown): StewardRecommendation {
  if (r === 'promote' || r === 'flag' || r === 'reject') return r;
  return 'flag';
}

export class LlmSteward implements StewardClient {
  readonly tag = `llm-${MODEL}`;
  private readonly fallback = new HeuristicSteward();
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async suggestN(orgId: string | null): Promise<number> {
    // suggestN remains heuristic — based on activity, not LLM judgment.
    return this.fallback.suggestN(orgId);
  }

  async reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]> {
    if (!this.client || taskIds.length === 0) {
      return this.fallback.reviewBacklogCandidates(taskIds);
    }

    const service = createServiceClient();
    const { data: tasks, error } = await service
      .from('tasks')
      .select('id, org_id, title, description, points, labels')
      .in('id', taskIds);
    if (error || !tasks || tasks.length === 0) {
      return this.fallback.reviewBacklogCandidates(taskIds);
    }

    const snapshots: BacklogTaskSnapshot[] = tasks.map((t) => ({
      id: t.id,
      title: t.title ?? '',
      description: t.description ?? null,
      points: t.points ?? null,
      labels: (t.labels as string[] | null) ?? [],
      org_id: t.org_id ?? null,
    }));

    try {
      const completion = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(
              snapshots.map((s) => ({
                id: s.id,
                title: s.title,
                description: s.description,
                points: s.points,
                labels: s.labels,
              })),
            ),
          },
        ],
      });

      const text = completion.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      const payload = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : '[]';
      const parsed = JSON.parse(payload) as Array<Record<string, unknown>>;

      const reviews: StewardReview[] = snapshots.map((s, i) => {
        const r = parsed[i] ?? {};
        return {
          task_id: s.id,
          summary: typeof r.summary === 'string' ? r.summary.slice(0, 200) : s.title,
          clarity_score: safeParseScore(r.clarity_score),
          scope_score: safeParseScore(r.scope_score),
          concerns: Array.isArray(r.concerns) ? r.concerns.filter((c): c is string => typeof c === 'string') : [],
          recommendation: safeRecommendation(r.recommendation),
          generated_by: this.tag,
        };
      });

      await service.from('task_steward_reviews').upsert(
        reviews.map((r) => ({
          task_id: r.task_id,
          summary: r.summary,
          clarity_score: r.clarity_score,
          scope_score: r.scope_score,
          concerns: r.concerns,
          recommendation: r.recommendation,
          generated_by: r.generated_by,
          generated_at: new Date().toISOString(),
        })),
        { onConflict: 'task_id' },
      );

      return reviews;
    } catch {
      // Any LLM error → fall back to heuristic and log.
      return this.fallback.reviewBacklogCandidates(taskIds);
    }
  }
}
```

- [ ] **Step 2: Document the env flag**

Append to `.env.example`:

```env
# Steward backend: 'heuristic' (default) or 'llm' (requires ANTHROPIC_API_KEY)
STEWARD_BACKEND=heuristic
# Optional override of the LLM model id when STEWARD_BACKEND=llm
STEWARD_LLM_MODEL=claude-haiku-4-5-20251001
```

- [ ] **Step 3: Sanity check the build picks up the dynamic require**

Run: `npm run build`
Expected: Build succeeds. If `require('./llm')` triggers a "module not found" at build time, change the loader in `src/lib/steward/index.ts` to:

```ts
const mod = await import('./llm');
return new mod.LlmSteward();
```

…and convert `getStewardClient` to async. Update both API routes that call it (`await getStewardClient()`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/steward/llm.ts src/lib/steward/index.ts .env.example
git commit -m "feat(steward): add LLM-backed Steward client behind env flag"
```

---

## Phase 5 — Final validation

### Task 11: Full test + build sweep

- [ ] **Step 1: Run all new tests together**

Run:
```bash
npx vitest run tests/features/backlog/ tests/security/backlog-vote-authz.test.ts tests/security/admin-promote-backlog-authz.test.ts
```
Expected: ALL PASS (schemas: 8, vote API: 2, promote API: 2, security vote: 4, security admin: 4, heuristics: ~14 — ~34 total).

- [ ] **Step 2: Run the full security suite to catch regressions**

Run: `npx vitest run tests/security/`
Expected: No regressions (existing suite passes; only the two new files add coverage).

- [ ] **Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: 0 errors. Address any new warnings introduced by this PR.

- [ ] **Step 4: Manual verification against the spec §11 plan**

Boot dev (`npm run dev`), log in as `claude-test@organic-dao.dev`, and run through spec §11 steps 1–9 manually. Capture any issues, fix them, and re-run vitest + build.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore(backlog): fix lint and address review pass"
```

(If nothing to commit, skip.)

---

### Task 12: Push and open PR

- [ ] **Step 1: Push the branch**

Run: `git push -u origin phase/sprint-task-voting-d1`

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --title "feat(sprint-d1): backlog voting + Steward review" --body "$(cat <<'EOF'
## Summary
- Replaces the manual "Backlog priority voting" admin task with continuous 1p1v voting on backlog tasks.
- Adds a Steward layer (heuristic v1, LLM v2 swap-ready) that suggests how many backlog items to promote into each new sprint and annotates each candidate.
- Council promotes the top-N with one click; idempotent and undoable in-place.

Implements `docs/superpowers/specs/2026-05-14-sprint-task-voting-design.md` (D1a + D1b shipped together per spec §9).

## Test plan
- [x] `npx vitest run tests/features/backlog/ tests/security/backlog-vote-authz.test.ts tests/security/admin-promote-backlog-authz.test.ts`
- [x] `npx vitest run tests/security/` (full security sweep)
- [x] `npm run lint && npm run build`
- [x] Manual spec §11 walkthrough (3 up / 2 down, toggle, switch, regen, promote, re-promote idempotency, raise N, non-admin 403)
EOF
)"
```

- [ ] **Step 3: Confirm CI is green and request review**

Wait for CI. Address any failures with focused fix-up commits.

---

## Self-Review (writer's check)

**1. Spec coverage** — Every section of the spec maps to a task:

- §3 / §5.1 / §5.2 → Task 1 (votes table + counter trigger).
- §5.3 → Task 5 (steward reviews table).
- §6.1 / §6.2 → Tasks 6, 10 (interface + heuristic + LLM).
- §7.1 → Task 3 (vote API + security).
- §7.2 → Tasks 7 (RPCs), 8 (promote API + security).
- §7.3 → Task 8 (review API + security).
- §8.1 → Task 4 (BacklogVoteControl + integration).
- §8.2 → Task 9 (StewardPromotePanel + sprint page integration).
- §9 → D1a covered by Tasks 1–9; D1b covered by Task 10. Both ship in one PR.
- §10 testing → Tasks 2, 3, 6, 8, plus Task 11 final sweep. All four security cases from §10 are covered (`backlog-vote-authz` covers 3; `admin-promote-backlog-authz` covers 1).
- §11 verification → Task 11 manual walkthrough.
- §12 open questions — all three resolved (council-only verdict; manual-only regen; no rate-limit on vote) before plan-write.
- §13 out-of-scope items are explicitly excluded.

**2. Placeholder scan** — No TBDs, no "TODO", no "handle edge cases", no "similar to Task N" hand-waves. Each step has runnable code or an exact command.

**3. Type consistency** — `StewardReview`, `StewardClient`, `StewardRecommendation`, `BacklogTaskSnapshot` are defined in Task 6 and reused identically in Task 10. RPC names (`suggest_promote_n`, `get_top_backlog_candidates`, `promote_top_backlog_to_sprint`) match between migration (Task 7), API route (Task 8), and hooks (Task 9). Endpoint paths in tests match the route file paths.

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-05-14-sprint-task-voting.md`.
