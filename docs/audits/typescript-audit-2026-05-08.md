# TypeScript Audit — 2026-05-08

> Scope: `src/**/*.ts`, `src/**/*.tsx`. Generated files (`src/types/database.ts`) excluded. Test files excluded from `any` counts. TypeScript strict mode is active (`"strict": true` in `tsconfig.json`). `tsc --noEmit` exits 0.

---

## Summary

| Category | Count |
|---|---|
| `any` usages — lazy (catch-block) | 16 |
| `any` usages — lazy (production logic) | ~20 |
| `as any` casts | 201 |
| `as unknown as` double-casts | 47 |
| `@ts-ignore` / `@ts-expect-error` | 0 |
| Missing explicit return types on exported lib functions | 1 |
| API routes with unvalidated `request.json()` body | 2 |
| API routes with unvalidated `searchParams` | ~4 |
| Tables missing from `Database` generated type | 13 |
| `.then()` without `.catch()` (fire-and-forget in API handlers) | 8 |
| Untyped `.rpc()` calls | 2 |
| `event_type` enum gaps (values cast with `as any`) | 17 |
| Module-level mutable `let` (in Next.js route files — resets on cold start, unreliable) | 5 |

---

## Findings by Category

### `any` usages — lazy, fixable

These are in production logic (not catch blocks) and should be replaced with proper types.

| File | Line | Snippet | Suggested type |
|---|---|---|---|
| `src/app/api/easter/egg-check/route.ts` | 8 | `let cachedConfig: any = null` | Define a `EggHuntConfig` interface matching the DB row shape |
| `src/app/api/easter/egg-check/route.ts` | 126, 131, 132, 134 | `{ data: any[] | null }`, `(e: any) => e.egg_number` | Add inline row type `{ egg_number: number; user_id: string }` |
| `src/app/api/daily-tasks/route.ts` | 102–108 | `autoCompleteLogin(supabase: any, …, tasks: any[])` | Use `SupabaseClient` (or the project's `DbClient` alias) and define a `DailyTaskRow` type |
| `src/app/api/daily-tasks/track/route.ts` | 100–102 | `incrementProgress(supabase: any, …, row: any, …)` | Same — `DbClient` + `DailyTaskProgressRow` |
| `src/app/api/marketplace/boosts/route.ts` | 83 | `(row: any) =>` in `.map()` | Inline `{ id: string; boost_type: string; … }` or a named type |
| `src/app/api/campaigns/route.ts` | 26, 35, 52, 60 | `{ data: any[] | null; error: any }`, `.filter((c: any) =>` | Define `CampaignRow` from the DB schema |
| `src/app/api/admin/easter/stats/route.ts` | 42, 44, 50 | `{ data: any[] | null }`, `(h: any) => h.user_id` | Add `{ user_id: string }` row type |
| `src/features/gamification/quest-engine.ts` | 278 | `.in('event_type', TRACKED_ACTIVITY_EVENTS as any)` | Use `as Array<Database['public']['Enums']['activity_event_type']>` or widen the const type |

#### `catch (err: any)` / `catch (error: any)` — should be `unknown`

All seven occurrences should use `catch (err: unknown)` with narrowing:

| File | Lines |
|---|---|
| `src/app/[locale]/sprints/page.tsx` | 196, 199, 220, 548, 572 |
| `src/app/[locale]/sprints/[id]/page.tsx` | 196, 220 |
| `src/app/[locale]/profile/page.tsx` | 200, 229 |
| `src/components/settings/campaigns-tab.tsx` | 338, 347, 357 |
| `src/components/marketplace/create-boost-dialog.tsx` | 37 |
| `src/components/marketplace/engage-dialog.tsx` | 41 |
| `src/components/profile/profile-wallet-tab.tsx` | 64, 169, 216 |
| `src/components/wallet/wallet-connect-drawer.tsx` | 178 |

Pattern to replace with:
```typescript
// Instead of:
} catch (err: any) {
  toast.error(err.message);
// Use:
} catch (err: unknown) {
  toast.error(err instanceof Error ? err.message : 'Unknown error');
```

---

### Unsafe casts

#### Category A — `(supabase as any).from(…)` — tables exist in `Database` type but aren't typed

The single largest source of `as any` (≈120 occurrences). Tables such as `posts`, `post_likes`, `post_flags`, `post_thread_parts`, `daily_task_progress`, `login_streaks`, `boost_requests`, `engagement_proofs`, `points_ledger`, `xp_events` all appear in the generated `Database` type yet callers cast `supabase as any` to reach them.

Root cause: `src/types/database.ts` does not include these tables, meaning the generated type is **stale / incomplete** relative to the live schema. This single regeneration would eliminate the majority of `as any` casts across the entire codebase.

Key files affected:

| File | Representative lines |
|---|---|
| `src/app/api/posts/route.ts` | 45, 113, 233, 275 |
| `src/app/api/posts/[id]/route.ts` | 18, 42, 54, 91, 154, 169 |
| `src/app/api/posts/[id]/flag/route.ts` | 32, 57, 79, 125, 141, 163, 165 |
| `src/app/api/posts/[id]/like/route.ts` | 32, 49, 60, 64, 127, 132 |
| `src/app/api/posts/[id]/comments/route.ts` | 40, 109, 140, 212, 218 |
| `src/app/api/daily-tasks/route.ts` | 31, 60, 71, 87, 116 |
| `src/app/api/daily-tasks/streak/route.ts` | 26, 88, 117, 123, 135, 141 |
| `src/app/api/daily-tasks/track/route.ts` | 45, 60, 120 |
| `src/features/gamification/points-service.ts` | 87, 107, 182, 242 |
| `src/lib/translation/translate-content.ts` | 133, 204, 209 |

**Fix:** Regenerate `src/types/database.ts` with `npx supabase gen types typescript`. This is by far the highest-leverage fix in this codebase.

#### Category B — `from('table_name' as any)` — tables genuinely missing from `Database` type

These tables have no corresponding type definition in `database.ts` and must be added either via regeneration or manual extension:

| Table | Files |
|---|---|
| `campaigns` | `src/app/api/campaigns/route.ts:21,43`, `src/app/api/admin/campaigns/route.ts:36,66`, `src/app/api/admin/campaigns/[id]/route.ts:46,76` |
| `egg_hunt_config` | `src/app/api/easter/egg-check/route.ts:65,155`, `src/app/api/easter/egg-claim/route.ts:63`, `src/app/api/admin/easter/config/route.ts:36,67,78` |
| `egg_hunt_luck` | `src/app/api/easter/egg-check/route.ts:166,209,218` |
| `egg_opens` | `src/app/api/egg-opening/history/route.ts:26,40`, `src/app/api/egg-opening/open/route.ts:51,124` |
| `golden_eggs` | `src/app/api/easter/egg-check/route.ts:125`, `src/app/api/easter/egg-claim/route.ts:21,75,90`, `src/app/api/easter/leaderboard/route.ts:35`, `src/app/api/admin/easter/stats/route.ts:36,41,48` |
| `governance_summaries` | `src/features/ai/governance-summary-service.ts:219` |
| `point_burns` | `src/features/gamification/burn-engine.ts:112` |
| `quests` | `src/features/gamification/quest-engine.ts:223`, `src/app/api/admin/quests/route.ts:36,68`, `src/app/api/admin/quests/[id]/route.ts:46,75` |
| `referral_codes` | `src/features/gamification/referral-engine.ts:73,97,111,134` |
| `referral_rewards` | `src/features/gamification/referral-engine.ts:236,323` |
| `referrals` | `src/features/gamification/referral-engine.ts:156,196,214,227,313,318` |
| `user_badges` | `src/app/api/badges/route.ts:18`, `src/app/api/admin/badges/route.ts:35,44`, `src/app/api/admin/badges/award/route.ts:53,80,84` |
| `xp_egg_pending` | `src/app/api/easter/egg-check/route.ts:263`, `src/app/api/easter/xp-egg-claim/route.ts:41,146` |

#### Category C — `event_type: '…' as any` — enum gaps in `activity_event_type`

The `activity_event_type` enum in `database.ts` (line 3468) is missing 17 values actively used in insert statements:

`post_created`, `post_commented`, `post_flagged`, `post_promoted`, `idea_created`, `idea_voted`, `donation_verified`, `wallet_linked`, `egg_found`, `holding_sync`, `streak_milestone`, `streak_freeze_earned`, `streak_freeze_used`, `twitter_linked`, `twitter_link_failed`

Each occurrence uses `as any` to silence the mismatch. Adding these values to the enum (via a DB migration + type regeneration) eliminates all 17 casts.

Key files:

| File | Line | Missing value |
|---|---|---|
| `src/app/api/posts/route.ts` | 285 | `'post_created'` |
| `src/app/api/posts/[id]/comments/route.ts` | 175 | `'post_commented'` |
| `src/app/api/posts/[id]/flag/route.ts` | 72 | `'post_flagged'` |
| `src/app/api/posts/[id]/promote/route.ts` | 135 | `'post_promoted'` |
| `src/app/api/ideas/route.ts` | 199 | `'idea_created'` |
| `src/app/api/ideas/[id]/vote/route.ts` | 142 | `'idea_voted'` |
| `src/app/api/donations/submit/route.ts` | 157 | `'donation_verified'` |
| `src/app/api/auth/link-wallet/route.ts` | 153 | `'wallet_linked'` |
| `src/app/api/easter/egg-claim/route.ts` | 120 | `'egg_found'` |
| `src/app/api/easter/xp-egg-claim/route.ts` | 100 | `'egg_found'` |
| `src/app/api/trading/sync/route.ts` | 43 | `'holding_sync'` |
| `src/app/api/twitter/link/callback/route.ts` | 177, 202, 218 | `'twitter_link_failed'`, `'twitter_linked'` |
| `src/features/gamification/streak-service.ts` | 67, 111, 154 | `'streak_milestone'`, `'streak_freeze_earned'`, `'streak_freeze_used'` |

#### Category D — `as unknown as T` double-cast (bypasses type checking)

47 occurrences. Most arise from the stale database type (Category A) propagating into client hooks. The most structurally problematic:

| File | Lines | Issue |
|---|---|---|
| `src/app/[locale]/proposals/[id]/page.tsx` | 756, 858, 866 | Passes `proposal as unknown as ProposalWithVoting` to child components — if the shape diverges, runtime errors are silent |
| `src/features/tasks/hooks/useTasks.ts` | 69, 114, 120, 162, 174 | Entire Supabase return cast away; query errors silently produce wrong type |
| `src/features/voting/hooks.ts` | 90 | `data as unknown as ProposalWithVoting` — Supabase select may return a subset |
| `src/features/proposals/hooks.ts` | 104, 139, 174 | Same pattern — full row vs. partial select mismatch hidden by cast |
| `src/features/gamification/referral-engine.ts` | 90, 103, 117, 140, 173, 206, 344 | Row shapes cast away after queries that cannot be typed due to Category B |
| `src/features/badges/schemas.ts` | 21 | `BADGE_KEYS as unknown as [string, ...string[]]` — use `as const` on the array instead |

#### Category E — Unsafe profile update cast

| File | Lines | Issue |
|---|---|---|
| `src/app/[locale]/profile/page.tsx` | 221–222 | `.update({ … } as any).eq('id', user!.id as any)` — the `.eq` cast is unnecessary; the `user!.id` non-null assertion is the real issue. `user` is checked two lines above but not narrowed into the branch. |

#### Category F — Untyped `.rpc()` calls

| File | Lines | Affected function |
|---|---|---|
| `src/app/api/sprints/[id]/complete/route.ts` | 271–274 | `(supabase as any).rpc('settle_sprint_task_points', …)` — `settle_sprint_task_points` is not in the generated `Functions` type, so the whole client is cast. Add the function to the DB type or use a typed wrapper. |
| `src/app/api/sprints/[id]/complete/route.ts` | 467–473 | `supabase.rpc('finalize_sprint_completion' as any, …)` — same root cause, different style of cast. |

---

### Missing return types on exported lib functions

`tsc --noEmit` passes (strict mode), which means TypeScript infers all return types correctly — so this section is narrow. The one genuine gap:

| File | Line | Function | Issue |
|---|---|---|---|
| `src/lib/translation/translate-content.ts` | 133 | internal `serviceClient as unknown as TranslationServiceClient` | Not a missing return type per se, but the service client is being double-cast to a hand-rolled `TranslationServiceClient` interface (line 96 also). If the real `SupabaseClient<Database>` shape diverges from `TranslationServiceClient`, this is a silent runtime bug. The interface should be derived from the actual client type. |

All other exported functions in `src/lib/` and `src/features/` that were checked have explicit return types. React hook return types are correctly inferred.

---

### API routes missing Zod validation

Routes that call `request.json()` without parsing through a Zod schema:

| Route file | Method | What is unvalidated |
|---|---|---|
| `src/app/api/marketplace/boosts/[id]/route.ts` | PATCH | `body.action` is read as a raw string with no schema. Any string (including oversized input) passes through to the `cancelBoost` function. Add `z.object({ action: z.literal('cancel') }).safeParse(body)`. |
| `src/app/api/twitter/account/route.ts` | PATCH | `body.username` is validated via regex (`TWITTER_HANDLE_RE`) but not via Zod. The manual validation is correct but inconsistent with project patterns. |

Routes with unvalidated `searchParams` (no Zod, no clamping):

| Route file | Unvalidated param | Risk |
|---|---|---|
| `src/app/api/activity/route.ts:8–9` | `limit` (parseInt), `before` (free string) | Integer overflow / unexpected string passed to Supabase query |
| `src/app/api/reputation/route.ts:17` | `limit` (parseInt, clamped to 100) | Low risk; already clamped — but not type-validated |
| `src/app/api/admin/users/route.ts:43–46` | `sortBy`, `order` — `sortBy` is passed to a query without allowlist checking | `sortBy` is used in `.order(sortBy, …)` — if Supabase does not sanitize column names in typed mode, this is a potential injection surface. **Needs allowlist validation.** |
| `src/app/api/donations/receipt/route.ts:21` | `id` (donation ID) — used in a DB query without UUID format validation | Should use `uuidParamSchema` from `src/lib/schemas/common.ts` |

---

### Promise misuse

#### Fire-and-forget `.then(() => {})` without `.catch()` in request handlers

These are intentional best-effort side effects, but silent failures (DB write errors, network errors) are discarded with no logging:

| File | Lines | Description |
|---|---|---|
| `src/app/api/easter/egg-check/route.ts` | 154–158 | Config override auto-disable write — no error logging on failure |
| `src/app/api/easter/egg-check/route.ts` | 208–215 | Luck counter increment — no error logging |
| `src/app/api/easter/egg-check/route.ts` | 216–225 | Luck row insert — no error logging |
| `src/app/api/easter/xp-egg-claim/route.ts` | 105 | Activity log insert — `.then(() => {})` swallows errors |
| `src/app/api/easter/xp-egg-claim/route.ts` | 150 | Token cleanup — `.then(() => {})` swallows errors |
| `src/app/api/easter/egg-claim/route.ts` | 125 | Luck row upsert — `.then(() => {})` swallows errors |

**Pattern to prefer:**
```typescript
supabase.from('…').update(…).eq(…)
  .then(({ error }) => { if (error) logger.warn('side-effect failed', error); });
```

#### `.then()` with no callback (returns a dangling promise into `Promise.allSettled`)

| File | Lines | Issue |
|---|---|---|
| `src/app/api/ideas/[id]/vote/route.ts` | 137, 146 | `.then()` with no callback added to the `Promise.allSettled` array — this resolves to `undefined` immediately, not to the actual Supabase promise. The insert is not awaited and errors are silently swallowed. Remove `.then()` — `Promise.allSettled` accepts the raw promise. |

#### Floating promise in notification hook

| File | Line | Issue |
|---|---|---|
| `src/features/notifications/hooks.ts` | 36 | `supabase.auth.getUser().then(({ data }) => { … })` — no `.catch()`. Rejected auth calls in the notification subscription setup are silently discarded. |

---

### `Database` type usage — untyped queries

The dominant issue is the stale generated type (see Category A/B above). Specific structural gaps:

1. **`src/lib/translation/translate-content.ts:133`** — `serviceClient as unknown as TranslationServiceClient` — the hand-rolled interface `TranslationServiceClient` at line 96 masks that the real client is `SupabaseClient<Database>`. If the `from('content_translations')` call fails at runtime, the error propagates through an `any`-typed path with no shape guarantee.

2. **`src/features/voting/types.ts:142`** — `(proposal as any).status === 'voting'` — `ProposalStatus` is a discriminated union but the cast bypasses it. The check should use `proposal.status === 'voting'` directly if `status` is typed, or the outer type is incorrect.

3. **`src/features/marketplace/marketplace-service.ts:15`** — `supabase.rpc('marketplace_create_boost' as any, …)` — the function is not in the `Database['public']['Functions']` map. Return type is inferred as `any`, so the caller has no shape guarantee on the result.

---

### Module-level mutable `let` in Next.js route files

These are server-side in-memory caches using module scope in Next.js App Router route handlers. In serverless/edge deployments, module state is not guaranteed to persist between requests — these caches may be silently ineffective or inconsistently populated across instances. This is not a pure type-safety issue but is a correctness risk.

| File | Lines | Variable |
|---|---|---|
| `src/app/api/easter/egg-check/route.ts` | 8–14 | `cachedConfig`, `cachedClaimedEggs`, `cachedConfigAt`, `cachedClaimedAt` |
| `src/app/api/proposals/[id]/results/route.ts` | 9 | `cachedAbstainCountsTowardQuorum` |

The `src/lib/` caches (`rpc-live.ts`, `tenant/branding.ts`, `rate-limit.ts`) are shared infrastructure and have similar characteristics but are more defensively written.

---

### `process.env` access without startup validation

| File | Lines | Issue |
|---|---|---|
| `src/lib/supabase/server.ts` | 10–11, 36–37, 52–53 | `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.SUPABASE_SERVICE_ROLE_KEY!` — non-null asserted without validation. If the env var is undefined at runtime, `createServerClient` receives `undefined!` (coerced to `"undefined"` string) and every subsequent Supabase call silently fails with auth errors. The Solana `providers.ts` has correct Zod validation for its env vars — the same pattern should apply here. |

---

## Top 10 Highest-Impact Fixes

1. **Regenerate `src/types/database.ts`** (`npx supabase gen types typescript --local > src/types/database.ts`). This single action eliminates ~120 `(supabase as any)` casts across API routes, features, and service files, and unblocks proper typing for all affected query results. The generated file at 3793 lines is significantly out of date relative to the live schema.

2. **Add missing `activity_event_type` enum values to the database migration** (`post_created`, `post_commented`, `post_flagged`, `idea_created`, `idea_voted`, `donation_verified`, `wallet_linked`, `egg_found`, etc.). After regenerating types, 17 `as any` casts on `event_type` disappear automatically.

3. **Fix `src/app/api/admin/users/route.ts:43`** — `sortBy` query param is passed to `.order(sortBy, …)` without an allowlist. Add: `const SORTABLE_COLS = ['created_at', 'username', 'xp_total'] as const; if (!SORTABLE_COLS.includes(sortBy)) return 400`. This is the only identified injection-adjacent surface.

4. **Fix `src/app/api/ideas/[id]/vote/route.ts:137,146`** — Remove `.then()` from the `Promise.allSettled` array items. The Supabase insert promises are being resolved immediately to `undefined`, making the activity log and vote recording silently fire-and-forget rather than properly tracked. This is a logic bug hidden by a bad cast.

5. **Replace `catch (err: any)` with `catch (err: unknown)` + narrowing** across all 16 occurrences in components and pages. This is a strict-mode correctness gap — accessing `.message` on `any` cannot be type-checked and will fail at runtime for non-Error throws.

6. **Add Zod validation to `src/app/api/marketplace/boosts/[id]/route.ts` PATCH** — `body.action` should be validated as `z.literal('cancel')` before being passed to `cancelBoost`. Currently any string accepted.

7. **Add startup env validation for Supabase credentials** in `src/lib/supabase/server.ts` — replace `!` non-null assertions with explicit checks that throw a descriptive error on startup if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are absent. The Solana `providers.ts` demonstrates the correct pattern.

8. **Fix `src/features/badges/schemas.ts:21`** — `BADGE_KEYS as unknown as [string, ...string[]]`. Use `as const` on `BADGE_KEYS` definition to make it a readonly tuple, then pass it directly to `z.enum()` without a cast.

9. **Add `.catch()` (or error logging) to the six fire-and-forget DB writes in `src/app/api/easter/egg-check/route.ts`** (lines 154–225). Silent write failures leave the egg-hunt state inconsistent with no observability.

10. **Replace the `TranslationServiceClient` hand-rolled interface in `src/lib/translation/translate-content.ts:96`** with a properly narrowed type derived from `SupabaseClient<Database>`. The current `as unknown as TranslationServiceClient` cast means any Supabase API change to the `content_translations` table will not surface as a compile error.

---

*Audit produced by: typescript-reviewer agent. TypeScript version: see `node_modules/typescript/package.json`. `tsc --noEmit` exits 0 — all findings are latent type-safety gaps, not current compile errors.*
