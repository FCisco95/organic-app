# Phase 28 Plan — Ideas Incubator + Weekly Proposal Funnel

## Objective

Implement a Reddit-style Ideas surface where members can post, vote, and discuss lightweight ideas before formal proposals. Each week, one winning idea becomes a proposal candidate and is promoted into a prefilled proposal draft.

## Product Decisions (Confirmed)

- Cadence: weekly cycle; top 1 winner.
- Promotion: admin confirmation window, then auto-create prefilled proposal draft.
- Voting: 1 member, 1 active vote per idea (`up`, `down`, toggle to neutral).
- Permissions: authenticated members with Organic ID can post/comment/vote.
- Moderation: admins can pin, lock, and remove ideas.
- Points v1:
  - create idea `+5`
  - vote received `+1` (daily cap `10/day`)
  - vote cast `+1` (daily cap `5/day`)
  - idea promoted to proposal `+25`

## Scope

In scope:
- New idea domain (DB + API + UI + hooks + schemas)
- Comment support for ideas
- Weekly winner workflow and proposal linkage
- KPI endpoints and UI cards
- Gamification events for idea actions

Out of scope (v1):
- Anonymous posting
- Reactions beyond up/down
- Cross-org/global feed ranking experiments
- ML moderation

## Implementation Sequence

## 1) Data Model + Migrations

- Add `ideas` table with lifecycle and moderation fields.
- Add `idea_votes` table with unique `(idea_id, user_id)` constraint.
- Add `idea_promotion_cycles` for weekly windows and winner tracking.
- Add `idea_events` for moderation/promotion audit trail.
- Extend shared comments to allow `subject_type = 'idea'`.
- Add indexes for feed and ranking:
  - `ideas (org_id, is_pinned desc, score desc, created_at desc)`
  - `ideas (org_id, promotion_week, status)`
  - `idea_votes (idea_id, updated_at desc)`

Deliverable:
- reversible SQL migration(s) in `supabase/migrations/`.

## 2) Types, Validation, and Feature Layer

- Create `src/features/ideas/`:
  - `types.ts` (Idea, IdeaVote, feed filters/sorts, KPI DTOs)
  - `schemas.ts` (Zod for create/edit/vote/filter/promotion)
  - `hooks.ts` (React Query hooks for feed/detail/vote/comments/KPIs)
  - `index.ts`
- Keep business logic in feature layer, not UI components.

Deliverable:
- typed, validated contracts used by API and UI.

## 3) API Endpoints

- `GET /api/ideas`
- `POST /api/ideas`
- `GET /api/ideas/[id]`
- `PATCH /api/ideas/[id]`
- `POST /api/ideas/[id]/vote`
- `GET /api/ideas/[id]/comments`
- `POST /api/ideas/[id]/comments`
- `GET /api/ideas/kpis`
- `POST /api/ideas/cycles/[id]/select-winner` (admin)
- `POST /api/ideas/[id]/promote` (admin; creates linked proposal draft)

Rules enforced server-side:
- Organic ID gate for create/comment/vote.
- self-vote blocked.
- idempotent vote toggling.
- admin-only moderation and promotion.
- safe rate limits on create/comment/vote.

Deliverable:
- route handlers under `src/app/api/ideas/**` with strict Zod validation.

## 4) UI Surfaces

- Add `/[locale]/ideas` page:
  - KPI strip
  - weekly spotlight card
  - feed tabs: `hot`, `new`, `top_week`, `top_all`
  - idea composer CTA
- Add `/[locale]/ideas/[id]` page:
  - full idea content
  - vote rail
  - threaded comments
  - moderation badges/actions
- Reuse existing UI primitives and layout patterns for consistency.
- Add nav entry to Ideas for signed-in users.

Deliverable:
- production-ready localized pages and components.

## 5) Proposal Promotion Linkage

- Promotion endpoint auto-creates prefilled proposal draft using idea content.
- Persist `ideas.promoted_to_proposal_id`.
- Add cross-links:
  - idea detail -> linked proposal
  - proposal detail -> source idea card
- Weekly cycle closure marks winner and prevents duplicate promotion.

Deliverable:
- deterministic idea->proposal funnel path.

## 6) Gamification Events

- Emit XP/points events on:
  - idea creation
  - vote cast
  - vote received
  - promotion winner bonus
- Enforce daily caps for cast/received rewards.
- Log anti-abuse signals for suspicious voting bursts.

Deliverable:
- auditable points impact with abuse guardrails.

## 7) QA, Metrics, and Rollout

- Add tests for:
  - vote toggle idempotency
  - score aggregation correctness
  - permission gates
  - winner selection determinism
  - promotion link integrity
- Manual QA on mobile + desktop:
  - create/edit/vote/comment/moderate/promote
- Feature flag: `ideas_incubator_enabled`.

Success metrics (first 30 days):
- weekly unique idea contributors up
- comments per idea up
- idea-to-proposal conversion visible and non-zero

## Risks and Mitigations

- Vote manipulation:
  - strict one-vote constraint, self-vote block, rate limits, anomaly logging.
- Promotion disputes:
  - weekly cycle records + admin audit events.
- Feed performance:
  - indexed sort paths and bounded pagination.

## Definition of Done

- All API contracts validated with Zod and covered by tests.
- Ideas feed/detail fully functional with moderation controls.
- Weekly winner can be promoted into linked proposal draft.
- KPI strip reflects real data.
- Gamification points are awarded with caps and auditability.
- `npm run lint` and `npm run build` pass.
