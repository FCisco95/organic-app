# Spec: Blockers & Hardening (Track 1)

> Track 1 | Priority: Critical — Must complete before deployment
> Last updated: 2026-03-07

---

## Goal

Resolve all deployment blockers, flip the Go/No-Go gate to Go, and harden the Ideas Incubator for production use.

---

## 1.1 Schema-Cache Drift Fix (PGRST204)

### Problem

Staging schema-cache drift on proposal execution-window writes. The PostgREST API returns `PGRST204` (no rows affected) when writing to the `execution_deadline` path, suggesting the column exists in app code but PostgREST's schema cache is stale.

### Implementation Sequence

```
Step 1: Diagnose the exact column/table mismatch     (30 min)
Step 2: Fix schema or regenerate types                (30 min)
Step 3: Reload PostgREST schema cache                 (10 min)
Step 4: Verify end-to-end                             (15 min)
Step 5: Document prevention strategy                  (15 min)
```

### Step 1: Diagnose

**Files to check:**
- `supabase/migrations/20260301170000_proposal_execution_window_rpc.sql` — the migration that added execution window support
- `src/types/database.ts` — generated types, check if `execution_deadline` column is present
- `src/types/supabase.ts` — additional type overrides
- `src/app/api/proposals/[id]/route.ts` — the API route that writes execution_deadline

**Commands:**
```bash
# Check if column exists in actual DB schema
# (run against staging Supabase)
supabase db inspect --schema public

# Check generated types
grep -n "execution_deadline" src/types/database.ts
```

**Possible causes:**
1. Migration ran but PostgREST schema cache wasn't reloaded
2. Column name mismatch between migration and app code
3. RLS policy blocking the update
4. The migration used an RPC function but the app writes directly to the table

### Step 2: Fix

Depending on diagnosis:

**If schema cache stale:**
```sql
-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

**If column missing:**
```sql
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS execution_deadline TIMESTAMPTZ;
```

**If types out of sync:**
```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

### Step 3: Reload + Verify

```bash
# Regenerate types
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

# Verify types include execution_deadline
grep "execution_deadline" src/types/database.ts

# Test the proposal execution-window write path
# (create or update a proposal with execution deadline via the app)
```

### Step 5: Prevention Strategy

Add to deployment checklist:
- After any migration, always run `NOTIFY pgrst, 'reload schema'`
- After any migration, always regenerate types: `supabase gen types typescript`
- Consider adding a CI step that compares generated types with committed types

---

## 1.2 Manual QA Matrix Completion

### Current State

The QA runbook exists at `docs/qa-runbook.md`. Some test cases are incomplete.

### Implementation Sequence

```
Step 1: Audit qa-runbook.md for incomplete items       (30 min)
Step 2: Execute critical path tests on staging         (2-3 hrs)
Step 3: Fix bugs discovered during QA                  (variable)
Step 4: Re-test fixed items                            (30 min)
Step 5: Update Go/No-Go status                         (15 min)
```

### Critical Paths (must pass)

| # | Flow | Steps to test | Pass criteria |
|---|---|---|---|
| 1 | **Auth: Wallet connect** | Connect Phantom/Solflare → verify sig → session created | User lands on dashboard with wallet linked |
| 2 | **Auth: Token verification** | Connect wallet with/without token → verify gate | Token holders pass, non-holders blocked with message |
| 3 | **Task lifecycle** | Create task → assign → submit → review → approve/reject | Status transitions correct, XP awarded on approval |
| 4 | **Proposal voting** | Create proposal → vote → deadline passes → result computed | Results match vote tally, execution window opens |
| 5 | **Rewards claim** | Epoch with distributions → claim → verify balance | Claim succeeds, amount correct, no double-claim |
| 6 | **Ideas post + vote** | Post idea → upvote/downvote → score updates | Score correct, vote toggle works, idempotent |
| 7 | **Onboarding wizard** | New member → wizard opens → complete steps | Progress saves, auto-close on completion |
| 8 | **Notifications** | Trigger events → check in-app notifications appear | Correct notifications for each event type |
| 9 | **Mobile responsive** | All above flows on 375px width | No horizontal overflow, all interactive elements reachable |
| 10 | **i18n** | Switch locale → verify key surfaces render translated | No raw keys visible, layout doesn't break |

### Bug Fix Protocol

For each bug found:
1. Document in QA runbook with description and reproduction steps
2. Classify severity: P0 (blocker), P1 (major), P2 (minor)
3. Fix P0s immediately, P1s before deploy, P2s can be post-launch
4. Re-test the fixed flow

---

## 1.3 Ideas Incubator Hardening (Phase 28 Closure)

### What's done

- Ideas pages, detail, voting, comments
- API foundation (CRUD, vote, comments, KPIs, promotion, winner selection)
- Feature flag, navigation, promotion/backlink

### What's missing

1. Admin moderation controls
2. Gamification integration
3. Abuse prevention
4. Weekly spotlight module enhancement
5. Full PATCH endpoint
6. Integrity tests
7. Manual QA

### Implementation Sequence

```
Step 1: PATCH /api/ideas/:id — full edit + moderation     (1 hr)
Step 2: Admin moderation UI (pin, lock, remove, promote)  (1.5 hrs)
Step 3: Gamification integration (XP/points emitters)     (1.5 hrs)
Step 4: Abuse prevention (self-vote block, daily caps)    (1 hr)
Step 5: Weekly spotlight module                           (45 min)
Step 6: Integrity tests                                   (1.5 hrs)
Step 7: Manual QA on desktop + mobile                     (1 hr)
```

### Step 1: PATCH Endpoint

**Edit:** `src/app/api/ideas/[id]/route.ts`

```typescript
// PATCH /api/ideas/:id
//
// Author can edit (within window):
//   - title, body, tags
//
// Admin can set:
//   - is_pinned: boolean
//   - is_locked: boolean
//   - status: 'open' | 'removed' | 'archived'
//
// Zod validation:
const patchIdeaSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  body: z.string().min(10).max(5000).optional(),
  is_pinned: z.boolean().optional(),       // admin only
  is_locked: z.boolean().optional(),       // admin only
  status: z.enum(['open', 'removed', 'archived']).optional(), // admin only
}).refine(data => Object.keys(data).length > 0, 'At least one field required');

// Log all moderation actions to idea_events table
```

### Step 2: Admin Moderation UI

**Edit:** Idea card and detail page — add context menu for admin users.

```
┌────────────────────────────────────────┐
│  "Mobile push notifications"    [···]  │
│  by Alice · 2h ago · Score: 12  ┌────┐ │
│                                 │Pin │ │
│                                 │Lock│ │
│                                 │Remove│
│                                 │───── │
│                                 │Promote│
│                                 └────┘ │
└────────────────────────────────────────┘
```

**Files to edit:**
- `src/app/[locale]/ideas/page.tsx` or idea card component
- `src/app/[locale]/ideas/[id]/page.tsx` — idea detail page

### Step 3: Gamification Integration

**Edit:** Ideas API routes to emit XP/points events.

| Event | XP | Daily cap | Implementation |
|---|---|---|---|
| Create idea | +5 | none | `POST /api/ideas` after successful insert |
| Vote cast | +1 | 5/day | `POST /api/ideas/:id/vote` after successful vote |
| Vote received | +1 | 10/day (per author) | `POST /api/ideas/:id/vote` after successful vote |
| Promoted to winner | +25 | none | `POST /api/ideas/:id/promote` |

**Files to edit:**
- `src/app/api/ideas/route.ts` (create)
- `src/app/api/ideas/[id]/vote/route.ts` (vote cast + received)
- `src/app/api/ideas/[id]/promote/route.ts` (promotion bonus)
- `src/features/gamification/` — use existing XP emitter functions

**Add gamification config keys:**
```sql
-- Migration: add ideas config keys to gamification_config
INSERT INTO gamification_config (key, value, description) VALUES
  ('ideas_create_xp', '5', 'XP for creating an idea'),
  ('ideas_vote_cast_xp', '1', 'XP for casting a vote on an idea'),
  ('ideas_vote_cast_daily_cap', '5', 'Max votes that earn XP per day'),
  ('ideas_vote_received_xp', '1', 'XP for receiving a vote on your idea'),
  ('ideas_vote_received_daily_cap', '10', 'Max vote-received XP per day'),
  ('ideas_promoted_xp', '25', 'XP bonus when idea is promoted to proposal')
ON CONFLICT (key) DO NOTHING;
```

### Step 4: Abuse Prevention

**Edit:** `src/app/api/ideas/[id]/vote/route.ts`

```typescript
// Block self-voting
if (idea.author_id === currentUserId) {
  return NextResponse.json({ error: 'Cannot vote on your own idea' }, { status: 403 });
}

// Daily cap enforcement for XP (not vote itself)
// Check: how many vote-XP events did this user emit today?
// If >= daily_cap: skip XP award but allow the vote

// Anomaly logging
// If user votes on >20 ideas in 1 hour: log warning to idea_events
```

### Step 5: Weekly Spotlight

**Edit:** Ideas page — enhance existing spotlight section.

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 This Week's Top Idea                                     │
│  ────────────────────────────────────────────────────────── │
│  "Mobile push notifications for voting deadlines"            │
│  by Alice · Score: 42 · 18 comments                          │
│                                                              │
│  ⏱ 3 days left in this cycle                                │
│                                                              │
│  [View idea →]    [View linked proposal →]                   │
│                   (shown only if promoted)                    │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Integrity Tests

**Create:** `tests/ideas-integrity.spec.ts`

Test cases:
1. **Vote idempotency:** Voting up twice = same result as voting up once
2. **Score correctness:** score = upvotes - downvotes, always matches count
3. **Self-vote block:** Author cannot vote on own idea (403)
4. **Winner selection:** Only one winner per cycle, deterministic
5. **Promotion link:** Promoted idea links to correct proposal, proposal links back
6. **Toggle vote:** up → down → neutral works correctly, score adjusts

### Step 7: Manual QA

Execute on desktop + mobile (375px):
- [ ] Create idea → appears in feed
- [ ] Vote up/down → score updates, toggle works
- [ ] Comment on idea → comment appears
- [ ] Admin: pin → idea appears at top
- [ ] Admin: lock → comments disabled
- [ ] Admin: remove → idea hidden from feed
- [ ] Admin: select winner → winner badge appears
- [ ] Admin: promote → proposal draft created with link
- [ ] XP awarded for create/vote/promote actions
- [ ] Self-vote blocked with error message
- [ ] Mobile: all above flows work without layout issues

---

## File Map Summary

| Action | Path |
|---|---|
| Check | `supabase/migrations/20260301170000_proposal_execution_window_rpc.sql` |
| Edit | `src/types/database.ts` (regenerate) |
| Edit | `docs/qa-runbook.md` (update results) |
| Edit | `src/app/api/ideas/[id]/route.ts` (PATCH endpoint) |
| Edit | `src/app/api/ideas/[id]/vote/route.ts` (self-vote block, daily caps) |
| Edit | `src/app/api/ideas/route.ts` (create XP emit) |
| Edit | `src/app/api/ideas/[id]/promote/route.ts` (promotion XP) |
| Edit | Idea card/detail components (admin moderation UI) |
| Edit | Ideas page (spotlight module) |
| Create | `supabase/migrations/YYYYMMDDHHMMSS_ideas_gamification_config.sql` |
| Create | `tests/ideas-integrity.spec.ts` |

---

## Success Criteria

- [ ] PGRST204 error resolved — proposal execution-window writes succeed
- [ ] All 10 critical QA paths pass on staging
- [ ] No P0 bugs remaining
- [ ] Ideas moderation controls functional for admins
- [ ] Ideas gamification emitting XP correctly with daily caps
- [ ] Self-voting blocked, anomaly logging active
- [ ] Ideas integrity tests passing in CI
- [ ] Go/No-Go gate flipped to **Go**
