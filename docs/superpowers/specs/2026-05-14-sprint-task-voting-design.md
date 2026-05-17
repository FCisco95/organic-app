# Sprint-Task Voting + Steward Review — Design

**Status:** Draft — pending implementation plan
**Date:** 2026-05-14
**Sprint task:** D1 (seeded into `Sprint — Organic Identity`)
**Scope:** Replace the manual "Backlog priority voting" admin task with a continuous member voting system on backlog tasks, plus a Steward layer that (1) suggests how many items to promote into each new sprint and (2) reviews each candidate. Council approves with one click.

## 1. Goals & Non-Goals

### Goals
- Members with an `organic_id` can up/down-vote any backlog task at any time, change their vote, or clear it.
- Each new sprint in `'planning'` status surfaces a Steward suggestion: how many backlog items to promote (top-N by score), plus a per-task review of each candidate.
- Council promotes with one click; the system is idempotent and undoable in-place.
- Scales with community size — N adjusts automatically as the active-voter base changes (multi-tenant ready by design).
- Steward is *Suggest + Act, never Decide*: the algorithm proposes, council approves.
- Future-ready interface: the heuristic Steward in v1 swaps to an LLM-driven Steward without changing the API contract.

### Non-Goals
- Token-weighted voting. Rejected — backlog priority is a community-priority decision, not a treasury decision. 1p1v matches the persona-finalists vote and Ideas voting.
- Anonymous voting. Votes are linked to user_id for audit and double-vote prevention.
- Vote-time decay or HN-style ranking. Rejected for v1 — net votes is simpler and good enough at current scale.
- Automatic backlog *creation*. Members still create tasks via existing flows; this feature only ranks and promotes existing backlog items.
- Steward writing or editing tasks. Steward only annotates and recommends.

## 2. Current State

- Tasks have `status='backlog'` and nullable `sprint_id`. No voting primitive exists for tasks.
- Ideas voting is the closest pattern: `idea_votes(idea_id, user_id, value=-1|1)`, with `organic_id` gate, and an admin `promote-to-proposal` flow at `src/app/api/ideas/[id]/promote/route.ts`.
- Proposals voting is token-weighted (`proposal_voter_snapshots` + `holder_snapshots`) — not reused here.
- Sprint creation: `POST /api/sprints` creates in `'planning'` with no hooks. Sprint start: `POST /api/sprints/[id]/start` calls `clone_recurring_templates(sprint_id)`.
- Admin guard pattern: `requireAdmin` / `isAdminOrCouncil` helpers, used in `/api/admin/*` routes.
- Previous attempt: the April sprint seeded a `Backlog priority voting (hybrid weighted)` task with formula `sqrt(token) × (1 + ln(quality_submissions))` — never shipped. This spec supersedes that attempt with 1p1v.

## 3. Architecture

```
Member  ──► /tasks (Backlog tab)  ──► ↑/↓ click  ──► POST /api/tasks/[id]/vote
                                                              │
                                                              ▼
                                                       backlog_votes  ──(trigger)──► tasks.upvotes/downvotes

Council ──► Sprint planning page  ──► Steward panel
                                          │
                                          ├─ suggest_promote_n(org_id)            → suggested N
                                          ├─ get_top_backlog_candidates(org_id, n) → ranked task list
                                          ├─ steward_review(task_id)              → per-task annotation (cached)
                                          │
                                          └─ POST /api/admin/sprints/[id]/promote-backlog
                                                  │
                                                  └─ promote_top_backlog_to_sprint(sprint_id, n)
                                                       → sets sprint_id, status backlog → todo
```

Three layers:

1. **Member voting layer** — table + trigger + vote API + ↑/↓ UI control.
2. **Steward layer** — algorithm v1 (heuristic), interface stable for LLM swap.
3. **Council promotion layer** — admin panel + promote RPC + admin API guard.

## 4. File Layout

```
supabase/migrations/
  20260514000000_backlog_votes.sql                # backlog_votes table, counters on tasks, RLS, trigger
  20260514000001_sprint_promote_rpcs.sql          # suggest_promote_n, get_top_backlog_candidates, promote_top_backlog_to_sprint
  20260514000002_steward_reviews.sql              # task_steward_reviews table, RLS

src/lib/steward/
  index.ts                                        # public API: suggestN, reviewBacklogCandidates
  heuristics.ts                                   # v1 implementation
  types.ts                                        # StewardReview interface (LLM-swap-ready)

src/features/backlog/
  hooks.ts                                        # useBacklogVote, useTopBacklogCandidates, useStewardReview
  schemas.ts                                      # Zod for vote payload, promote payload

src/app/api/tasks/[id]/vote/route.ts              # POST member vote (organic_id gate, upsert/delete)
src/app/api/admin/sprints/[id]/promote-backlog/route.ts  # POST council promote (admin/council guard)
src/app/api/admin/steward/review-backlog/route.ts # POST regenerate steward reviews for top-N (idempotent, cached)

src/components/backlog/
  BacklogVoteControl.tsx                          # ↑/↓ + score, 1p1v, organic_id gated
  StewardPromotePanel.tsx                         # sprint planning panel: suggested N + candidates list + annotations + Promote button

tests/
  features/backlog/vote.test.ts                   # unit: vote payload validation
  api/tasks-vote.test.ts                          # integration: organic_id gate, double-vote prevention, toggle/clear
  api/admin-promote-backlog.test.ts               # integration: idempotency, admin gate, status flip
  lib/steward/heuristics.test.ts                  # unit: N suggestion, candidate review
```

## 5. Data Model

### 5.1 New table — `backlog_votes`

```sql
create table backlog_votes (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  user_id      uuid not null references user_profiles(id) on delete cascade,
  value        smallint not null check (value in (-1, 1)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (task_id, user_id)
);

create index idx_backlog_votes_task on backlog_votes(task_id);
create index idx_backlog_votes_user on backlog_votes(user_id);
```

RLS:
- `select`: any authenticated user.
- `insert/update/delete`: only the row's own `user_id`.
- Service-role bypass for admin promote logic.

### 5.2 Tasks denorm columns

```sql
alter table tasks
  add column if not exists upvotes int not null default 0,
  add column if not exists downvotes int not null default 0;

create index if not exists idx_tasks_score on tasks ((upvotes - downvotes) desc)
  where status = 'backlog' and sprint_id is null;
```

Maintained by `AFTER INSERT/UPDATE/DELETE` trigger on `backlog_votes` updating the parent task's counter columns.

### 5.3 New table — `task_steward_reviews`

```sql
create table task_steward_reviews (
  task_id            uuid primary key references tasks(id) on delete cascade,
  summary            text not null,
  clarity_score      smallint not null check (clarity_score between 1 and 5),
  scope_score        smallint not null check (scope_score between 1 and 5),
  concerns           jsonb not null default '[]'::jsonb,
  recommendation     text not null check (recommendation in ('promote','flag','reject')),
  generated_by       text not null,            -- 'heuristic-v1' | 'llm-claude-haiku-v1' etc
  generated_at       timestamptz not null default now()
);
```

RLS:
- `select`: any authenticated user.
- `insert/update/delete`: service role only (Steward writes are server-mediated).

Reviews are regenerated when the parent task's description is updated (FK trigger invalidates row → next request regenerates) or on demand from the council panel.

## 6. Steward Layer

### 6.1 Public interface

```ts
// src/lib/steward/types.ts
export interface StewardReview {
  task_id: string;
  summary: string;
  clarity_score: 1 | 2 | 3 | 4 | 5;
  scope_score: 1 | 2 | 3 | 4 | 5;
  concerns: string[];
  recommendation: 'promote' | 'flag' | 'reject';
  generated_by: string;
}

export interface StewardClient {
  suggestN(orgId: string): Promise<number>;
  reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]>;
}
```

### 6.2 v1 implementation — heuristic

`suggestN(orgId)`:
- `active = count(distinct user_id from backlog_votes where created_at > now() - interval '30 days' and task.org_id = orgId)`
- `n = clamp(ceil(active / 5), 3, 15)`
- Returns `n`.

`reviewBacklogCandidates(taskIds)`:
- For each task, compute:
  - `clarity_score`: based on description length, presence of headers (WHAT / WHY / HOW), explicit acceptance criteria.
  - `scope_score`: based on point value, label specificity, presence of out-of-scope notes.
  - `concerns`: array of detected issues (`'no_description'`, `'missing_acceptance'`, `'possible_duplicate:<task_id>'`, `'unbounded_scope'`).
  - `recommendation`: `'promote'` if both scores ≥ 3 and no concerns; `'flag'` if scores 2–3 with concerns; `'reject'` if score 1.
  - Duplicate detection: trigram similarity on `title` against existing backlog (Postgres `pg_trgm`, threshold 0.5). **Dependency:** the plan must verify `pg_trgm` is enabled (likely needs `create extension if not exists pg_trgm`); fall back to exact-substring match if the extension is unavailable.
- Upserts `task_steward_reviews` with `generated_by = 'heuristic-v1'`.

### 6.3 v2 swap — LLM

Same interface. Replace `heuristics.ts` with `llm.ts`:
- Calls Claude Haiku with a structured prompt → returns same `StewardReview` shape.
- Cached per `(task_id, description_hash)`; cache invalidates when description changes.
- Cost: Haiku is cheap; one call per backlog candidate per sprint cycle. Bounded by community size.

The council UI does not care which generator backs the call. Same JSON contract.

## 7. API Surface

### 7.1 Member vote

`POST /api/tasks/[id]/vote`
- Auth: signed-in user with `organic_id`.
- Body (Zod): `{ value: -1 | 0 | 1 }`. `0` deletes the vote (toggle to "none").
- Behavior:
  - Task must have `status='backlog'` and `sprint_id is null`.
  - Upsert `backlog_votes` with `(task_id, user_id, value)`. `value=0` deletes the row.
  - Trigger maintains `tasks.upvotes/downvotes`.
- Response: `{ data: { task_id, upvotes, downvotes, my_vote: -1|0|1 } }` consistent with `{ data, error }` envelope.
- Errors: 401 (no session), 403 (no organic_id), 404 (task not found), 409 (task not in backlog).

### 7.2 Council promote

`POST /api/admin/sprints/[id]/promote-backlog`
- Auth: admin or council.
- Body (Zod): `{ n: number }`.
- Behavior:
  - Validate sprint is in `'planning'` status.
  - Call RPC `promote_top_backlog_to_sprint(sprint_id, n)`:
    - Select top-N tasks where `status='backlog'` and `sprint_id is null` and `org_id = sprint.org_id`, ordered by `(upvotes - downvotes) desc, created_at asc`.
    - Update those tasks: `sprint_id = $sprint_id, status = 'todo'`.
    - Return promoted task IDs.
  - Idempotent: re-running with same N is a no-op if those tasks are already promoted. Re-running with larger N adds the next-ranked tasks.
- Response: `{ data: { promoted_task_ids: string[], n_actually_promoted: number } }`. The promotion endpoint does not regenerate Steward reviews; that's the dedicated review endpoint's job (called by the panel before the user clicks Promote).

### 7.3 Steward review refresh

`POST /api/admin/steward/review-backlog`
- Auth: admin or council.
- Body (Zod): `{ task_ids: string[], force?: boolean }`. `force=true` bypasses cache.
- Behavior: calls `StewardClient.reviewBacklogCandidates(task_ids)`, writes results.
- Response: `{ data: { reviews: StewardReview[] } }`.

## 8. Frontend Surface

### 8.1 `BacklogVoteControl`

A small component rendered in each backlog row on `/tasks?tab=backlog`:
- Two arrows (↑ and ↓), one numeric score between them (or below on mobile).
- States: idle, upvoted, downvoted, loading (skeleton).
- Click ↑: if not voted → upvote; if upvoted → clear; if downvoted → switch to upvote. Mirror for ↓.
- Optimistic update on click. Roll back on API error with toast.
- Hides for users without `organic_id` (shows score only, no buttons).

### 8.2 `StewardPromotePanel`

Rendered on the sprint planning page (`/sprints/[id]` while sprint is in `'planning'`):
- Header: "Steward suggests promoting N backlog items".
- N: an editable input pre-filled with the suggestion. Slider 1–20.
- List: top-N backlog candidates ordered by score, each row showing:
  - Title (link to task), score, top 1–2 tags.
  - Steward annotation: `clarity ★★★★☆ | scope ★★★☆☆ | recommendation: promote | flag | reject` with hover for concerns array.
- "Regenerate review" button — calls `/api/admin/steward/review-backlog` with `force=true`.
- "Promote top N" button — calls promote endpoint.
- After promote: panel shows "Promoted X tasks" + a link to the new sprint backlog. Members can still vote; re-running pulls additional tasks if N was raised.

## 9. Phasing

This task is bigger than the original D1 (300 pt) estimate. Split into two phases shipped as one PR:

| Phase | Scope | Effort |
|---|---|---|
| **D1a** | Member voting layer + counter trigger + heuristic Steward + council promote + UI surfaces | ~300 pt |
| **D1b** | Swap heuristic Steward for LLM-backed implementation (Claude Haiku), same interface | ~100 pt |

D1a ships first and is fully functional with the heuristic Steward. D1b is a contained replacement of `src/lib/steward/heuristics.ts` with `llm.ts`. No migration, no API change.

## 10. Testing

Per CLAUDE.md "Testing (non-negotiable)":

- **Unit (Vitest):**
  - Zod schemas for vote and promote payloads.
  - Heuristic `suggestN` boundary cases (0 active voters, 1, 5, 25, 100).
  - Heuristic `reviewBacklogCandidates` for tasks with various descriptions (empty, short, well-structured, near-duplicate).
- **Integration (Supabase + Vitest):**
  - Vote toggle (none → up → up→none → down → switch).
  - Double-vote prevention via unique constraint.
  - `organic_id` gate at API level.
  - Promote idempotency — same N twice = no double-promotion.
  - Status flip from `backlog` to `todo` only for promoted tasks.
  - Counter trigger correctness.
- **Security tests (`tests/security/`):**
  - Non-admin cannot call promote endpoint.
  - Anonymous cannot vote.
  - Voter without `organic_id` cannot vote.
  - User cannot vote on a non-backlog task.

## 11. Verification Plan

After PR merge and migrations applied:

1. Cast 3 upvotes and 2 downvotes from different test accounts on a single backlog task. Confirm `tasks.upvotes=3`, `tasks.downvotes=2`, score=1 visible in UI.
2. Toggle one voter's vote off — confirm counters decrement.
3. Switch one voter from up to down — confirm both columns adjust by 1.
4. Hit `/api/admin/steward/review-backlog` with the 5 highest-scored backlog tasks. Confirm `task_steward_reviews` rows written with `generated_by='heuristic-v1'`.
5. Create a new sprint in `'planning'`. Open the sprint page. Confirm Steward panel appears with suggested N matching `clamp(ceil(active_voters / 5), 3, 15)`.
6. Promote top-N. Confirm those tasks now have `sprint_id=<new>`, `status='todo'`.
7. Re-run promote with same N — confirm no duplicates.
8. Raise N by 2, re-run — confirm 2 additional tasks promoted.
9. Non-admin user attempts promote endpoint — confirm 403.

## 12. Open Questions

- Should we expose a public read-only "Steward verdict" badge on backlog tasks (members see Steward's annotations), or council-only? **Default: council-only** for v1 to keep the surface minimal.
- Should `task_steward_reviews` be regenerated automatically when description changes, or only on explicit "Regenerate review"? **Default: only on explicit refresh** to keep cost predictable.
- Cooldown / rate-limit on voting? **Default: none for v1**, organic_id gate is enough.

## 13. Out of Scope

- LLM cost monitoring dashboard (D1b adds the LLM call; observability is a separate concern).
- Multi-org per-tenant Steward customization (tenant-specific heuristics). v2 architecture concern.
- Mobile-specific UI polish for the Steward panel — desktop-first.
- Token-weighted backlog voting (rejected upstream).
- On-chain anchoring of promotion decisions.
